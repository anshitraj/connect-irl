"use client";
import { Copy, Download, Share2 } from "lucide-react";
import { profileQRImage } from "@/lib/profile-qr";
import { useEffect, useState, useSyncExternalStore } from "react";
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
  useEffect(() => {
    void profileQRImage(url, 250).catch(() => {});
  }, [url]);
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(
      new CustomEvent("connectirl:qr-sharing", { detail: true }),
    );
    return () => {
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
      </div>
    </Modal>
  );
}
function subscribeOrigin() {
  return () => {};
}
