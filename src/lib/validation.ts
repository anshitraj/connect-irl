import { z } from "zod";
const safeLink = z
  .string()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return (
        ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Use a valid https:// or http:// link");
const links = z
  .array(z.object({ label: z.string().max(40), url: safeLink }))
  .max(12);
const tags = z.array(z.string().max(60)).max(20);
export const profileSchema = z.object({
  id: z.string().max(100),
  username: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9_-]+$/),
  name: z.string().trim().min(1).max(100),
  headline: z.string().max(180),
  bio: z.string().max(2000),
  role: z.string().max(60),
  roles: z.array(z.string().trim().min(1).max(40)).min(1).max(8).optional(),
  avatarSource: z.enum(["x", "upload", "google"]).optional(),
  company: z.object({
    name: z.string().trim().max(100), designation: z.string().trim().max(100),
    website: safeLink.or(z.literal("")), linkedin: safeLink.or(z.literal("")),
    logo: z.string().max(2048).refine((v) => !v || v.startsWith("https://") || v.startsWith("/avatars/")),
  }).optional(),
  organization: z.string().max(100),
  city: z.string().max(100),
  avatar: z
    .string()
    .max(2048)
    .refine((v) => !v || v.startsWith("/avatars/") || /^https:\/\//.test(v)),
  tags,
  lookingFor: tags,
  project: z.string().max(100),
  links,
  public: z.boolean(),
  discoverable: z.boolean(),
});
export const contactSchema = z.object({
  id: z.uuid(),
  profileId: z.string().max(100).optional(),
  name: z.string().trim().min(1).max(100),
  headline: z.string().max(180),
  project: z.string().max(100),
  avatar: z.string().max(2048),
  tags,
  links,
  meetings: z
    .array(
      z.object({
        id: z.uuid(),
        at: z.iso.datetime(),
        eventId: z.string().max(100),
        note: z.string().max(5000),
      }),
    )
    .max(500),
  starred: z.boolean(),
  archived: z.boolean(),
  createdAt: z.iso.datetime(),
  source: z.enum(["manual", "qr", "import", "profile"]),
});
export const projectSchema = z.object({
  id: z.uuid(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(100),
  tagline: z.string().max(180),
  description: z.string().max(5000),
  website: z.union([z.literal(""), safeLink]),
  repository: z.union([z.literal(""), safeLink]),
  demo: z.union([z.literal(""), safeLink]),
  tags,
  stage: z.enum(["Idea", "Building", "Testnet", "Live", "Growing"]),
  needs: tags,
  ownerId: z.string().max(100),
  public: z.boolean(),
});
export const reminderSchema = z.object({
  id: z.uuid(),
  contactId: z.uuid(),
  title: z.string().min(1).max(200),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
  draft: z.string().max(5000),
});
export const syncSchema = z.object({
  profile: profileSchema.nullable(),
  contacts: z.array(contactSchema).max(5000),
  projects: z.array(projectSchema).max(100),
  reminders: z.array(reminderSchema).max(5000),
  bookmarks: z.array(z.string().max(100)).max(5000),
  eventBookmarks: z.array(z.string().max(100)).max(100),
  activeEventId: z.string().max(100).default(""),
  blocked: z.array(z.uuid()).max(1000),
  preferencesChanged: z.boolean().default(true),
  deleted: z
    .array(
      z.object({
        table: z.enum(["saved_contacts", "projects", "follow_up_reminders"]),
        id: z.uuid(),
      }),
    )
    .max(1000)
    .default([]),
});
