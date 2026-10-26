"use client";
import { browserSupabase } from "@/lib/supabase/client";
import { Download, Mic, Square, Trash2 } from "lucide-react";
import { downloadFile } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import { useWorkspace } from "./workspace-provider";
type Recording = {
  id: string;
  contactId: string;
  blob: Blob;
  createdAt: string;
  owner: string;
};
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("buildermatch-audio", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("recordings", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function audioRecords(
  action: "get" | "put" | "delete",
  record?: Recording,
  id?: string,
): Promise<Recording[]> {
  const store = await db();
  return new Promise((resolve, reject) => {
    const tx = store.transaction(
      "recordings",
      action === "get" ? "readonly" : "readwrite",
    );
    const s = tx.objectStore("recordings");
    const request =
      action === "get"
        ? s.getAll()
        : action === "put"
          ? s.put(record!)
          : s.delete(id!);
    request.onsuccess = () =>
      resolve(action === "get" ? (request.result as Recording[]) : []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => store.close();
  });
}
export function VoiceNote({ contactId }: { contactId: string }) {
  const { user, demo, toast } = useWorkspace();
  const [recording, setRecording] = useState(false);
  const [items, setItems] = useState<
    { id: string; url: string; remote?: boolean; path?: string }[]
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const itemsRef = useRef(items);
  const owner = demo ? "demo" : user?.id || "guest";
  useEffect(() => {
    mounted.current = true;
    let urls: string[] = [];
    void (async () => {
      try {
        const records = (await audioRecords("get")).filter(
          (r) => r.contactId === contactId && r.owner === owner,
        );
        const local = records.map((r) => ({
          id: r.id,
          url: URL.createObjectURL(r.blob),
        }));
        urls = local.map((r) => r.url);
        const sb = browserSupabase();
        let remote: {
          id: string;
          url: string;
          remote: boolean;
          path: string;
        }[] = [];
        if (sb && user && !demo) {
          const { data } = await sb
            .from("contact_notes")
            .select("id,audio_path")
            .eq("owner_id", user.id)
            .eq("contact_id", contactId)
            .not("audio_path", "is", null);
          remote = (
            await Promise.all(
              (data || []).map(async (n) => {
                const { data: signed } = await sb.storage
                  .from("voice-notes")
                  .createSignedUrl(n.audio_path, 3600);
                return signed
                  ? {
                      id: n.id,
                      url: signed.signedUrl,
                      remote: true as const,
                      path: n.audio_path,
                    }
                  : null;
              }),
            )
          ).filter((v): v is NonNullable<typeof v> => v !== null);
        }
        if (mounted.current) setItems([...local, ...remote]);
      } catch {
        if (mounted.current)
          setError(
            "Voice note storage is unavailable in this browser. Text notes still work.",
          );
      }
    })();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
      urls.forEach(URL.revokeObjectURL);
      itemsRef.current.forEach((i) => {
        if (!i.remote) URL.revokeObjectURL(i.url);
      });
    };
  }, [contactId, owner, demo, user]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const start = async () => {
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Voice recording is unavailable here. Add a text note instead.",
        );
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setLoading(true);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const id = crypto.randomUUID();
        try {
          if (blob.size > 8e6)
            throw new Error("Recording too large. Try a shorter voice note.");
          const sb = browserSupabase();
          if (user && !demo && sb && navigator.onLine) {
            const path = `${user.id}/${contactId}/${id}.${rec.mimeType.includes("mp4") ? "m4a" : "webm"}`;
            const { error: uploadError } = await sb.storage
              .from("voice-notes")
              .upload(path, blob, { contentType: blob.type });
            if (uploadError)
              throw new Error(
                "Could not upload the recording. Please try again.",
              );
            const { error: rowError } = await sb.from("contact_notes").insert({
              id,
              contact_id: contactId,
              owner_id: user.id,
              audio_path: path,
            });
            if (rowError) {
              await sb.storage.from("voice-notes").remove([path]);
              throw new Error(
                "Could not save the voice note. Sync the connection first.",
              );
            }
            const { data } = await sb.storage
              .from("voice-notes")
              .createSignedUrl(path, 3600);
            if (data && mounted.current)
              setItems((v) => [
                ...v,
                { id, url: data.signedUrl, remote: true, path },
              ]);
            toast("Private voice note saved.");
          } else {
            await audioRecords("put", {
              id,
              contactId,
              blob,
              createdAt: new Date().toISOString(),
              owner,
            });
            if (mounted.current)
              setItems((v) => [...v, { id, url: URL.createObjectURL(blob) }]);
            toast("Voice note saved on this device.");
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Recording could not be saved.",
          );
        } finally {
          setLoading(false);
        }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 60_000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microphone permission is needed.",
      );
    }
  };
  return (
    <div className="voice-note-section">
      <Button
        variant="ghost"
        disabled={loading}
        onClick={() => {
          if (recording) {
            if (timer.current) clearTimeout(timer.current);
            recorder.current?.stop();
          } else void start();
        }}
      >
        {recording ? (
          <Square size={14} fill="currentColor" />
        ) : (
          <Mic size={14} />
        )}{" "}
        {recording
          ? "Stop & save voice note"
          : loading
            ? "Saving recording…"
            : "Or, record a voice note"}
      </Button>
      <span>
        {recording
          ? "Recording · up to 60 seconds"
          : "Audio only · no automatic transcription"}
      </span>
      {items.map((item) => (
        <div className="audio-note" key={item.id}>
          <audio controls src={item.url} preload="metadata" />
          <span>{item.remote ? "Private cloud audio" : "On this device"}</span>
          <button
            className="icon-button"
            aria-label="Download voice note"
            onClick={async () => {
              try {
                const response = await fetch(item.url);
                if (!response.ok) throw new Error();
                downloadFile(
                  `voice-note-${item.id}.${(await response.clone().blob()).type.includes("mp4") ? "m4a" : "webm"}`,
                  await response.blob(),
                );
              } catch {
                setError(
                  "Voice note download unavailable. Reload the view and try again.",
                );
              }
            }}
          >
            <Download size={14} />
          </button>
          <button
            className="icon-button"
            aria-label="Delete voice note"
            onClick={async () => {
              try {
                if (item.remote) {
                  const sb = browserSupabase();
                  if (!sb) return;
                  const { error } = await sb
                    .from("contact_notes")
                    .delete()
                    .eq("id", item.id);
                  if (error) throw error;
                  if (item.path)
                    await sb.storage.from("voice-notes").remove([item.path]);
                } else {
                  await audioRecords("delete", undefined, item.id);
                  URL.revokeObjectURL(item.url);
                }
                setItems((v) => v.filter((i) => i.id !== item.id));
              } catch {
                setError("Voice note could not be deleted. Try again.");
              }
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
export async function hasVoiceNotes(contactId: string, owner: string) {
  return (await audioRecords("get")).some(
    (r) => r.contactId === contactId && r.owner === owner,
  );
}
