"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Fingerprint,
  FlipHorizontal2,
  ImageUp,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { Contact, Profile } from "@/lib/types";
import {
  contactForScannedLink,
  contactForScannedProfile,
  urlFromNFC,
  type NFCRecord,
} from "@/lib/scanning";
import { sampleProfiles } from "@/lib/samples";
import { parseProfileUrl } from "@/lib/utils";
import { profileSchema } from "@/lib/validation";
import { Button } from "./ui";
import { useWorkspace } from "./workspace-provider";
import { ConnectionSuccess } from "./connection-success";

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats: () => Promise<string[]>;
};
type NFCReader = {
  scan: (options: { signal: AbortSignal }) => Promise<void>;
  onreading: ((event: { message: { records: NFCRecord[] } }) => void) | null;
  onreadingerror: (() => void) | null;
};
type Saved = {
  id: string;
  name: string;
  headline: string;
  avatar: string;
  external: boolean;
  eventId: string;
  at: string;
};
export function Scanner() {
  const { data, demo, saveContact, toast, user } = useWorkspace();
  const [mode, setMode] = useState<"qr" | "nfc">("qr");
  const [status, setStatus] = useState<
    "starting" | "running" | "idle" | "reading"
  >("starting");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torch, setTorch] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const decoder = useRef<(() => void) | null>(null);
  const nfc = useRef<AbortController | null>(null);
  const lookup = useRef<AbortController | null>(null);
  const cameraVersion = useRef(0);
  const alive = useRef(false);
  const processing = useRef(false);
  const savedRef = useRef(false);
  const [retryValue, setRetryValue] = useState("");
  const latest = useRef({ data, demo, saveContact });
  useEffect(() => {
    latest.current = { data, demo, saveContact };
  }, [data, demo, saveContact]);
  const stopHardware = useCallback(() => {
    cameraVersion.current++;
    decoder.current?.();
    decoder.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    nfc.current?.abort();
    nfc.current = null;
  }, []);
  const handleValue = useCallback(
    async (value: string) => {
      if (processing.current || savedRef.current || !alive.current) return;
      processing.current = true;
      setRetryValue(value);
      stopHardware();
      setStatus("idle");
      setBusy(true);
      setError("");
      const controller = new AbortController();
      lookup.current?.abort();
      lookup.current = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const parsed = parseProfileUrl(value, location.origin);
        if (!parsed)
          throw new Error(
            "This code doesn’t contain a profile link. Try their Connect IRL QR or NFC tag.",
          );
        const workspace = latest.current;
        let input: Omit<Contact, "id" | "meetings" | "createdAt">;
        if ("external" in parsed)
          input = contactForScannedLink(parsed.external);
        else {
          const canonical = new URL(`/u/${parsed.username}`, location.origin)
            .href;
          const cached = workspace.data.contacts.find((contact) =>
            contact.links.some((link) => link.url === canonical),
          );
          let profile: Profile | null | undefined =
            workspace.data.profile?.username === parsed.username
              ? workspace.data.profile
              : workspace.demo
                ? sampleProfiles.find(
                    (person) => person.username === parsed.username,
                  )
                : null;
          if (cached) input = { ...cached, source: "qr" };
          else {
            if (!profile) {
              const response = await fetch(
                `/api/profiles/${encodeURIComponent(parsed.username)}`,
                { signal: controller.signal, cache: "no-store" },
              );
              const result = await response.json();
              if (!response.ok)
                throw new Error(
                  result.error ||
                    "This builder’s profile could not load. Try again.",
                );
              profile = profileSchema.parse(result.profile);
            }
            if (!profile) throw new Error("This profile is unavailable.");
            input = contactForScannedProfile(profile, location.origin);
          }
        }
        if (controller.signal.aborted || !alive.current) return;
        if (input.profileId && workspace.data.blocked.includes(input.profileId))
          throw new Error("This builder is blocked in your workspace.");
        const eventId = latest.current.data.activeEventId || "";
        const at = new Date().toISOString();
        const id = workspace.saveContact(input, "", eventId);
        savedRef.current = true;
        setSaved({
          id,
          name: input.name,
          headline: input.headline,
          avatar: input.avatar,
          external: "external" in parsed,
          eventId,
          at,
        });
        toast("");
        try {
          navigator.vibrate?.(55);
        } catch {
          /* Haptics are optional. */
        }
      } catch (err) {
        if (alive.current && lookup.current === controller)
          setError(
            controller.signal.aborted
              ? "Couldn’t load the profile in time. Check your connection and try again."
              : err instanceof Error
                ? err.message
                : "Could not save this connection. Try again.",
          );
      } finally {
        clearTimeout(timeout);
        if (lookup.current === controller) {
          lookup.current = null;
          processing.current = false;
          if (alive.current) setBusy(false);
        }
      }
    },
    [stopHardware, toast],
  );
  const startCamera = useCallback(
    async (direction: "environment" | "user" = "environment") => {
      stopHardware();
      lookup.current?.abort();
      lookup.current = null;
      processing.current = false;
      savedRef.current = false;
      setRetryValue("");
      setSaved(null);
      setError("");
      setMode("qr");
      setStatus("starting");
      setBusy(false);
      setTorch(false);
      setTorchAvailable(false);
      const version = cameraVersion.current;
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Camera access needs HTTPS or localhost. You can use a QR image instead.",
          );
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: direction },
            width: { ideal: 960 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!alive.current || version !== cameraVersion.current) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (!video.current)
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        if (!alive.current || version !== cameraVersion.current) return;
        if (!video.current)
          throw new Error("The camera preview could not open.");
        video.current.srcObject = media;
        await video.current.play();
        if (!alive.current || version !== cameraVersion.current) return;
        setStatus("running");
        const capabilities = media.getVideoTracks()[0]?.getCapabilities?.() as
          (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTorchAvailable(Boolean(capabilities?.torch));
        const Native = (
          window as unknown as { BarcodeDetector?: DetectorConstructor }
        ).BarcodeDetector;
        if (
          Native &&
          (await Native.getSupportedFormats()).includes("qr_code")
        ) {
          if (version !== cameraVersion.current) return;
          const detector = new Native({ formats: ["qr_code"] });
          let timer: ReturnType<typeof setTimeout>;
          const frame = async () => {
            if (version !== cameraVersion.current || !video.current) return;
            try {
              const codes = await detector.detect(video.current);
              if (codes[0]?.rawValue && version === cameraVersion.current) {
                void handleValue(codes[0].rawValue);
                return;
              }
            } catch {
              /* A blurred frame is not a failed scan. */
            }
            if (version === cameraVersion.current)
              timer = setTimeout(() => void frame(), 120);
          };
          decoder.current = () => clearTimeout(timer);
          void frame();
        } else {
          const { createQRReader } = await import("@/lib/qr-reader");
          if (version !== cameraVersion.current || !video.current) return;
          const reader = await createQRReader();
          if (version !== cameraVersion.current || !video.current) return;
          const controls = await reader.decodeFromStream(
            media,
            video.current,
            (result) => {
              if (result && version === cameraVersion.current)
                void handleValue(result.getText());
            },
          );
          if (version !== cameraVersion.current) controls.stop();
          else decoder.current = () => controls.stop();
        }
      } catch (err) {
        if (alive.current && version === cameraVersion.current) {
          stopHardware();
          setStatus("idle");
          setError(
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Camera permission is off. Allow it in your browser, or choose a QR image."
              : err instanceof DOMException && err.name === "NotFoundError"
                ? "No camera found on this device. Choose a QR image or use NFC on a supported phone."
                : err instanceof Error
                  ? err.message
                  : "Camera unavailable. Try a QR image.",
          );
        }
      }
    },
    [handleValue, stopHardware],
  );
  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    void Promise.resolve().then(() => {
      if (!cancelled && alive.current) void startCamera();
    });
    const visibility = () => {
      if (document.visibilityState === "hidden") {
        stopHardware();
        lookup.current?.abort();
        if (alive.current) setStatus("idle");
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      alive.current = false;
      stopHardware();
      lookup.current?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [startCamera, stopHardware]);
  const startNFC = async () => {
    stopHardware();
    lookup.current?.abort();
    lookup.current = null;
    processing.current = false;
    savedRef.current = false;
    setRetryValue("");
    setSaved(null);
    setBusy(false);
    setMode("nfc");
    setError("");
    setStatus("idle");
    const Native = (window as unknown as { NDEFReader?: new () => NFCReader })
      .NDEFReader;
    if (!Native) {
      setError(
        "NFC scanning isn’t available in this browser. Scan their QR instead.",
      );
      return;
    }
    const controller = new AbortController();
    nfc.current = controller;
    try {
      const reader = new Native();
      reader.onreading = (event) => {
        if (controller.signal.aborted) return;
        const url = urlFromNFC(event.message.records);
        if (url) void handleValue(url);
        else
          setError(
            "This tag doesn’t share a profile URL. Try their QR instead.",
          );
      };
      reader.onreadingerror = () => {
        if (!controller.signal.aborted)
          setError(
            "Couldn’t read that tag. Hold it near the top of your phone and try again.",
          );
      };
      await reader.scan({ signal: controller.signal });
      if (!controller.signal.aborted && alive.current) setStatus("reading");
    } catch (err) {
      if (!controller.signal.aborted && alive.current) {
        setStatus("idle");
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "NFC permission is off. Allow it in your browser or use QR."
            : "NFC could not start. Check that NFC is enabled, or use QR.",
        );
      }
    }
  };
  const scanImage = async (file?: File) => {
    if (!file) return;
    stopHardware();
    setStatus("idle");
    setError("");
    if (!file.type.startsWith("image/") || file.size > 10e6) {
      setError("Choose a QR image smaller than 10 MB.");
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    const version = cameraVersion.current;
    try {
      const { createQRReader } = await import("@/lib/qr-reader");
      const result = await (await createQRReader()).decodeFromImageUrl(url);
      if (alive.current && version === cameraVersion.current)
        await handleValue(result.getText());
    } catch {
      if (alive.current && version === cameraVersion.current)
        setError("No readable QR found. Try a sharper image.");
    } finally {
      URL.revokeObjectURL(url);
      if (alive.current) setBusy(false);
      if (upload.current) upload.current.value = "";
    }
  };
  return (
    <div className="quick-connect">
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">LESS TYPING. MORE CONNECTING.</span>
          <h1>Scan. Saved. Say hello.</h1>
          <p>
            Their shared profile, your event, and the time you meet. Saved
            automatically.
          </p>
        </div>
      </div>
      <div className="quick-scanner">
        {!saved && (
          <div className="scanner-tabs" aria-label="Connection method">
            <button
              className={mode === "qr" ? "active" : ""}
              aria-pressed={mode === "qr"}
              onClick={() => void startCamera(facing)}
            >
              <ScanLine size={18} />
              Scan QR
            </button>
            <button
              className={mode === "nfc" ? "active" : ""}
              aria-pressed={mode === "nfc"}
              onClick={() => void startNFC()}
            >
              <Fingerprint size={18} />
              Tap NFC
            </button>
          </div>
        )}
        {saved ? (
          <ConnectionSuccess
            saved={saved}
            onNext={() =>
              void (mode === "nfc" ? startNFC() : startCamera(facing))
            }
          />
        ) : (
          <>
            <div
              className={`camera-preview quick-camera ${status === "running" ? "is-running" : ""} ${mode === "nfc" ? "is-nfc" : ""}`}
            >
              {mode === "qr" ? (
                <>
                  <video
                    ref={video}
                    muted
                    playsInline
                    className={facing === "user" ? "mirrored" : ""}
                  />
                  <div className="camera-scan-frame">
                    <i />
                    <i />
                    <i />
                    <i />
                    {status !== "running" && (
                      <QrCode size={92} strokeWidth={1} />
                    )}
                  </div>
                </>
              ) : (
                <div className="nfc-read-art">
                  <Fingerprint size={94} strokeWidth={1} />
                  {status === "reading" && <span />}
                </div>
              )}
              <div className="quick-camera-caption" role="status">
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Saving connection…
                  </>
                ) : mode === "nfc" ? (
                  <>
                    {status === "reading"
                      ? "Hold their NFC tag near your phone."
                      : "Tap NFC to read a shared profile tag."}
                  </>
                ) : status === "running" ? (
                  "Point at their QR. We’ll save the rest."
                ) : status === "starting" ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Opening camera…
                  </>
                ) : (
                  "Ready when your camera is."
                )}
              </div>
            </div>
            {error && (
              <p className="form-error quick-scan-error" role="alert">
                {error}
              </p>
            )}
            <div className="camera-controls">
              {mode === "qr" && status === "running" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      stopHardware();
                      setStatus("idle");
                    }}
                  >
                    <CameraOff size={16} />
                    Pause
                  </Button>
                  <button
                    className="icon-button"
                    aria-label="Switch camera"
                    onClick={() => {
                      const next =
                        facing === "environment" ? "user" : "environment";
                      setFacing(next);
                      void startCamera(next);
                    }}
                  >
                    <FlipHorizontal2 size={20} />
                  </button>
                  {torchAvailable && (
                    <button
                      className="icon-button"
                      aria-label="Toggle torch"
                      aria-pressed={torch}
                      onClick={async () => {
                        try {
                          await stream.current
                            ?.getVideoTracks()[0]
                            ?.applyConstraints({
                              advanced: [
                                { torch: !torch } as MediaTrackConstraintSet,
                              ],
                            });
                          setTorch(!torch);
                        } catch {
                          toast("Torch unavailable on this camera.");
                        }
                      }}
                    >
                      <Zap size={19} />
                    </button>
                  )}
                </>
              ) : (
                <Button
                  disabled={status === "starting" || busy}
                  onClick={() =>
                    void (mode === "qr" ? startCamera(facing) : startNFC())
                  }
                >
                  {mode === "qr" ? (
                    <Camera size={16} />
                  ) : (
                    <Fingerprint size={16} />
                  )}
                  {mode === "qr" ? "Open camera" : "Read NFC tag"}
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => upload.current?.click()}
              >
                <ImageUp size={16} />
                QR image
              </Button>
              {error && retryValue && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleValue(retryValue)}
                >
                  <RefreshCw size={14} />
                  Retry profile
                </Button>
              )}
              <input
                ref={upload}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Upload QR image"
                onChange={(e) => void scanImage(e.target.files?.[0])}
              />
            </div>
          </>
        )}
        {!saved && (
          <p className="scanner-privacy">
            <ShieldCheck size={12} />
            Camera frames stay on your device. Only shared profile details are
            saved.
          </p>
        )}
        {!saved && user && data.profile?.public && !demo && (
          <p className="scanner-privacy">
            After sync, they can see that you connected. Your notes stay
            private.
          </p>
        )}
      </div>
    </div>
  );
}
