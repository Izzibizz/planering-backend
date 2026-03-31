import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Collection, MongoClient, ServerApiVersion } from "mongodb";
import { plannerDataSchema, type PlannerData } from "../schema/planner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.resolve(__dirname, "../../data/planner.json");

const defaultPlannerData: PlannerData = {
  pageContent: {
    badge: "Planering",
    title: "Utställning Västerås 25 april - 10 maj 2026",
    subtitle:
      "A light planning view for your exhibition calendar, personal tasks, and artwork checklist.",
  },
  checklists: {
    personal: {
      id: "personal",
      title: "My Checklist",
      description: "Add tasks, mark them as done, and remove them anytime.",
      items: [
        {
          id: "personal-1",
          text: "Plan tomorrow's tasks",
          done: true,
          createdAt: "2026-03-31T08:00:00.000Z",
        },
        {
          id: "personal-2",
          text: "Buy groceries",
          done: false,
          createdAt: "2026-03-31T08:05:00.000Z",
        },
        {
          id: "personal-3",
          text: "Reply to emails",
          done: false,
          createdAt: "2026-03-31T08:10:00.000Z",
        },
      ],
    },
    artworks: {
      id: "artworks",
      title: "Artworks to do",
      description: "Track artwork ideas, ongoing pieces, and finished work.",
      items: [
        {
          id: "artwork-1",
          text: "Finish portrait sketch",
          done: false,
          createdAt: "2026-03-31T09:00:00.000Z",
        },
        {
          id: "artwork-2",
          text: "Prime the new canvas",
          done: false,
          createdAt: "2026-03-31T09:05:00.000Z",
        },
        {
          id: "artwork-3",
          text: "Photograph completed artwork",
          done: true,
          createdAt: "2026-03-31T09:10:00.000Z",
        },
      ],
    },
  },
  calendarNotes: {},
  updatedAt: "2026-03-31T10:00:00.000Z",
};

const plannerDocumentId = "main";

type PlannerDocument = PlannerData & { _id: string };

let plannerCollectionPromise:
  | Promise<Collection<PlannerDocument> | null>
  | undefined;
let usingFileStorage = false;

const cloneDefaultData = (): PlannerData => structuredClone(defaultPlannerData);

function getMongoUri(): string | null {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri || mongoUri.includes("<") || mongoUri.includes(">")) {
    return null;
  }

  return mongoUri;
}

function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME ?? "planering";
}

async function loadSeedData(): Promise<PlannerData> {
  try {
    const rawFile = await readFile(dataFilePath, "utf-8");
    const parsed = JSON.parse(rawFile);
    return plannerDataSchema.parse(parsed);
  } catch {
    return cloneDefaultData();
  }
}

async function writeLocalPlannerData(data: PlannerData): Promise<void> {
  const parsedData = plannerDataSchema.parse(data);
  await mkdir(path.dirname(dataFilePath), { recursive: true });
  await writeFile(dataFilePath, JSON.stringify(parsedData, null, 2), "utf-8");
}

async function getPlannerCollection(): Promise<Collection<PlannerDocument> | null> {
  if (usingFileStorage) {
    return null;
  }

  const mongoUri = getMongoUri();

  if (!mongoUri) {
    usingFileStorage = true;
    console.warn(
      "MONGODB_URI is missing or still using the template placeholder. Falling back to local JSON storage.",
    );
    return null;
  }

  if (!plannerCollectionPromise) {
    const client = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 5000,
    });

    plannerCollectionPromise = client
      .connect()
      .then((connectedClient) => connectedClient.db(getMongoDbName()))
      .then((database) => database.collection<PlannerDocument>("planner"))
      .catch((error) => {
        usingFileStorage = true;
        console.warn(
          "MongoDB connection failed. Falling back to local JSON storage.",
          error,
        );
        return null;
      });
  }

  return plannerCollectionPromise;
}

export async function initializePlannerStore(): Promise<void> {
  await readPlannerData();
}

export async function readPlannerData(): Promise<PlannerData> {
  const collection = await getPlannerCollection();

  if (!collection) {
    return loadSeedData();
  }

  const existing = await collection.findOne({ _id: plannerDocumentId });

  if (existing) {
    return plannerDataSchema.parse(existing);
  }

  const seedData = await loadSeedData();

  await collection.updateOne(
    { _id: plannerDocumentId },
    {
      $set: seedData,
      $setOnInsert: { _id: plannerDocumentId },
    },
    { upsert: true },
  );

  return seedData;
}

export async function writePlannerData(data: PlannerData): Promise<void> {
  const parsedData = plannerDataSchema.parse(data);
  const collection = await getPlannerCollection();

  if (!collection) {
    await writeLocalPlannerData(parsedData);
    return;
  }

  await collection.updateOne(
    { _id: plannerDocumentId },
    {
      $set: parsedData,
      $setOnInsert: { _id: plannerDocumentId },
    },
    { upsert: true },
  );
}
