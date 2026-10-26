export type Profile = {
  id: string;
  username: string;
  name: string;
  headline: string;
  bio: string;
  role: string;
  roles?: string[];
  avatarSource?: "x" | "upload" | "google";
  company?: { name: string; designation: string; website: string; linkedin: string; logo: string };
  organization: string;
  city: string;
  avatar: string;
  tags: string[];
  lookingFor: string[];
  project: string;
  links: { label: string; url: string }[];
  public: boolean;
  discoverable: boolean;
  sample?: boolean;
};
export type Meeting = { id: string; at: string; eventId: string; note: string };
export type Contact = {
  id: string;
  profileId?: string;
  name: string;
  headline: string;
  project: string;
  avatar: string;
  tags: string[];
  links: { label: string; url: string }[];
  meetings: Meeting[];
  starred: boolean;
  archived: boolean;
  createdAt: string;
  source: "manual" | "qr" | "import" | "profile";
  sample?: boolean;
};
export type Project = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  repository: string;
  demo: string;
  tags: string[];
  stage: string;
  needs: string[];
  ownerId: string;
  public: boolean;
  sample?: boolean;
};
export type Reminder = {
  id: string;
  contactId: string;
  title: string;
  due: string;
  completed: boolean;
  draft: string;
  sample?: boolean;
};
export type EventInfo = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  dates: string;
  start: string;
  end: string;
  venue: string;
  address: string;
  city: string;
  coordinates: [number, number];
  website: string;
  source: string;
  organizer: string;
  description: string;
  color: string;
  symbol: string;
};
export type Workspace = {
  profile: Profile | null;
  contacts: Contact[];
  projects: Project[];
  reminders: Reminder[];
  bookmarks: string[];
  eventBookmarks: string[];
  blocked: string[];
  activeEventId?: string;
};
export const emptyWorkspace: Workspace = {
  profile: null,
  contacts: [],
  projects: [],
  reminders: [],
  bookmarks: [],
  eventBookmarks: [],
  blocked: [],
  activeEventId: "",
};
