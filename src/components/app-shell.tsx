"use client";
import {
  Bell,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudOff,
  Compass,
  Home,
  LogIn,
  MailPlus,
  Map,
  Menu,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShareQR } from "./qr";
import { ConnectionActivity } from "./connection-activity";
import { Avatar, Brand, Button, ButtonLink } from "./ui";
import { useWorkspace } from "./workspace-provider";
import { EventPicker } from "./event-picker";
const navigation = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/scan", label: "Scan & connect", icon: ScanLine },
  { href: "/app/people", label: "My people", icon: Users },
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/projects", label: "Projects", icon: Box },
  { href: "/app/collaboration", label: "Collaboration", icon: MailPlus },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/map", label: "Event map", icon: Map },
  { href: "/app/follow-ups", label: "Follow-ups", icon: Bell },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const {
    data,
    ready,
    demo,
    setDemo,
    user,
    online,
    syncStatus,
    sync,
    syncError,
  } = useWorkspace();
  const [showQR, setShowQR] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;
    let active = true;
    const cacheLoadedAssets = () => {
      if (!active) return;
      const urls = performance
        .getEntriesByType("resource")
        .map((resource) => resource.name)
        .filter((url) => url.startsWith(location.origin + "/_next/static/"));
      navigator.serviceWorker.controller?.postMessage({
        type: "CACHE_STATIC",
        urls,
      });
    };
    void navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => cacheLoadedAssets())
      .catch(() => {});
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      cacheLoadedAssets,
    );
    const observer = new PerformanceObserver(cacheLoadedAssets);
    observer.observe({ type: "resource", buffered: true });
    return () => {
      active = false;
      observer.disconnect();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        cacheLoadedAssets,
      );
    };
  }, []);
  const active = (href: string) =>
    href === "/app" ? path === href : path.startsWith(href);
  const pending = data.reminders.filter((r) => !r.completed).length;
  return (
    <div className="app-layout">
      <aside className={`app-sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-sidebar-close"
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-selector">
          <span className="workspace-symbol">
            <Users size={17} />
          </span>
          <span>
            {demo
              ? "Sample workspace"
              : user
                ? "Your workspace"
                : "Personal workspace"}
            <small>
              {demo
                ? "Illustrative data"
                : user
                  ? "Connected to the cloud"
                  : "Saved on this device"}
            </small>
          </span>
          <ChevronDown size={14} />
        </div>
        <span className="nav-group-label">YOUR CONNECTIONS, CONNECTED</span>
        <nav aria-label="App navigation">
          {navigation
            .filter(
              (n) =>
                ![
                  "Discover",
                  "Projects",
                  "Collaboration",
                  "Event map",
                ].includes(n.label),
            )
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                prefetch={n.href === "/app/scan"}
                className={`sidebar-link ${active(n.href) ? "active" : ""}`}
                onClick={() => setMobileMenu(false)}
              >
                <n.icon size={17} strokeWidth={1.7} />
                {n.label}
                {n.href === "/app/follow-ups" && pending > 0 && (
                  <span className="nav-count">{pending}</span>
                )}
                {n.href === "/app/scan" && (
                  <span className="nav-shortcut">S</span>
                )}
              </Link>
            ))}
          <details
            className="extra-navigation"
            open={navigation.some(
              (n) =>
                ["Discover", "Projects", "Collaboration", "Event map"].includes(
                  n.label,
                ) && active(n.href),
            )}
          >
            <summary>Explore more</summary>
            {navigation
              .filter((n) =>
                ["Discover", "Projects", "Collaboration", "Event map"].includes(
                  n.label,
                ),
              )
              .map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`sidebar-link ${active(n.href) ? "active" : ""}`}
                  onClick={() => setMobileMenu(false)}
                >
                  <n.icon size={17} />
                  {n.label}
                </Link>
              ))}
          </details>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="sidebar-tip-icon">
              <QrCode size={20} />
            </span>
            <strong>A good hello starts here.</strong>
            <p>
              Make yourself easy to find.
              <br />
              Keep yourself hard to forget.
            </p>
            {data.profile ? (
              <Button variant="secondary" onClick={() => setShowQR(true)}>
                Show my QR
                <ArrowIcon />
              </Button>
            ) : (
              <ButtonLink href="/app/profile" variant="secondary">
                Create your profile
                <ArrowIcon />
              </ButtonLink>
            )}
          </div>
          <Link
            href="/app/settings"
            className={`sidebar-link ${active("/app/settings") ? "active" : ""}`}
          >
            <Settings size={17} />
            Settings
          </Link>
          <Link href="/app/profile" className="sidebar-user">
            <Avatar
              name={data.profile?.name || "You"}
              src={data.profile?.avatar}
              size="sm"
            />
            <span>
              <strong>
                {data.profile?.name ||
                  (user ? "Set up your profile" : "Hello, builder")}
              </strong>
              <small>
                {user ? "Your personal account" : "Guest · no account needed"}
              </small>
            </span>
            <ChevronRight size={15} />
          </Link>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="app-main">
        <header className="app-header">
          <div className="app-breadcrumb">
            <button
              className="icon-button mobile-sidebar-toggle"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>
              {navigation.find((n) => active(n.href) && n.href !== "/app")
                ?.label ||
                (path.includes("profile")
                  ? "My profile"
                  : path.includes("settings")
                    ? "Settings"
                    : "Home")}
            </strong>
          </div>
          <div className="app-header-right">
            {data.profile ? (
              <Button
                className="header-my-qr"
                variant="secondary"
                onClick={() => setShowQR(true)}
              >
                <QrCode size={17} />
                My QR
              </Button>
            ) : (
              <ButtonLink
                href="/app/profile"
                variant="secondary"
                className="header-my-qr"
              >
                <QrCode size={17} />
                My QR
              </ButtonLink>
            )}
            <ConnectionActivity />
            <span className={`sync-label ${!online ? "offline" : ""}`}>
              {!online ? (
                <WifiOff size={13} />
              ) : syncStatus === "synced" ? (
                <Check size={13} />
              ) : user && !demo ? (
                <Cloud size={13} />
              ) : (
                <ShieldCheck size={13} />
              )}{" "}
              {!online
                ? "Offline"
                : demo
                  ? "Sample workspace"
                  : syncStatus === "synced"
                    ? "All changes synced"
                    : user
                      ? "Cloud connected"
                      : "Private on this device"}
            </span>
            <Link
              className="icon-button"
              aria-label="Follow-ups"
              href="/app/follow-ups"
            >
              <Bell size={18} />
              {pending > 0 && <span className="notification-dot" />}
            </Link>
            {user ? (
              <Link href="/app/profile">
                <Avatar
                  name={data.profile?.name || "You"}
                  src={data.profile?.avatar}
                  size="sm"
                />
              </Link>
            ) : (
              <ButtonLink href="/login" variant="secondary" className="small">
                <LogIn size={13} />
                Sign in
              </ButtonLink>
            )}
          </div>
        </header>
        {!online && (
          <div className="offline-workspace-notice" role="status">
            Offline · saved locally
          </div>
        )}
        <div className="workspace-event-bar">
          <EventPicker />
          <span>
            New connections remember this event and the time you meet.
          </span>
        </div>
        {demo && (
          <div className="workspace-banner">
            <span>
              <Compass size={14} /> You’re exploring sample people and projects.
              Nothing here is live attendee activity.
            </span>
            <button onClick={() => setDemo(false)}>
              Use my workspace
              <X size={13} />
            </button>
          </div>
        )}
        {syncStatus === "error" && (
          <div className="workspace-banner error-banner">
            <span>
              <CloudOff size={14} />
              {syncError}
            </span>
            <button onClick={() => void sync()}>Retry sync</button>
          </div>
        )}
        <main id="main" className="workspace-content">
          {ready ? (
            <div className="workspace-scene" key={path}>
              {children}
            </div>
          ) : (
            <div className="page-skeleton">
              <div />
              <div />
              <div />
              <span>Opening your workspace…</span>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <LockIcon /> Good connections. Thoughtfully kept.
          </span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/">
              Connect IRL
              <ArrowIcon />
            </Link>
          </div>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile app navigation">
        {[
          { href: "/app", label: "Home", icon: Home },
          { href: "/app/people", label: "People", icon: Users },
          { href: "/app/scan", label: "Scan", icon: ScanLine },
          { href: "/app/discover", label: "Discover", icon: Compass },
          { href: "/app/profile", label: "Profile", icon: UserRound },
        ].map((n) => (
          <Link
            href={n.href}
            className={`${active(n.href) ? "active" : ""} ${n.label === "Scan" ? "primary-scan" : ""}`}
            key={n.href}
          >
            <span>
              <n.icon size={21} />
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
      {data.profile && (
        <ShareQR
          open={showQR}
          onOpenChange={setShowQR}
          name={data.profile.name}
          username={data.profile.username}
        />
      )}
    </div>
  );
}
function ArrowIcon() {
  return <ChevronRight size={14} />;
}
function LockIcon() {
  return <ShieldCheck size={12} />;
}
