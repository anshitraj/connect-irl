import type { SVGProps } from "react";
export function Github({
  size = 18,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.9a3.4 3.4 0 0 0-.9-2.7c3-.3 6.1-1.4 6.1-6.7a5.3 5.3 0 0 0-1.5-3.7 4.9 4.9 0 0 0-.1-3.7s-1.1-.4-3.8 1.4a13 13 0 0 0-6.8 0C5.3.2 4.2.6 4.2.6a4.9 4.9 0 0 0-.1 3.7A5.3 5.3 0 0 0 2.6 8c0 5.3 3.1 6.4 6.1 6.7a3.4 3.4 0 0 0-.9 2.7v3.9"
        transform="translate(1 1) scale(.94)"
      />
    </svg>
  );
}
