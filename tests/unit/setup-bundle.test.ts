import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBundle } from "../../scripts/build-setup-sql.mjs";

describe("one-paste Supabase setup", () => {
  it("matches the migration files and keeps dollar quoting intact", () => {
    const committed = readFileSync("supabase/setup-all.sql", "utf8").replace(
      /\r\n/g,
      "\n",
    );
    // Fails when a migration changes without running `npm run db:bundle`.
    expect(committed).toBe(buildBundle());
    expect(committed).not.toMatch(/as \$\s/);
  });
});
