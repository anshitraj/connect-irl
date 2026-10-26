"use client";
import { useEffect, useRef, useState } from "react";
type Reply = {
  key: string;
  status: "idle" | "loading" | "found" | "unavailable";
  photo: string;
  message: string;
};
const empty: Reply = { key: "", status: "idle", photo: "", message: "" };
export function useProfilePhoto(
  provider: "x" | "company",
  value: string,
  enabled: boolean,
  initial?: { key: string; photo: string },
) {
  const [reply, setReply] = useState<Reply>(
    initial?.photo ? { ...empty, ...initial, status: "found" } : empty,
  );
  const [attempt, setAttempt] = useState(0);
  const cache = useRef(new Map<string, string>());
  useEffect(() => {
    if (!value || !enabled) return;
    if (attempt === 0 && reply.key === value && reply.photo) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (cache.current.has(value) && !attempt) {
        setReply({
          key: value,
          status: "found",
          photo: cache.current.get(value)!,
          message: "",
        });
        return;
      }
      setReply({ key: value, status: "loading", photo: "", message: "" });
      try {
        const response = await fetch("/api/profile-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(
            provider === "x"
              ? { provider, handle: value }
              : { provider, website: value },
          ),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error || "Photo lookup is unavailable. You can continue.",
          );
        const photo = provider === "x" ? result.avatar : result.logo;
        if (
          typeof photo !== "string" ||
          photo.length > 2048 ||
          !photo.startsWith("https://")
        )
          throw new Error("Photo lookup returned an unavailable image.");
        if (!controller.signal.aborted) {
          cache.current.set(value, photo);
          setReply({ key: value, status: "found", photo, message: "" });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setReply({
            key: value,
            status: "unavailable",
            photo: "",
            message:
              error instanceof Error
                ? error.message
                : "Photo unavailable. You can continue.",
          });
      }
    }, 700);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // Results do not restart the request; value changes cancel stale lookups.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, value, enabled, attempt]);
  const current =
    reply.key === value
      ? reply
      : {
          ...empty,
          status: value && enabled ? ("loading" as const) : ("idle" as const),
        };
  return { ...current, retry: () => setAttempt((count) => count + 1) };
}
