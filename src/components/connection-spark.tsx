import { QrCode } from "lucide-react";
import { Avatar } from "./ui";
import { SocialLogo } from "./social-logo";
export function ConnectionSpark({
  name,
  avatar,
}: {
  name: string;
  avatar?: string;
}) {
  return (
    <div className="connection-spark" aria-hidden="true">
      <span className="spark-orbit" />
      <span className="spark-orbit orbit-outer" />
      <div className="spark-you">
        <Avatar name={name || "You"} src={avatar} size="lg" />
      </div>
      <span className="spark-node node-github">
        <SocialLogo platform="GitHub" size={20} />
      </span>
      <span className="spark-node node-linkedin">
        <SocialLogo platform="LinkedIn" size={20} />
      </span>
      <span className="spark-node node-x">
        <SocialLogo platform="X" size={18} />
      </span>
      <span className="spark-node node-qr">
        <QrCode size={21} />
      </span>
      <span className="spark-star">✳</span>
    </div>
  );
}
export function ConnectionCelebration() {
  return (
    <span className="connection-celebration" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <i key={index} style={{ "--piece": index } as React.CSSProperties} />
      ))}
    </span>
  );
}
