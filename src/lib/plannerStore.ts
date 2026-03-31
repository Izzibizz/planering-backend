import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const cloneDefaultData = () => structuredClone(defaultPlannerData);

export async function readPlannerData(): Promise<PlannerData> {
  try {
    const rawFile = await readFile(dataFilePath, "utf-8");
    const parsed = JSON.parse(rawFile);
    return plannerDataSchema.parse(parsed);
  } catch {
    const fallback = cloneDefaultData();
    await writePlannerData(fallback);
    return fallback;
  }
}

export async function writePlannerData(data: PlannerData): Promise<void> {
  await mkdir(path.dirname(dataFilePath), { recursive: true });
  await writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
}
