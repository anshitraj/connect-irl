"use client";
import { cn, safeUrl } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  Box,
  Check,
  ExternalLink,
  Link as LinkIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode, ReactEventHandler } from "react";
import { SocialLogo } from "./social-logo";
export function Brand({
  light = false,
  compact = false,
  linked = true,
}: {
  light?: boolean;
  compact?: boolean;
  linked?: boolean;
}) {
  const content = (
    <>
      <span className="brand-mark">
        <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
          <path d="m16 0 9 5v10l-9 5-9-5V5Z" fill="currentColor" />
          <path
            d="m6 17 9 5v10l-9 4-6-4V21Z"
            fill="currentColor"
            opacity=".75"
          />
          <path
            d="m26 17 6 4v11l-9 4-6-4V22Z"
            fill="currentColor"
            opacity=".45"
          />
          <path d="m16 3 6 3.5-6 3.5-6-3.5Z" fill="white" opacity=".35" />
        </svg>
      </span>
      {!compact && (
        <span>
          Connect <span className="brand-match">IRL</span>
          <span className="brand-period">.</span>
        </span>
      )}
    </>
  );
  return linked ? (
    <Link
      href="/"
      className={cn("brand", light && "brand-light")}
      aria-label="Connect IRL home"
    >
      {content}
    </Link>
  ) : (
    <span className={cn("brand", light && "brand-light")}>{content}</span>
  );
}
export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={cn("button", `button-${variant}`, className)} {...props}>
      {children}
    </button>
  );
}
export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <Link className={cn("button", `button-${variant}`, className)} href={href}>
      {children}
    </Link>
  );
}
export function Avatar({
  name,
  src,
  size = "md",
  online = false,
  onImageError,
}: {
  name: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  onImageError?: ReactEventHandler<HTMLImageElement>;
}) {
  return (
    <span className={cn("avatar", `avatar-${size}`)}>
      {src && (src.startsWith("/avatars/") || src.startsWith("https://")) ? (
        <img src={src} alt="" loading="lazy" onError={onImageError} />
      ) : (
        <span>
          {name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
      {online && (
        <span className="avatar-online">
          <Check size={8} />
        </span>
      )}
    </span>
  );
}
export function Tag({
  children,
  color = "",
}: {
  children: ReactNode;
  color?: string;
}) {
  return <span className={cn("tag", color && `tag-${color}`)}>{children}</span>;
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={cn("modal", wide && "modal-wide")}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="modal-top">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description ? (
                <Dialog.Description>{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">
                  {title}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon || <Box size={26} />}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function SocialLinks({
  links,
}: {
  links: { label: string; url: string }[];
}) {
  return (
    <div className="social-links">
      {links
        .filter((l) => safeUrl(l.url))
        .map((l, i) => (
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            key={`${l.label}-${i}`}
            aria-label={`Open ${l.label}`}
            title={l.label}
          >
            {[
              "GitHub",
              "Telegram",
              "LinkedIn",
              "X",
              "Twitter",
              "Discord",
            ].includes(l.label) ? (
              <SocialLogo platform={l.label} size={16} />
            ) : (
              <LinkIcon size={16} />
            )}
          </a>
        ))}
    </div>
  );
}
export function External({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return safeUrl(href) ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  ) : (
    <span>
      {children}
      <ExternalLink size={15} />
    </span>
  );
}
