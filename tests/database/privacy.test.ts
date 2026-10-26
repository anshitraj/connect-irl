import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
let db: PGlite;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";
const meetingId = "44444444-4444-4444-8444-444444444444";
const projectId = "55555555-5555-4555-8555-555555555555";
const profile = (id: string, username: string) => ({
  id,
  username,
  name: username,
  headline: "Builder",
  bio: "",
  role: "Developer",
  organization: "",
  city: "",
  avatar: "",
  tags: ["Solana"],
  lookingFor: [],
  project: "",
  links: [],
  public: true,
  discoverable: true,
});
const contact = {
  id: contactId,
  name: "External Builder",
  headline: "Engineer",
  project: "Rail",
  avatar: "",
  tags: ["Rust"],
  links: [],
  meetings: [
    {
      id: meetingId,
      at: "2026-10-25T10:00:00Z",
      eventId: "ibw-2026",
      note: "Private: discussed agent payments.",
    },
  ],
  starred: false,
  archived: false,
  source: "manual",
  createdAt: "2026-10-25T10:00:00Z",
};
const batch = (overrides: Record<string, unknown> = {}) => ({
  profile: null,
  contacts: [],
  projects: [],
  reminders: [],
  bookmarks: [],
  eventBookmarks: [],
  blocked: [],
  deleted: [],
  preferencesChanged: false,
  ...overrides,
});
const asUser = async (id: string) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    grant usage on schema public,auth,storage to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
  `);
  // PGlite has built-in gen_random_uuid; the hosted-only extension statement is unnecessary here.
  const migration = (
    await readFile(
      resolve("supabase/migrations/202610250001_foundation.sql"),
      "utf8",
    )
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(migration);
  await db.exec(
    await readFile(
      resolve("supabase/migrations/202610250002_contact_merge.sql"),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      resolve("supabase/migrations/202610250003_collaboration_presence.sql"),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      resolve("supabase/migrations/202610260004_current_event.sql"),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      resolve("supabase/migrations/202610260005_connection_receipts.sql"),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      resolve("supabase/migrations/202610260006_multi_role_profiles.sql"),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      resolve("supabase/migrations/202610260008_multi_event.sql"),
      "utf8",
    ),
  );
  await db.exec(await readFile(resolve("supabase/seed.sql"), "utf8"));
  await db.exec(
    "grant select,insert,update,delete on all tables in schema public to authenticated; grant select on all tables in schema public to anon; grant select,insert,delete on storage.objects to authenticated; grant select on storage.objects to anon;",
  );
  await db.query("insert into auth.users(id) values($1),($2)", [alice, bob]);
  await asUser(alice);
  await db.query("select public.sync_workspace($1::jsonb)", [
    JSON.stringify(
      batch({ profile: profile(alice, "alice"), contacts: [contact] }),
    ),
  ]);
  await asUser(bob);
  await db.query("select public.sync_workspace($1::jsonb)", [
    JSON.stringify(batch({ profile: profile(bob, "bob") })),
  ]);
});
afterAll(async () => {
  await db?.close();
});
describe("Real PostgreSQL migrations and ownership policies", () => {
  it("stores every attended event privately and rejects unverified ones", async () => {
    await asUser(alice);
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(
        batch({
          activeEventId: "ibw-2026",
          eventIds: ["ibw-2026", "ethglobal-2026", "devcon-8"],
          preferencesChanged: true,
        }),
      ),
    ]);
    expect(
      (
        await db.query(
          "select data->'eventIds' as ids from public.profile_preferences where owner_id=$1",
          [alice],
        )
      ).rows,
    ).toEqual([{ ids: ["ibw-2026", "ethglobal-2026", "devcon-8"] }]);
    await expect(
      db.query("select public.sync_workspace($1::jsonb)", [
        JSON.stringify(
          batch({
            eventIds: ["ibw-2026", "invented-event"],
            preferencesChanged: true,
          }),
        ),
      ]),
    ).rejects.toThrow(/verified event/);
    await asUser(bob);
    expect(
      (
        await db.query(
          "select * from public.profile_preferences where owner_id=$1",
          [alice],
        )
      ).rows,
    ).toEqual([]);
  });
  it("keeps the selected event private and rejects unverified event context atomically", async () => {
    await asUser(alice);
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(
        batch({ activeEventId: "ibw-2026", preferencesChanged: true }),
      ),
    ]);
    expect(
      (
        await db.query(
          "select data->>'activeEventId' as event from public.profile_preferences where owner_id=$1",
          [alice],
        )
      ).rows,
    ).toEqual([{ event: "ibw-2026" }]);
    await expect(
      db.query("select public.sync_workspace($1::jsonb)", [
        JSON.stringify(
          batch({ activeEventId: "invented-event", preferencesChanged: true }),
        ),
      ]),
    ).rejects.toThrow(/verified event/);
    expect(
      (
        await db.query(
          "select data->>'activeEventId' as event from public.profile_preferences where owner_id=$1",
          [alice],
        )
      ).rows,
    ).toEqual([{ event: "ibw-2026" }]);
    await asUser(bob);
    expect(
      (
        await db.query(
          "select * from public.profile_preferences where owner_id=$1",
          [alice],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("runs the complete schema and seed without SQL errors", async () => {
    const result = await db.query("select name from public.events");
    expect(result.rows).toHaveLength(4);
  });
  it("rejects cross-account reads of contacts, meeting notes, and audio metadata", async () => {
    await asUser(bob);
    for (const table of [
      "saved_contacts",
      "contact_meetings",
      "contact_notes",
    ]) {
      expect(
        (await db.query(`select * from public.${table}`)).rows,
      ).toHaveLength(0);
    }
  });
  it("preserves private notes for their owner and full-text search", async () => {
    await asUser(alice);
    const result = await db.query<{ private_note: string }>(
      "select private_note from public.contact_meetings",
    );
    expect(result.rows[0].private_note).toContain("agent payments");
    expect(
      (await db.query("select * from public.search_my_contacts('payments')"))
        .rows,
    ).toHaveLength(1);
  });
  it("prevents another user from modifying or deleting a contact", async () => {
    await asUser(bob);
    await db.query("delete from public.saved_contacts where id=$1", [
      contactId,
    ]);
    await expect(
      db.query("select public.sync_workspace($1::jsonb)", [
        JSON.stringify(batch({ contacts: [{ ...contact, name: "FORGED" }] })),
      ]),
    ).rejects.toThrow();
    await asUser(alice);
    expect(
      (
        await db.query<{ data: { name: string } }>(
          "select data from public.saved_contacts",
        )
      ).rows[0].data.name,
    ).toBe("External Builder");
  });
  it("rolls back a whole batch when a reminder references a nonexistent contact", async () => {
    await asUser(alice);
    const updated = { ...contact, name: "SHOULD ROLL BACK" };
    const reminder = {
      id: "66666666-6666-4666-8666-666666666666",
      contactId: bob,
      due: "2026-11-01",
      title: "Follow up",
      completed: false,
      draft: "",
    };
    await expect(
      db.query("select public.sync_workspace($1::jsonb)", [
        JSON.stringify(batch({ contacts: [updated], reminders: [reminder] })),
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query<{ data: { name: string } }>(
          "select data from public.saved_contacts",
        )
      ).rows[0].data.name,
    ).toBe("External Builder");
  });
  it("upserts repeat meetings without duplicate saved people", async () => {
    await asUser(alice);
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(batch({ contacts: [contact] })),
    ]);
    expect(
      (await db.query("select * from public.saved_contacts")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select * from public.contact_meetings")).rows,
    ).toHaveLength(1);
  });
  it("publishes projects and forbids editing another founder’s project", async () => {
    await asUser(alice);
    const project = {
      id: projectId,
      ownerId: alice,
      slug: "payment-rail",
      name: "Rail",
      tagline: "Better payments",
      description: "",
      tags: [],
      needs: [],
      stage: "Building",
      public: true,
      website: "",
      repository: "",
      demo: "",
    };
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(batch({ projects: [project] })),
    ]);
    await asUser(bob);
    expect((await db.query("select * from public.projects")).rows).toHaveLength(
      1,
    );
    await expect(
      db.query("select public.sync_workspace($1::jsonb)", [
        JSON.stringify(batch({ projects: [{ ...project, name: "FORGED" }] })),
      ]),
    ).rejects.toThrow();
  });
  it("keeps private profiles out of anonymous access", async () => {
    await asUser(bob);
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(
        batch({
          profile: {
            ...profile(bob, "bob"),
            public: false,
            discoverable: false,
          },
        }),
      ),
    ]);
    await db.exec(
      "reset role; select set_config('request.jwt.claim.sub','',false); set role anon;",
    );
    expect(
      (await db.query("select username from public.profiles")).rows,
    ).toEqual([{ username: "alice" }]);
    await expect(
      db.query("select public.sync_workspace($1::jsonb)", [
        JSON.stringify(batch()),
      ]),
    ).rejects.toThrow();
  });
  it("isolates private voice-note objects by owner folder", async () => {
    await asUser(alice);
    await db.query(
      "insert into storage.objects(bucket_id,name) values($1,$2)",
      ["voice-notes", `${alice}/${contactId}/note.webm`],
    );
    await asUser(bob);
    expect(
      (
        await db.query(
          "select * from storage.objects where bucket_id='voice-notes'",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
        "voice-notes",
        `${alice}/forged.webm`,
      ]),
    ).rejects.toThrow();
  });
  it("preserves unseen meetings when a stale offline copy synchronizes", async () => {
    await asUser(alice);
    const extra = {
      id: "77777777-7777-4777-8777-777777777777",
      at: "2026-10-26T10:00:00Z",
      eventId: "",
      note: "Second device meeting",
    };
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(
        batch({
          contacts: [{ ...contact, meetings: [...contact.meetings, extra] }],
        }),
      ),
    ]);
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(batch({ contacts: [contact] })),
    ]);
    const saved = await db.query<{ data: { meetings: { note: string }[] } }>(
      "select data from public.saved_contacts where id=$1",
      [contactId],
    );
    expect(saved.rows[0].data.meetings).toHaveLength(2);
  });
  it("reconciles independently saved profiles and remaps offline reminders", async () => {
    await asUser(alice);
    const firstId = "88888888-8888-4888-8888-888888888888";
    const otherId = "99999999-9999-4999-8999-999999999999";
    await db.query("select public.sync_workspace($1::jsonb)", [
      JSON.stringify(
        batch({
          contacts: [
            { ...contact, id: firstId, profileId: alice, meetings: [] },
          ],
        }),
      ),
    ]);
    const result = await db.query<{ mapping: Record<string, string> }>(
      "select public.sync_workspace($1::jsonb) as mapping",
      [
        JSON.stringify(
          batch({
            contacts: [
              { ...contact, id: otherId, profileId: alice, meetings: [] },
            ],
            reminders: [
              {
                id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
                contactId: otherId,
                due: "2026-11-01",
                title: "Reconnect",
                completed: false,
                draft: "",
              },
            ],
          }),
        ),
      ],
    );
    expect(result.rows[0].mapping[otherId]).toBe(firstId);
    expect(
      (
        await db.query<{ contact_id: string }>(
          "select contact_id from public.follow_up_reminders",
        )
      ).rows[0].contact_id,
    ).toBe(firstId);
  });
  it("merges server histories and reminders atomically without exposing another user’s records", async () => {
    await asUser(bob);
    await expect(
      db.query("select public.merge_contacts($1,$2)", [
        contactId,
        "88888888-8888-4888-8888-888888888888",
      ]),
    ).rejects.toThrow();
    await asUser(alice);
    await db.query("select public.merge_contacts($1,$2)", [
      contactId,
      "88888888-8888-4888-8888-888888888888",
    ]);
    expect(
      (
        await db.query("select * from public.saved_contacts where id=$1", [
          contactId,
        ])
      ).rows,
    ).toHaveLength(0);
    const target = await db.query<{ data: { meetings: unknown[] } }>(
      "select data from public.saved_contacts where id=$1",
      ["88888888-8888-4888-8888-888888888888"],
    );
    expect(target.rows[0].data.meetings.length).toBeGreaterThanOrEqual(2);
  });
  it("uses a database-backed mutation rate limit", async () => {
    await asUser(alice);
    const result = await db.query<{ permitted: boolean }>(
      "select public.check_rate_limit('mutation',60,60) as permitted from generate_series(1,61)",
    );
    expect(result.rows.slice(0, 60).every((r) => r.permitted)).toBe(true);
    expect(result.rows[60].permitted).toBe(false);
  });
});
