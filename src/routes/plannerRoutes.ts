import { randomUUID } from "node:crypto";
import { Router } from "express";
import { ZodError } from "zod";
import {
  calendarNoteUpsertSchema,
  checklistCreateItemSchema,
  checklistIdSchema,
  checklistIds,
  checklistUpdateItemSchema,
  pageContentUpdateSchema,
  type PlannerData,
} from "../schema/planner.js";
import { readPlannerData, writePlannerData } from "../lib/plannerStore.js";

const router = Router();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const sendValidationError = (
  res: Router extends never ? never : any,
  error: ZodError,
) => {
  return res.status(400).json({
    message: "Validation failed.",
    issues: error.flatten(),
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergePlannerUpdate = (
  currentData: PlannerData,
  payload: unknown,
): PlannerData => {
  if (!isRecord(payload)) {
    return currentData;
  }

  if (isRecord(payload.pageContent)) {
    const parsedPageContent = pageContentUpdateSchema.safeParse(payload.pageContent);

    if (parsedPageContent.success) {
      currentData.pageContent = {
        ...currentData.pageContent,
        ...parsedPageContent.data,
      };
    }
  }

  if (isRecord(payload.checklists)) {
    for (const listId of checklistIds) {
      const currentList = currentData.checklists[listId];
      const candidateList = payload.checklists[listId];

      if (!isRecord(candidateList)) {
        continue;
      }

      const nextItems = Array.isArray(candidateList.items)
        ? candidateList.items.flatMap((entry) => {
            if (!isRecord(entry)) {
              return [];
            }

            const text = typeof entry.text === "string" ? entry.text.trim() : "";
            if (!text) {
              return [];
            }

            return [
              {
                id:
                  typeof entry.id === "string" && entry.id.trim()
                    ? entry.id
                    : randomUUID(),
                text,
                done: Boolean(entry.done),
                createdAt:
                  typeof entry.createdAt === "string" && entry.createdAt
                    ? entry.createdAt
                    : new Date().toISOString(),
              },
            ];
          })
        : currentList.items;

      (currentData.checklists as Record<string, typeof currentList>)[listId] = {
        ...currentList,
        title:
          typeof candidateList.title === "string" && candidateList.title.trim()
            ? candidateList.title.trim()
            : currentList.title,
        description:
          typeof candidateList.description === "string"
            ? candidateList.description
            : currentList.description,
        items: nextItems,
      };
    }
  }

  if (isRecord(payload.calendarNotes)) {
    currentData.calendarNotes = Object.fromEntries(
      Object.entries(payload.calendarNotes)
        .filter(([date]) => datePattern.test(date))
        .flatMap(([date, noteValue]) => {
          if (typeof noteValue === "string") {
            const content = noteValue.trim();

            if (!content) {
              return [];
            }

            return [
              [
                date,
                {
                  date,
                  content: noteValue,
                  updatedAt: new Date().toISOString(),
                },
              ],
            ];
          }

          if (!isRecord(noteValue) || typeof noteValue.content !== "string") {
            return [];
          }

          const content = noteValue.content.trim();
          if (!content) {
            return [];
          }

          return [
            [
              date,
              {
                date,
                content: noteValue.content,
                updatedAt:
                  typeof noteValue.updatedAt === "string"
                    ? noteValue.updatedAt
                    : new Date().toISOString(),
              },
            ],
          ];
        }),
    );
  }

  currentData.updatedAt =
    typeof payload.updatedAt === "string" && payload.updatedAt
      ? payload.updatedAt
      : new Date().toISOString();

  return currentData;
};

router.get("/health", async (_request, response) => {
  await readPlannerData();
  response.json({ status: "ok" });
});

router.get("/planner", async (_request, response) => {
  const plannerData = await readPlannerData();
  response.json(plannerData);
});

const savePlannerHandler = async (
  request: Parameters<typeof router.patch>[1] extends (...args: infer T) => unknown
    ? T[0]
    : never,
  response: Parameters<typeof router.patch>[1] extends (...args: infer T) => unknown
    ? T[1]
    : never,
) => {
  try {
    const plannerData = await readPlannerData();
    const nextPlannerData = mergePlannerUpdate(plannerData, request.body);

    await writePlannerData(nextPlannerData);
    response.json(nextPlannerData);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(response, error);
    }

    throw error;
  }
};

router.put("/planner", savePlannerHandler);
router.patch("/planner", savePlannerHandler);

router.get("/content", async (_request, response) => {
  const plannerData = await readPlannerData();
  response.json(plannerData.pageContent);
});

router.put("/content", async (request, response) => {
  try {
    const updates = pageContentUpdateSchema.parse(request.body);
    const plannerData = await readPlannerData();

    plannerData.pageContent = {
      ...plannerData.pageContent,
      ...updates,
    };
    plannerData.updatedAt = new Date().toISOString();

    await writePlannerData(plannerData);
    response.json(plannerData.pageContent);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(response, error);
    }

    throw error;
  }
});

router.get("/checklists", async (_request, response) => {
  const plannerData = await readPlannerData();
  response.json(plannerData.checklists);
});

router.get("/checklists/:listId", async (request, response) => {
  try {
    const listId = checklistIdSchema.parse(request.params.listId);
    const plannerData = await readPlannerData();
    response.json(plannerData.checklists[listId]);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(response, error);
    }

    throw error;
  }
});

