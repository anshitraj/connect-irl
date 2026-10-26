import { describe, expect, it } from "vitest";
import { attendingEventIds, currentEventFor, events } from "@/lib/events";

describe("attended events", () => {
  it("lists ETHGlobal Mumbai with a unique id and slug", () => {
    const ethglobal = events.find((event) => event.id === "ethglobal-2026");
    expect(ethglobal?.name).toBe("ETHGlobal Mumbai");
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(new Set(events.map((event) => event.slug)).size).toBe(events.length);
  });
  it("reads several attended events and falls back to the legacy current event", () => {
    expect(
      attendingEventIds({ eventIds: ["ibw-2026", "ethglobal-2026", "gone"] }),
    ).toEqual(["ibw-2026", "ethglobal-2026"]);
    expect(attendingEventIds({ activeEventId: "devcon-8" })).toEqual([
      "devcon-8",
    ]);
    expect(attendingEventIds({})).toEqual([]);
  });
  it("keeps the current event when attended, else picks the earliest", () => {
    const ids = ["devcon-8", "ethglobal-2026", "ibw-2026"];
    expect(currentEventFor(ids, "ethglobal-2026")).toBe("ethglobal-2026");
    expect(currentEventFor(ids, "solana-2026")).toBe("ibw-2026");
    expect(currentEventFor([], "ibw-2026")).toBe("");
  });
});
