"use client";
import { Copy, Download, LoaderCircle, Nfc, Share2 } from "lucide-react";
import { profileQRImage } from "@/lib/profile-qr";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, Modal } from "./ui";
import { useWorkspace } from "./workspace-provider";
export function QR({
  value,
  dark = false,
  size = 200,
}: {
  value: string;
  dark?: boolean;
  size?: number;
}) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let alive = true;
    void profileQRImage(value, size, dark)
      .then((v) => {
        if (alive) setImage(v);
      })
      .catch(() => {
        if (alive) setImage("");
      });
    return () => {
      alive = false;
    };
  }, [value, dark, size]);
  return image ? (
    <img
      className="qr-image"
      width={size}
      height={size}
      src={image}
      alt="Scannable profile QR code"
    />
  ) : (
    <span className="qr-placeholder" style={{ width: size, height: size }} />
  );
}
export function ShareQR({
  open,
  onOpenChange,
  username,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  name: string;
}) {
  const { toast, user } = useWorkspace();
  const origin = useSyncExternalStore(
    subscribeOrigin,
    () => location.origin,
    () => process.env.NEXT_PUBLIC_SITE_URL || "https://connectirl.xyz",
  );
  const url = `${origin}/u/${username}`;
  // Browsers cannot make a phone act as an NFC tag, but Chrome on Android can
  // write the profile link to a tag or card that anyone can then tap.
  const nfcSupported = useSyncExternalStore(
    subscribeOrigin,
    () => "NDEFReader" in window,
    () => false,
  );
  const [nfc, setNfc] = useState<"idle" | "waiting">("idle");
  const nfcAbort = useRef<AbortController | null>(null);
  const writeTag = async () => {
    const Native = (
      window as unknown as {
        NDEFReader?: new () => {
          write: (
            message: { records: { recordType: string; data: string }[] },
            options: { signal: AbortSignal; overwrite: boolean },
          ) => Promise<void>;
        };
      }
    ).NDEFReader;
    if (!Native) return;
    nfcAbort.current?.abort();
    const controller = new AbortController();
    nfcAbort.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30000);
    setNfc("waiting");
    try {
      await new Native().write(
        { records: [{ recordType: "url", data: url }] },
        { signal: controller.signal, overwrite: true },
      );
      toast("Saved to the tag. Anyone can now tap it to open your profile.");
    } catch (err) {
      if (timedOut) toast("No tag found. Hold it to the back of your phone.");
      else if (!controller.signal.aborted)
        toast(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "NFC permission is off. Allow it in your browser."
            : "Couldn’t write to that tag. Try another one.",
        );
    } finally {
      clearTimeout(timer);
      if (nfcAbort.current === controller) nfcAbort.current = null;
      setNfc("idle");
    }
  };
  useEffect(() => {
    void profileQRImage(url, 250).catch(() => {});
  }, [url]);
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(
      new CustomEvent("connectirl:qr-sharing", { detail: true }),
    );
    return () => {
      nfcAbort.current?.abort();
      window.dispatchEvent(
        new CustomEvent("connectirl:qr-sharing", { detail: false }),
      );
    };
  }, [open]);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="A good connection starts here."
      description="Let someone scan your code, or share your profile link."
    >
      <div className="share-qr">
        <div className="share-qr-frame">
          <QR value={url} size={250} />
        </div>
        <h3>{name}</h3>
        <p className="muted">
          {origin.replace(/^https?:\/\//, "")}/u/{username}
        </p>
        {!user && (
          <p className="notice">
            This is a device preview. Sign in and publish your profile to make
            this link available on other devices.
          </p>
        )}
        <div className="button-row">
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast("Profile link copied.");
              } catch {
                toast("Copy is unavailable. Select the profile URL above.");
              }
            }}
          >
            <Copy size={16} />
            Copy link
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const image = await profileQRImage(url, 500);
              const a = document.createElement("a");
              a.download = `connectirl-${username}.png`;
              a.href = image;
              a.click();
            }}
          >
            <Download size={16} />
            QR
          </Button>
          <Button
            onClick={async () => {
              try {
                if (navigator.share)
                  await navigator.share({
                    title: `${name} on Connect IRL`,
                    url,
                  });
                else {
                  await navigator.clipboard.writeText(url);
                  toast("Profile link copied.");
                }
              } catch {
                /* Share dismissed. */
              }
            }}
          >
            <Share2 size={16} />
            Share
          </Button>
        </div>
        {nfcSupported && (
          <div className="share-nfc">
            <span className="share-nfc-icon">
              <Nfc size={20} />
            </span>
            <div>
              <strong>Tap to share</strong>
              <span>
                Write your profile link to an NFC tag or card. Anyone who taps
                it opens your profile.
              </span>
            </div>
            <Button
              variant="secondary"
              disabled={nfc === "waiting"}
              onClick={() => void writeTag()}
            >
              {nfc === "waiting" ? (
                <>
                  <LoaderCircle className="spin" size={15} />
                  Hold a tag to your phone…
                </>
              ) : (
                "Write to NFC tag"
              )}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
function subscribeOrigin() {
  return () => {};
}
