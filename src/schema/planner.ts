import { z } from "zod";

export const checklistIds = ["personal", "artworks"] as const;
export const checklistIdSchema = z.enum(checklistIds);

export const pageContentSchema = z.object({
  badge: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).default(""),
});

export const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(200),
  done: z.boolean(),
  createdAt: z.string().datetime(),
});

export const checklistSchema = z.object({
  id: checklistIdSchema,
  title: z.string().min(1).max(100),
  description: z.string().max(300).default(""),
  items: z.array(checklistItemSchema),
});

export const calendarNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().max(20000),
  updatedAt: z.string().datetime(),
});

export const galleryImageSchema = z.object({
  id: z.string().min(1),
  publicId: z.string().min(1),
  url: z.string().url(),
  thumbnailUrl: z.string().url(),
  alt: z.string().max(200).default(""),
  caption: z.string().max(300).default(""),
  uploadedAt: z.string().datetime(),
});

export const gallerySchema = z.object({
  featuredImageId: z.string().nullable().default(null),
  images: z.array(galleryImageSchema).default([]),
});

export const plannerDataSchema = z.object({
  pageContent: pageContentSchema,
  checklists: z.object({
    personal: checklistSchema.extend({ id: z.literal("personal") }),
    artworks: checklistSchema.extend({ id: z.literal("artworks") }),
  }),
  calendarNotes: z.record(z.string(), calendarNoteSchema),
  gallery: gallerySchema.default({ featuredImageId: null, images: [] }),
  updatedAt: z.string().datetime(),
});

export const pageContentUpdateSchema = pageContentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one page content field is required.",
  });

export const checklistCreateItemSchema = z.object({
  text: z.string().min(1).max(200),
});

export const checklistUpdateItemSchema = z
  .object({
    text: z.string().min(1).max(200).optional(),
    done: z.boolean().optional(),
  })
  .refine((value) => value.text !== undefined || value.done !== undefined, {
    message: "Provide text and/or done to update an item.",
  });

export const calendarNoteUpsertSchema = z.object({
  content: z.string().max(20000),
});

export const galleryFeaturedUpdateSchema = z.object({
  imageId: z.string().nullable(),
});

export const galleryImageUpdateSchema = z
  .object({
    alt: z.string().max(200).optional(),
    caption: z.string().max(300).optional(),
  })
  .refine((value) => value.alt !== undefined || value.caption !== undefined, {
    message: "Provide alt and/or caption to update an image.",
  });

export const galleryReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});

export type ChecklistId = z.infer<typeof checklistIdSchema>;
export type PageContent = z.infer<typeof pageContentSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type Checklist = z.infer<typeof checklistSchema>;
export type CalendarNote = z.infer<typeof calendarNoteSchema>;
export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type Gallery = z.infer<typeof gallerySchema>;
export type PlannerData = z.infer<typeof plannerDataSchema>;
