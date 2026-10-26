import { WorkspaceProvider } from "@/components/workspace-provider";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./collaboration.css";
import "./polish.css";
import "./connect.css";
import "./social-motion.css";
import "./connectirl.css";
import "./onboarding.css";
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://connectirl.xyz",
  ),
  title: {
    default: "Connect IRL — Every hello is a beginning.",
    template: "%s · Connect IRL",
  },
  description:
    "Meet, remember, and reconnect with the people building what’s next. Your conference connections, with all the context.",
  applicationName: "Connect IRL",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Connect IRL",
  },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  openGraph: {
    title: "Connect IRL — Every hello is a beginning.",
    description: "One scan. One save. One meaningful connection.",
    type: "website",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#053d2b",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.variable} data-scroll-behavior="smooth">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
