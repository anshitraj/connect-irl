"use client";
import { events } from "@/lib/events";
import dynamic from "next/dynamic";
import { ButtonLink, EmptyState } from "./ui";
import { useWorkspace } from "./workspace-provider";
const loading = () => (
  <div className="page-skeleton">
    <div />
    <div />
    <div />
    <span>Opening your next possibility…</span>
  </div>
);
const Scanner = dynamic(() => import("./scanner").then((m) => m.Scanner), {
  loading,
});
const People = dynamic(() => import("./people").then((m) => m.People), {
  loading,
});
const ContactDetail = dynamic(
  () => import("./people").then((m) => m.ContactDetail),
  { loading },
);
const Discovery = dynamic(
  () => import("./discovery").then((m) => m.Discovery),
  { loading },
);
const ProjectForm = dynamic(
  () => import("./discovery").then((m) => m.ProjectForm),
  { loading },
);
const ProjectDetail = dynamic(
  () => import("./discovery").then((m) => m.ProjectDetail),
  { loading },
);
const EventsDirectory = dynamic(
  () => import("./events-directory").then((m) => m.EventsDirectory),
  { loading },
);
const EventDetail = dynamic(
  () => import("./events-directory").then((m) => m.EventDetail),
  { loading },
);
const ProfileEditor = dynamic(
  () => import("./profile").then((m) => m.ProfileEditor),
  { loading },
);
const Settings = dynamic(() => import("./settings").then((m) => m.Settings), {
  loading,
});
const FollowUps = dynamic(
  () => import("./follow-ups").then((m) => m.FollowUps),
  { loading },
);
const NearbyNow = dynamic(
  () => import("./nearby").then((m) => m.NearbyNow),
  { loading },
);
const CollaborationInbox = dynamic(
  () => import("./collaboration").then((m) => m.CollaborationInbox),
  { loading },
);
export function WorkspacePage({ path }: { path: string[] }) {
  const { user, demo } = useWorkspace();
  // Discard loaded private screens when the account or workspace changes.
  return <WorkspaceScreen key={`${user?.id || "guest"}:${demo}`} path={path} />;
}
function WorkspaceScreen({ path }: { path: string[] }) {
  const [root, detail] = path;
  switch (root) {
    case "scan":
      return <Scanner />;
    case "people":
      return detail ? <ContactDetail id={detail} /> : <People />;
    case "discover":
      return <Discovery />;
    case "projects":
      return detail === "new" ? (
        <ProjectForm />
      ) : detail ? (
        <ProjectDetail slug={detail} />
      ) : (
        <Discovery projectsOnly />
      );
    case "events": {
      const event = events.find((e) => e.slug === detail);
      return detail ? (
        event ? (
          <EventDetail event={event} />
        ) : (
          <EmptyState
            title="Event unavailable."
            description="Find verified events in the directory."
          >
            <ButtonLink href="/app/events">All events</ButtonLink>
          </EmptyState>
        )
      ) : (
        <EventsDirectory />
      );
    }
    case "nearby":
      return <NearbyNow />;
    case "map":
      return <EventsDirectory mapFirst />;
    case "follow-ups":
      return <FollowUps />;
    case "collaboration":
      return <CollaborationInbox />;
    case "profile":
      return <ProfileEditor />;
    case "settings":
      return <Settings />;
    default:
      return (
        <EmptyState
          title="A little off the beaten path."
          description="Let’s get you back to your people."
        >
          <ButtonLink href="/app">Open my workspace</ButtonLink>
        </EmptyState>
      );
  }
}
