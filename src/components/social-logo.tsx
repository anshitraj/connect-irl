import Image from "next/image";
import { Globe } from "lucide-react";
const marks: Record<string, string> = {
  GitHub: "github",
  LinkedIn: "linkedin",
  X: "x",
  Twitter: "x",
  Telegram: "telegram",
  Discord: "discord",
};
export function SocialLogo({
  platform,
  size = 18,
}: {
  platform: string;
  size?: number;
}) {
  const mark = marks[platform];
  return (
    <span
      className={`platform-logo platform-${mark || "website"}`}
      aria-hidden="true"
    >
      {mark ? (
        <Image
          src={`/brands/${mark}.svg`}
          width={mark === "discord" ? 82 : size}
          height={size}
          alt=""
          unoptimized
          draggable={false}
        />
      ) : (
        <Globe size={size} />
      )}
    </span>
  );
}
