"use client";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import type { ReactNode } from "react";

export function ConnectLink({
  children = "Add connection",
  className = "",
  variant = "primary",
}: {
  children?: ReactNode;
  className?: string;
  variant?: string;
}) {
  const warmScanner = () => {
    void import("./scanner");
  };
  return (
    <Link
      href="/app/scan"
      prefetch
      className={`button button-${variant} ${className}`}
      onPointerEnter={warmScanner}
      onFocus={warmScanner}
      onPointerDown={warmScanner}
    >
      <ScanLine size={16} />
      {children}
    </Link>
  );
}
