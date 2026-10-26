"use client";
import { CalendarDays } from "lucide-react";
import { events } from "@/lib/events";
import { useWorkspace } from "./workspace-provider";
import { EventLogo } from "./event-brand";
export function EventPicker() {
  const { data, update } = useWorkspace();
  return (
    <label className="current-event-picker">
      {events.find((event) => event.id === data.activeEventId) ? (
        <EventLogo
          event={events.find((event) => event.id === data.activeEventId)!}
          decorative
          className="picker-event-logo"
        />
      ) : (
        <CalendarDays size={15} />
      )}
      <span className="sr-only">Current event</span>
      <select
        aria-label="Current event"
        value={data.activeEventId || ""}
        onChange={(e) =>
          update((w) => ({ ...w, activeEventId: e.target.value }))
        }
      >
        <option value="">Choose your event</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
    </label>
  );
}
