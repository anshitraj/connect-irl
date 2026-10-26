// Builds supabase/setup-all.sql: every migration plus seed.sql in one paste for a new
// Supabase project. Run `npm run db:bundle` after adding a migration; a test fails if
// the committed bundle drifts from the migration files.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

export function buildBundle(root = ".") {
  const dir = "supabase/migrations";
  const migrations = readdirSync(`${root}/${dir}`)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => posix.join(dir, name));
  const files = [...migrations, "supabase/seed.sql"];
  const stamp = (file) => file.match(/(\d{12})_/)[1];
  const parts = [
    "-- Connect IRL: one-paste database setup for a new Supabase project.",
    "-- Paste into Supabase -> SQL Editor -> New query -> Run. Run ONCE on an empty project.",
    `-- This is every migration in ${dir} (${stamp(migrations[0])} to ${stamp(migrations.at(-1))}) followed by seed.sql, in order.`,
    "-- Regenerate with `npm run db:bundle` instead of editing it by hand.",
    "",
  ];
  for (const file of files) {
    const sql = readFileSync(`${root}/${file}`, "utf8").replace(/\r\n/g, "\n");
    parts.push(
      "-- ============================================================",
      `-- ${file}`,
      "-- ============================================================",
      sql.endsWith("\n") ? sql : `${sql}\n`,
    );
  }
  return parts.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bundle = buildBundle();
  writeFileSync("supabase/setup-all.sql", bundle);
  console.log(`Wrote supabase/setup-all.sql (${bundle.split("\n").length} lines).`);
}
