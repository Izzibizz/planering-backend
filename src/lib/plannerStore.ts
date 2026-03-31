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
      "En enkel planeringsvy för utställningskalendern, personliga uppgifter och konstlistan.",
  },
  checklists: {
    personal: {
      id: "personal",
      title: "Min checklista",
      description:
        "Lägg till uppgifter, markera dem som klara och ta bort dem när du vill.",
      items: [
        {
          id: "personal-1",
          text: "Planera morgondagens uppgifter",
          done: true,
          createdAt: "2026-03-31T08:00:00.000Z",
        },
        {
          id: "personal-2",
          text: "Handla mat",
          done: false,
          createdAt: "2026-03-31T08:05:00.000Z",
        },
        {
          id: "personal-3",
          text: "Svara på mejl",
          done: false,
          createdAt: "2026-03-31T08:10:00.000Z",
        },
      ],
    },
    artworks: {
      id: "artworks",
      title: "Konst att göra",
      description: "Följ idéer, pågående verk och färdiga arbeten.",
      items: [
        {
          id: "artwork-1",
          text: "Gör klart porträttskissen",
          done: false,
          createdAt: "2026-03-31T09:00:00.000Z",
        },
        {
          id: "artwork-2",
          text: "Grunda den nya duken",
          done: false,
          createdAt: "2026-03-31T09:05:00.000Z",
        },
        {
          id: "artwork-3",
          text: "Fotografera det färdiga verket",
          done: true,
          createdAt: "2026-03-31T09:10:00.000Z",
        },
      ],
    },
  },
  calendarNotes: {},
  gallery: {
    featuredImageId: null,
    images: [],
  },
  updatedAt: "2026-03-31T10:00:00.000Z",
};

const plannerDocumentId = "main";

type PlannerDocument = PlannerData & { _id: string };

let plannerCollectionPromise:
  | Promise<Collection<PlannerDocument> | null>
  | undefined;
let usingFileStorage = false;

const cloneDefaultData = (): PlannerData => structuredClone(defaultPlannerData);

function canUseFileStorageFallback(): boolean {
  const isRenderEnvironment =
    process.env.RENDER === "true" ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.RENDER_EXTERNAL_URL);

  return (
    process.env.ALLOW_FILE_STORAGE_FALLBACK === "true" ||
    (!isRenderEnvironment && process.env.NODE_ENV !== "production")
  );
}

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
    if (!canUseFileStorageFallback()) {
      throw new Error(
        "MONGODB_URI is missing in production. Refusing to fall back to local JSON storage on Render's ephemeral disk.",
      );
    }

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
        if (!canUseFileStorageFallback()) {
          throw error;
        }

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

export function getPlannerStorageMode(): "file" | "mongo" {
  return usingFileStorage ? "file" : "mongo";
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
