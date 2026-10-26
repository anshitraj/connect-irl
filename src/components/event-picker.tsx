"use client";
import { CalendarDays } from "lucide-react";
import { attendingEventIds, events } from "@/lib/events";
import { useWorkspace } from "./workspace-provider";
import { EventLogo } from "./event-brand";
export function EventPicker() {
  const { data, update } = useWorkspace();
  const attending = attendingEventIds(data);
  const others = events.filter((event) => !attending.includes(event.id));
  const option = (event: (typeof events)[number]) => (
    <option key={event.id} value={event.id}>
      {event.name}
    </option>
  );
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
          update((w) => ({
            ...w,
            activeEventId: e.target.value,
            // Switching to an event you hadn't listed adds it to the ones you attend.
            eventIds: e.target.value
              ? attendingEventIds(w).includes(e.target.value)
                ? attendingEventIds(w)
                : [...attendingEventIds(w), e.target.value]
              : attendingEventIds(w),
          }))
        }
      >
        <option value="">Choose your event</option>
        {attending.length > 1 ? (
          <>
            <optgroup label="Your events">
              {events.filter((event) => attending.includes(event.id)).map(option)}
            </optgroup>
            {others.length > 0 && (
              <optgroup label="Other events">{others.map(option)}</optgroup>
            )}
          </>
        ) : (
          events.map(option)
        )}
      </select>
    </label>
  );
}