router.post("/checklists/:listId/items", async (request, response) => {
  try {
    const listId = checklistIdSchema.parse(request.params.listId);
    const payload = checklistCreateItemSchema.parse(request.body);
    const plannerData = await readPlannerData();

    const newItem = {
      id: randomUUID(),
      text: payload.text.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };

    plannerData.checklists[listId].items.unshift(newItem);
    plannerData.updatedAt = new Date().toISOString();

    await writePlannerData(plannerData);
    response.status(201).json(newItem);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(response, error);
    }

    throw error;
  }
});

router.delete(
  "/checklists/:listId/items/completed",
  async (request, response) => {
    try {
      const listId = checklistIdSchema.parse(request.params.listId);
      const plannerData = await readPlannerData();
      const originalCount = plannerData.checklists[listId].items.length;

      plannerData.checklists[listId].items = plannerData.checklists[
        listId
      ].items.filter((item) => !item.done);
      plannerData.updatedAt = new Date().toISOString();

      await writePlannerData(plannerData);
      response.json({
        removed: originalCount - plannerData.checklists[listId].items.length,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return sendValidationError(response, error);
      }

      throw error;
    }
  },
);

router.patch("/checklists/:listId/items/:itemId", async (request, response) => {
  try {
    const listId = checklistIdSchema.parse(request.params.listId);
    const payload = checklistUpdateItemSchema.parse(request.body);
    const plannerData = await readPlannerData();
    const item = plannerData.checklists[listId].items.find(
      (entry) => entry.id === request.params.itemId,
    );

    if (!item) {
      return response
        .status(404)
        .json({ message: "Checklist item not found." });
    }

    if (payload.text !== undefined) {
      item.text = payload.text.trim();
    }

    if (payload.done !== undefined) {
      item.done = payload.done;
    }

    plannerData.updatedAt = new Date().toISOString();
    await writePlannerData(plannerData);

    response.json(item);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(response, error);
    }

    throw error;
  }
});

router.delete(
  "/checklists/:listId/items/:itemId",
  async (request, response) => {
    try {
      const listId = checklistIdSchema.parse(request.params.listId);
      const plannerData = await readPlannerData();
      const currentItems = plannerData.checklists[listId].items;
      const nextItems = currentItems.filter(
        (item) => item.id !== request.params.itemId,
      );

      if (currentItems.length === nextItems.length) {
        return response
          .status(404)
          .json({ message: "Checklist item not found." });
      }

      plannerData.checklists[listId].items = nextItems;
      plannerData.updatedAt = new Date().toISOString();

      await writePlannerData(plannerData);
      response.status(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendValidationError(response, error);
      }

      throw error;
    }
  },
);

router.get("/calendar-notes", async (request, response) => {
  const plannerData = await readPlannerData();
  const month =
    typeof request.query.month === "string" ? request.query.month : undefined;

  const notes = Object.values(plannerData.calendarNotes).filter((note) => {
    if (!month) {
      return true;
    }

    return note.date.startsWith(month);
  });

  response.json(notes);
});

router.get("/calendar-notes/:date", async (request, response) => {
  if (!datePattern.test(request.params.date)) {
    return response.status(400).json({ message: "Date must be YYYY-MM-DD." });
  }

  const plannerData = await readPlannerData();
  response.json(plannerData.calendarNotes[request.params.date] ?? null);
});

router.put("/calendar-notes/:date", async (request, response) => {
  if (!datePattern.test(request.params.date)) {
    return response.status(400).json({ message: "Date must be YYYY-MM-DD." });
  }

  try {
    const payload = calendarNoteUpsertSchema.parse(request.body);
    const plannerData = await readPlannerData();
    const trimmedContent = payload.content.trim();

    if (!trimmedContent) {
      delete plannerData.calendarNotes[request.params.date];
      plannerData.updatedAt = new Date().toISOString();
      await writePlannerData(plannerData);
      return response.status(204).send();
    }

    const note = {
      date: request.params.date,
      content: payload.content,
      updatedAt: new Date().toISOString(),
    };

    plannerData.calendarNotes[request.params.date] = note;
    plannerData.updatedAt = new Date().toISOString();

    await writePlannerData(plannerData);
    response.json(note);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(response, error);
    }

    throw error;
  }
});

router.delete("/calendar-notes/:date", async (request, response) => {
  if (!datePattern.test(request.params.date)) {
    return response.status(400).json({ message: "Date must be YYYY-MM-DD." });
  }

  const plannerData = await readPlannerData();
  delete plannerData.calendarNotes[request.params.date];
  plannerData.updatedAt = new Date().toISOString();

  await writePlannerData(plannerData);
  response.status(204).send();
});

export default router;
