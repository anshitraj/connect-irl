"use client";
import { Button } from "@/components/ui";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="not-found">
      <h1>A little interruption.</h1>
      <p>
        Your saved records are still on this device. Let’s try opening the page
        again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
