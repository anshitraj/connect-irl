"use client";
import { events } from "@/lib/events";
import { sampleProfiles } from "@/lib/samples";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  FileText,
  Fingerprint,
  GitBranch,
  Layers,
  List,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Github } from "./icons";
import { QR } from "./qr";
import { Avatar, Brand, ButtonLink, Tag } from "./ui";
import { EventArtwork, EventLogo } from "./event-brand";

const subscribeOrigin = () => () => {};
export function Landing() {
  const origin = useSyncExternalStore(
    subscribeOrigin,
    () => location.origin,
    () => process.env.NEXT_PUBLIC_SITE_URL || "https://connectirl.xyz",
  );
  const exampleUrl = `${origin}/u/demo-arjun`;
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState("QR");
  const [saved, setSaved] = useState(true);
  const [filter, setFilter] = useState("All builders");
  const [view, setView] = useState("Map");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("People");
  const reduced = useReducedMotion();
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const entrance = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.65,
      delay: reduced ? 0 : delay,
      ease: "easeOut" as const,
    },
  });
  const people = sampleProfiles.filter(
    (p) =>
      (filter === "All builders" ||
        p.tags.includes(filter) ||
        p.role === filter ||
        p.lookingFor.some((l) => l.includes(filter))) &&
      `${p.name} ${p.project} ${p.tags.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <header className={`landing-header ${scrolled ? "scrolled" : ""}`}>
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#product">
              Product
              <ChevronDown size={12} />
            </a>
            <a href="#how-it-works">How it works</a>
            <a href="#discover">
              Discover
              <ChevronDown size={12} />
            </a>
            <a href="#events">Events</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="header-actions">
            <Link href="/app" className="open-app">
              Open app
              <ArrowUpRight size={14} />
            </Link>
            <ButtonLink href="/signup" className="small">
              Get started
              <ArrowRight size={15} />
            </ButtonLink>
            <button
              className="mobile-menu icon-button"
              aria-label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav">
            {[
              ["Product", "#product"],
              ["How it works", "#how-it-works"],
              ["Discover", "#discover"],
              ["Events", "#events"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
                <ArrowUpRight size={16} />
              </a>
            ))}
          </nav>
        )}
      </header>
      <main id="main">
        <section className="hero" id="product">
          <div className="hero-orb" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <motion.div {...entrance(0.05)} className="eyebrow">
                <span className="status-dot" />
                MADE FOR BUILDERS. BUILT FOR REAL CONNECTIONS.
              </motion.div>
              <motion.h1 {...entrance(0.12)}>
                Never lose a great conference <span>connection</span> again
                <span className="headline-dot">.</span>
              </motion.h1>
              <motion.p {...entrance(0.22)} className="hero-description">
                A great conversation deserves more than a forgotten username.
                Scan, save, and pick up where you left off.
              </motion.p>
              <motion.div {...entrance(0.3)} className="hero-buttons">
                <ButtonLink href="/app">
                  Start connecting
                  <ArrowUpRight size={19} />
                </ButtonLink>
                <a
                  className="watch-button"
                  href="#how-it-works"
                  onClick={() => setStep(0)}
                >
                  <span>
                    <Play size={13} fill="currentColor" />
                  </span>
                  See how it works
                </a>
              </motion.div>
              <motion.div {...entrance(0.38)} className="hero-proof">
                <span className="avatar-stack">
                  {sampleProfiles.slice(0, 3).map((p) => (
                    <Avatar key={p.id} name={p.name} src={p.avatar} size="xs" />
                  ))}
                </span>
                <span>
                  Less small talk. <strong>More possibilities.</strong>
                  <small>No wallet. No contact chaos.</small>
                </span>
              </motion.div>
            </div>
            <div
              className="hero-showcase"
              aria-label="Illustrative Connect IRL product walkthrough"
            >
              <span className="showcase-caption">
                A new hello. A lasting connection.
                <svg viewBox="0 0 80 60">
                  <path d="M75 5Q15 0 25 46m-9-8 10 10 10-12" />
                </svg>
              </span>
              <motion.div {...entrance(0.45)} className="floating-profile">
                <div className="profile-card-top">
                  <Brand compact />
                  <span className="mini-dots">•••</span>
                </div>
                <Avatar
                  name="Arjun Mehta"
                  src="/avatars/arjun.jpg"
                  size="xl"
                  online
                />
                <Tag>BUILDER</Tag>
                <h3>
                  Arjun Mehta
                  <CircleCheck size={13} fill="#2b8fe5" color="white" />
                </h3>
                <p>Co-founder at ZKRail</p>
                <p className="floating-bio">
                  Building privacy infrastructure
                  <br />
                  for a more open internet.
                </p>
                <div className="tag-row">
                  <Tag>Infra</Tag>
                  <Tag>ZK</Tag>
                  <Tag>Ethereum</Tag>
                </div>
                <div className="sample-socials">
                  <span className="social-linkedin">in</span>
                  <span>𝕏</span>
                  <span className="social-telegram">
                    <Send size={14} />
                  </span>
                  <span>
                    <Github size={15} />
                  </span>
                </div>
                <button
                  className={`mini-save ${saved ? "is-saved" : ""}`}
                  onClick={() => setSaved(!saved)}
                >
                  {saved ? <Check size={13} /> : <Plus size={13} />}{" "}
                  {saved ? "Connection saved" : "Save connection"}
                </button>
                <span className="sample-footnote">Illustrative profile</span>
              </motion.div>
              <motion.div {...entrance(0.35)} className="hero-phone">
                <div className="phone-camera" />
                <div className="phone-status">
                  <span>9:41</span>
                  <span className="phone-signal">▮▮▮ ▰</span>
                </div>
                <div className="phone-screen">
                  <div className="phone-heading">
                    <span>Make a connection</span>
                    <span className="tiny-icon">
                      <ScanLine size={15} />
                    </span>
                  </div>
                  <div
                    className="scan-mode"
                    role="group"
                    aria-label="Showcase scan mode"
                  >
                    {["QR", "NFC"].map((m) => (
                      <button
                        className={m === mode ? "active" : ""}
                        onClick={() => setMode(m)}
                        key={m}
                      >
                        {m === "QR" ? (
                          <QrCode size={13} />
                        ) : (
                          <Fingerprint size={13} />
                        )}{" "}
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="scan-area">
                    <i />
                    <i />
                    <i />
                    <i />
                    {mode === "QR" ? (
                      <QR value={exampleUrl} dark size={154} />
                    ) : (
                      <Fingerprint
                        className="nfc-hero-icon"
                        size={105}
                        strokeWidth={1}
                      />
                    )}
                    <div className="scan-beam" />
                  </div>
                  <h3>
                    {mode === "QR" ? "A little scan." : "A simple tap."}
                    <br />
                    <span>A big possibility.</span>
                  </h3>
                  <p>
                    {mode === "QR"
                      ? "Point your camera at their QR code"
                      : "Compatible NDEF tags, made simple"}
                  </p>
                  <div className="phone-bottom">
                    <LockKeyhole size={11} /> Your connections. Your control.
                  </div>
                </div>
                <div className="phone-home" />
              </motion.div>
              <motion.div {...entrance(0.8)} className="floating-saved">
                <div className="saved-notification">
                  <span>
                    <Check size={13} />
                  </span>{" "}
                  A good hello, remembered.
                </div>
                <div className="saved-person">
                  <Avatar name="Arjun" src="/avatars/arjun.jpg" size="md" />
                  <div>
                    <h4>Arjun Mehta</h4>
                    <p>Co-founder at ZKRail</p>
                  </div>
                  <Bookmark size={16} fill="#08b96c" color="#08b96c" />
                </div>
                <div className="saved-note">
                  <span>
                    <LockKeyhole size={10} /> JUST FOR YOU
                  </span>
                  <p>
                    Building wallet infrastructure.
                    <br />
                    Talked ZK and agent payments.
                  </p>
                </div>
                <div className="saved-meta">
                  <CalendarDays size={13} />
                  <span>
                    Devcon · Mumbai<small>Example meeting</small>
                  </span>
                </div>
                <div className="tag-row">
                  <Tag>Wallets</Tag>
                  <Tag color="purple">ZK</Tag>
                </div>
                <div className="saved-reminder">
                  <span className="reminder-icon">
                    <Bell size={15} />
                  </span>
                  <span>
                    Keep the conversation going
                    <small>Follow up in 3 days</small>
                  </span>
                </div>
              </motion.div>
              <span className="connection-path path-one" />
              <span className="connection-path path-two" />
              <span className="showcase-label">
                ONE SCAN. ONE MEANINGFUL CONNECTION.
              </span>
            </div>
          </div>
          <div className="container capability-strip">
            {[
              [QrCode, "QR + NFC"],
              [Users, "Smart contact book"],
              [Box, "Project discovery"],
              [MapPin, "Event maps"],
              [Bell, "Thoughtful follow-ups"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof QrCode;
              return (
                <a key={String(label)} href="#features">
                  <I size={15} />
                  <span>{String(label)}</span>
                </a>
              );
            })}
            <span className="privacy-capability">
              <ShieldCheck size={14} /> Private by default
            </span>
          </div>
        </section>
        <section className="ecosystem-strip">
          <div className="container ecosystem-inner">
            <span className="ecosystem-intro">
              DIFFERENT ECOSYSTEMS.
              <br />
              <strong>SAME BUILDER ENERGY.</strong>
            </span>
            <div className="ecosystem-logo ethereum">
              <span>♦</span>ethereum
            </div>
            <div className="ecosystem-logo solana">
              <span>≋</span>SOLANA
            </div>
            <div className="ecosystem-logo base">
              <span>━</span>base
            </div>
            <div className="ecosystem-logo polygon">
              <GitBranch size={29} />
              polygon
            </div>
            <div className="ecosystem-logo arbitrum">
              <span>⬡</span>arbitrum
            </div>
            <div className="ecosystem-logo optimism">
              <b>OP</b>Optimism
            </div>
          </div>
        </section>
        <section className="how-section section" id="how-it-works">
          <div className="container how-grid">
            <div className="how-copy">
              <span className="eyebrow">
                THE BEST CONNECTIONS START WITH HELLO
              </span>
              <h2>
                Three little steps.
                <br />
                <span>So much possibility.</span>
              </h2>
              <p>
                Be in the conversation.
                <br />
                We’ll help you remember the rest.
              </p>
              <Link className="text-link" href="/app?demo=1">
                Take a look around
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div
              className="steps"
              role="tablist"
              aria-label="How Connect IRL works"
            >
              {[
                {
                  title: "Meet someone interesting.",
                  text: "Scan their QR, tap their NFC tag, or open a shared link.",
                  icon: ScanLine,
                },
                {
                  title: "Save the person. And the context.",
                  text: "The project, the place, that idea you both got excited about.",
                  icon: FileText,
                },
                {
                  title: "Pick up where you left off.",
                  text: "Find your people and make the next conversation count.",
                  icon: Users,
                },
              ].map((s, i) => (
                <button
                  role="tab"
                  aria-selected={step === i}
                  aria-controls={`step-panel-${i}`}
                  id={`step-tab-${i}`}
                  tabIndex={step === i ? 0 : -1}
                  onKeyDown={(event) => {
                    let next = step;
                    if (["ArrowRight", "ArrowDown"].includes(event.key))
                      next = (step + 1) % 3;
                    else if (["ArrowLeft", "ArrowUp"].includes(event.key))
                      next = (step + 2) % 3;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = 2;
                    else return;
                    event.preventDefault();
                    setStep(next);
                    document.getElementById(`step-tab-${next}`)?.focus();
                  }}
                  onClick={() => setStep(i)}
                  className={`step ${step === i ? "active" : ""}`}
                  key={s.title}
                >
                  <span className="step-number">
                    {step > i ? <Check size={13} /> : `0${i + 1}`}
                  </span>
                  <span className="step-icon">
                    <s.icon size={21} />
                  </span>
                  <span>
                    <strong>{s.title}</strong>
                    <span>{s.text}</span>
                  </span>
                </button>
              ))}
            </div>
            <div
              className="step-preview"
              role="tabpanel"
              id={`step-panel-${step}`}
              aria-labelledby={`step-tab-${step}`}
            >
              <div className="step-preview-orbit" />
              <div className="step-demo-card" key={step}>
                {step === 0 ? (
                  <>
                    <span className="step-demo-eyebrow">NICE TO MEET YOU</span>
                    <QR value={exampleUrl} size={114} />
                    <div className="step-person">
                      <Avatar name="Arjun" src="/avatars/arjun.jpg" size="sm" />
                      <div>
                        <strong>Arjun Mehta</strong>
                        <span>Let’s build something.</span>
                      </div>
                      <ArrowUpRight size={19} />
                    </div>
                  </>
                ) : step === 1 ? (
                  <>
                    <span className="step-demo-eyebrow">
                      <LockKeyhole size={11} /> A LITTLE CONTEXT GOES A LONG WAY
                    </span>
                    <div className="step-person">
                      <Avatar name="Arjun" src="/avatars/arjun.jpg" />
                      <div>
                        <strong>Arjun Mehta</strong>
                        <span>Co-founder at ZKRail</span>
                      </div>
                    </div>
                    <div className="step-note">
                      Met at Devcon. Talked about privacy and agent payments.
                    </div>
                    <div className="tag-row">
                      <Tag>Potential collaborator</Tag>
                    </div>
                    <span className="demo-saved">
                      <CircleCheck size={15} /> Saved, with the good stuff.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="step-demo-eyebrow">
                      KEEP A GOOD THING GOING
                    </span>
                    <Bell size={27} color="#08b96c" />
                    <h4>Say hello, again.</h4>
                    <div className="step-note">
                      Hey Arjun! Still thinking about our conversation on agent
                      payments…
                    </div>
                    <span className="demo-saved">
                      <Check size={15} /> The next chapter starts here.
                    </span>
                  </>
                )}
              </div>
              <span className="step-preview-note">
                {
                  [
                    "A quick scan. A real connection.",
                    "Names fade. Good notes don’t.",
                    "Make the follow-through effortless.",
                  ][step]
                }
              </span>
            </div>
          </div>
        </section>
        <section className="features-section section" id="features">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  A LITTLE LESS FRICTION. A LOT MORE CONNECTION.
                </span>
                <h2>Your conference superpowers.</h2>
              </div>
              <p>
                Built for the hallway hellos.
                <br />
                And everything that comes after.
              </p>
            </div>
            <div className="feature-grid">
              <Link href="/app/scan" className="feature-card feature-scan">
                <span className="feature-icon">
                  <QrCode size={22} />
                </span>
                <h3>Goodbye, “what’s your handle?”</h3>
                <p>Scan a QR or tap a tag. You’re connected.</p>
                <div className="mini-scan-art">
                  <div className="mini-dark-phone">
                    <QR value={exampleUrl} dark size={97} />
                  </div>
                  <span className="nfc-token">
                    <Brand compact linked={false} />
                  </span>
                  <div className="tap-rings">
                    <Fingerprint size={27} />
                  </div>
                </div>
                <span className="feature-link">
                  Scan & tap
                  <ArrowUpRight size={14} />
                </span>
              </Link>
              <Link
                href="/app/people"
                className="feature-card feature-contacts"
              >
                <span className="feature-icon">
                  <Users size={21} />
                </span>
                <h3>People, with the whole story.</h3>
                <p>A contact book that remembers what matters.</p>
                <div className="mini-contact">
                  <Avatar name="Sarah Chen" src="/avatars/sarah.jpg" />
                  <div>
                    <strong>Sarah Chen</strong>
                    <span>Building Drift</span>
                  </div>
                  <Star size={13} fill="#edb45e" color="#edb45e" />
                  <div className="tag-row">
                    <Tag>DeFi</Tag>
                    <Tag color="purple">Ethereum</Tag>
                  </div>
                  <div className="mini-note">
                    <MessageCircle size={11} /> Talked about making DeFi feel
                    simple.
                  </div>
                </div>
                <span className="feature-link">
                  Smart contact book
                  <ArrowUpRight size={14} />
                </span>
              </Link>
              <Link
                href="/app/projects?demo=1"
                className="feature-card feature-projects"
              >
                <span className="feature-icon">
                  <Box size={21} />
                </span>
                <h3>Find your next “let’s build.”</h3>
                <p>Discover projects. Meet the minds behind them.</p>
                <div className="mini-project">
                  <span className="project-symbol">
                    d<span>↗</span>
                  </span>
                  <div>
                    <strong>Drift</strong>
                    <span>DeFi, without the deep end.</span>
                  </div>
                  <div className="tag-row">
                    <Tag color="gray">DeFi</Tag>
                    <Tag color="gray">Analytics</Tag>
                    <span className="building-indicator">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
                <span className="feature-link">
                  Project discovery
                  <ArrowUpRight size={14} />
                </span>
              </Link>
              <Link href="/app/map" className="feature-card feature-map">
                <span className="feature-icon">
                  <MapPin size={21} />
                </span>
                <h3>Your people. Your places.</h3>
                <p>Keep the place with the conversation.</p>
                <div className="mini-map-art">
                  <div className="map-road road-one" />
                  <div className="map-road road-two" />
                  <div className="map-park" />
                  <span className="mini-map-label">
                    <MapPin size={11} /> A great place to meet.
                  </span>
                  <Avatar name="Priya" src="/avatars/priya.jpg" size="sm" />
                  <MapPin
                    className="mini-map-pin"
                    fill="#08b96c"
                    color="white"
                    size={32}
                  />
                </div>
                <span className="feature-link">
                  Event maps
                  <ArrowUpRight size={14} />
                </span>
              </Link>
              <Link
                href="/app/follow-ups"
                className="feature-card feature-follow"
              >
                <span className="feature-icon">
                  <Bell size={21} />
                </span>
                <h3>“We should catch up.” Actually.</h3>
                <p>A little nudge to keep a good thing going.</p>
                <div className="mini-reminder">
                  <span>
                    <Bell size={15} />
                  </span>
                  <div>
                    <strong>Follow up with Arjun</strong>
                    <small>Send that demo you talked about.</small>
                    <Tag>In 3 days</Tag>
                  </div>
                  <Check size={15} />
                </div>
                <span className="feature-link">
                  Thoughtful follow-ups
                  <ArrowUpRight size={14} />
                </span>
              </Link>
              <Link href="/app/people" className="feature-card feature-memory">
                <span className="feature-icon">
                  <Layers size={21} />
                </span>
                <h3>Different events. Same story.</h3>
                <p>One home for a growing network.</p>
                <div className="mini-event-timeline">
                  {events.map((e) => (
                    <div key={e.id}>
                      <EventLogo event={e} decorative />
                      <span>
                        <strong>{e.shortName}</strong>
                        <small>{e.dates.replace(", 2026", "")} · Mumbai</small>
                      </span>
                      <Check size={12} />
                    </div>
                  ))}
                </div>
                <span className="feature-link">
                  Cross-event memory
                  <ArrowUpRight size={14} />
                </span>
              </Link>
            </div>
          </div>
        </section>
        <section className="memory-section">
          <div className="container memory-grid">
            <div>
              <span className="eyebrow">
                SAVE THE SPARK, NOT JUST THE SOCIAL
              </span>
              <h2>
                “That person
                <br />I met at…”
                <br />
                <span>Found them.</span>
              </h2>
              <p>
                The project. The conversation. The reason you clicked.
                <br />
                All the little details that make a connection human.
              </p>
            </div>
            <div className="memory-art">
              <div className="forgotten-card">
                <span>BEFORE CONNECT IRL</span>
                <p>@arjun_dev … or was it @arjun_zk?</p>
                <p>Something about wallets?</p>
                <p>We should probably catch up sometime.</p>
              </div>
              <ArrowDown className="memory-arrow" size={25} />
              <div className="remembered-card">
                <div className="saved-person">
                  <Avatar name="Arjun Mehta" src="/avatars/arjun.jpg" />
                  <div>
                    <h4>Arjun Mehta</h4>
                    <p>The wallet infrastructure builder.</p>
                  </div>
                  <span className="saved-check">
                    <Check size={16} />
                  </span>
                </div>
                <div className="memory-context">
                  <CalendarDays size={14} />
                  <span>Devcon · Great conversation about ZK payments.</span>
                </div>
                <div className="tag-row">
                  <Tag>Send demo</Tag>
                  <Tag>Potential collaborator</Tag>
                  <Tag color="purple">ZK</Tag>
                </div>
                <div className="memory-search">
                  <Search size={15} />
                  <span>“the builder I talked to about wallets”</span>
                  <span>↵</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="discovery-section section" id="discover">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  GOOD PEOPLE. BIG IDEAS. RIGHT HERE.
                </span>
                <h2>Find your kind of builders.</h2>
              </div>
              <ButtonLink href="/app/discover" variant="secondary">
                Explore discovery
                <ArrowUpRight size={16} />
              </ButtonLink>
            </div>
            <div className="discovery-preview">
              <div className="discovery-left">
                <div className="preview-toolbar">
                  <div className="preview-tabs">
                    {["People", "Projects"].map((t) => (
                      <button
                        key={t}
                        className={tab === t ? "active" : ""}
                        onClick={() => setTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <span className="preview-label">
                    <span className="status-dot" /> INTERACTIVE PREVIEW
                  </span>
                </div>
                <label className="preview-search">
                  <Search size={17} />
                  <input
                    placeholder="Find a person, a project, a possibility…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <span>⌘ K</span>
                </label>
                <div className="filter-chips">
                  {[
                    "All builders",
                    "Founder",
                    "Infrastructure",
                    "AI",
                    "Hiring",
                  ].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "active" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="preview-people">
                  {people.length ? (
                    people.slice(0, 3).map((p) => (
                      <Link
                        href={`/u/${p.username}`}
                        key={p.id}
                        className="preview-person"
                      >
                        <Avatar name={p.name} src={p.avatar} />
                        <span>
                          <strong>
                            {tab === "People" ? p.name : p.project}
                          </strong>
                          <small>
                            {tab === "People"
                              ? p.headline
                              : `Built by ${p.name}`}
                          </small>
                        </span>
                        <Tag color={p.tags.includes("AI") ? "purple" : "blue"}>
                          {p.tags[0]}
                        </Tag>
                        <ArrowUpRight size={15} />
                      </Link>
                    ))
                  ) : (
                    <div className="preview-empty">
                      No sample builders match. Try another filter.
                    </div>
                  )}
                </div>
                <span className="preview-disclaimer">
                  Illustrative profiles. Real connections start with you.
                </span>
              </div>
              <div
                className={`discovery-map ${view === "List" ? "is-list" : ""}`}
              >
                <div className="map-blocks" />
                <div className="map-road discovery-road-one" />
                <div className="map-road discovery-road-two" />
                <div className="map-road discovery-road-three" />
                <div className="map-green-space" />
                <div className="view-switch">
                  {["Map", "List"].map((v) => (
                    <button
                      className={view === v ? "active" : ""}
                      key={v}
                      onClick={() => setView(v)}
                    >
                      {v === "Map" ? <MapPin size={12} /> : <List size={12} />}{" "}
                      {v}
                    </button>
                  ))}
                </div>
                {view === "Map" ? (
                  <>
                    <span className="venue-label">
                      <MapPin size={16} fill="#197be4" color="white" /> The next
                      great conversation.
                    </span>
                    {sampleProfiles.map((p, i) => (
                      <span className={`map-avatar map-avatar-${i}`} key={p.id}>
                        <Avatar name={p.name} src={p.avatar} size="sm" />
                      </span>
                    ))}
                    <div className="map-popover">
                      <Avatar name="Priya" src="/avatars/priya.jpg" />
                      <span>
                        <strong>Priya Sharma</strong>
                        <small>Building something worth talking about.</small>
                        <Tag>Open to collaboration</Tag>
                      </span>
                      <ArrowUpRight size={16} />
                    </div>
                    <span className="map-you">
                      <span />
                    </span>
                    <span className="map-art-label">
                      Illustrative venue view · no live location tracking
                    </span>
                  </>
                ) : (
                  <div className="map-list-view">
                    <MapPin size={23} />
                    <h3>Meet at a real event.</h3>
                    {events.map((e) => (
                      <Link key={e.id} href={`/events/${e.slug}`}>
                        <EventLogo event={e} decorative />
                        <span>
                          <strong>{e.name}</strong>
                          <small>{e.venue}</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="events-section section" id="events">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">SEE YOU IN THE HALLWAY</span>
                <h2>One city. A world of connections.</h2>
              </div>
              <span className="event-city">
                <MapPin size={15} /> Mumbai, India · November 2026
              </span>
            </div>
            <div className="event-grid">
              {events.map((e) => (
                <Link
                  href={`/events/${e.slug}`}
                  className={`event-card event-${e.id}`}
                  key={e.id}
                >
                  <EventArtwork event={e} />
                  <div className="event-card-info">
                    <h3>{e.name}</h3>
                    <span>
                      <MapPin size={13} />
                      {e.venue}
                    </span>
                    <span className="event-discover-link">
                      Find your people
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="events-honesty">
              <ShieldCheck size={13} /> Dates and venues from official
              organizers. Independent of these events and ecosystems.
            </p>
          </div>
        </section>
        <section className="faq-section section" id="faq">
          <div className="container faq-grid">
            <div>
              <span className="eyebrow">
                A FEW THINGS YOU MIGHT BE WONDERING
              </span>
              <h2>
                Less guesswork.
                <br />
                More hellos.
              </h2>
              <p>Simple by design. Human at heart.</p>
            </div>
            <div className="faq-list">
              {[
                [
                  "Do I need a wallet or an account?",
                  "No wallet, ever. You can open public profiles and save connections on this device as a guest. Create an account when you want to publish your own profile or sync across devices.",
                ],
                [
                  "Does the other person need Connect IRL?",
                  "No. Add a name and a LinkedIn, X, Telegram, or website link. Add a little context and they’re in your contact book. We don’t scrape or invent their details.",
                ],
                [
                  "Who can see my notes?",
                  "Only you. Meeting notes, your saved contact book, and follow-ups are private. You choose whether your own builder profile appears in public discovery.",
                ],
                [
                  "Will it work on conference Wi-Fi?",
                  "Guest saves and locally loaded contacts work without a connection. Signed-in changes stay queued on your device until the server confirms synchronization. Camera scanning happens on your device.",
                ],
                [
                  "How does NFC work?",
                  "Write your profile URL to a compatible NFC tag on a supported device. Other phones open the URL when they read the tag. QR codes and share links are always available.",
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <Plus size={18} />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="final-cta">
          <div className="cta-network" aria-hidden="true" />
          <div className="container cta-inner">
            <div>
              <span className="eyebrow">
                YOUR NEXT GREAT CONNECTION IS OUT THERE.
              </span>
              <h2>
                Don’t let a good hello
                <br />
                become a goodbye.
              </h2>
              <p>
                Make room for the people who might change what you build next.
              </p>
            </div>
            <div className="cta-actions">
              <ButtonLink href="/signup">
                Create your profile
                <ArrowUpRight size={18} />
              </ButtonLink>
              <Link href="/app?demo=1">
                Or, take a look around
                <ArrowRight size={15} />
              </Link>
              <span>
                <LockKeyhole size={12} /> Your network belongs to you.
              </span>
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="container footer-top">
          <div>
            <Brand />
            <p>Every hello is a beginning.</p>
          </div>
          <div className="footer-links">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <Link href="/app/discover">Discover</Link>
            <Link href="/app/events">Events</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <Link href="/app" className="footer-app-link">
            Meet your next possibility
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Connect IRL. Built for the builders.
          </span>
          <span>
            <span className="status-dot" /> Open minds. Real connections.
          </span>
          <a href="#product">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
