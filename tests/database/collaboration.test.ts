import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const builder = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
const publicProject = "44444444-4444-4444-8444-444444444444";
const privateProject = "55555555-5555-4555-8555-555555555555";
const profile = (id: string, username: string) => ({
  id,
  username,
  name: username,
  headline: "Solana developer",
  bio: "Build payment infrastructure",
  role: "Developer",
  organization: "",
  city: "",
  avatar: "",
  tags: ["Solana"],
  lookingFor: ["Collaborators"],
  project: "",
  links: [],
  public: true,
  discoverable: true,
});
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function action(kind: string, target: string, body = {}) {
  const result = await db.query<{ result: { id: string } }>(
    "select public.collaboration_action($1,$2::uuid,$3::jsonb) as result",
    [kind, target, JSON.stringify(body)],
  );
  return result.rows[0].result.id;
}
async function presence(filters: string[] = ["", "", "", ""], page = 0) {
  const result = await db.query<{
    result: { profile: { id: string }; eventId: string; expiresAt: string }[];
  }>(
    "select public.discover_venue_builders('ibw-2026',$1,$2,$3,$4,$5) as result",
    [...filters, page],
  );
  return result.rows[0].result;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    grant usage on schema public,auth,storage to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  for (const file of [
    "202610250001_foundation.sql",
    "202610250002_contact_merge.sql",
    "202610250003_collaboration_presence.sql",
    "202610260004_current_event.sql",
    "202610260005_connection_receipts.sql",
    "202610260006_multi_role_profiles.sql",
  ]) {
    await db.exec(
      (await readFile(resolve("supabase/migrations", file), "utf8")).replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  }
  await db.exec(await readFile(resolve("supabase/seed.sql"), "utf8"));
  // Grant table privileges as Supabase does; RLS must still deny direct mutations.
  await db.exec(
    "grant select,insert,update,delete on all tables in schema public to authenticated; grant select on all tables in schema public to anon;",
  );
});
beforeEach(async () => {
  await db.exec("reset role; delete from auth.users;");
  for (const [id, name] of [
    [owner, "owner"],
    [builder, "builder"],
    [outsider, "outsider"],
  ]) {
    await db.query("insert into auth.users values($1)", [id]);
    await db.query(
      "insert into public.profiles(id,username,is_public,discoverable,data) values($1,$2,true,true,$3::jsonb)",
      [id, name, JSON.stringify(profile(id, name))],
    );
  }
  for (const [id, slug, isPublic] of [
    [publicProject, "public-project", true],
    [privateProject, "private-project", false],
  ] as const) {
    await db.query(
      "insert into public.projects(id,owner_id,slug,is_public,data) values($1,$2,$3,$4,$5::jsonb)",
      [
        id,
        owner,
        slug,
        isPublic,
        JSON.stringify({
          id,
          slug,
          ownerId: owner,
          name: slug,
          tagline: "Build together",
          description: "Private strategy",
          public: isPublic,
        }),
      ],
    );
  }
  await asUser(builder);
});
afterAll(async () => {
  await db?.close();
});

async function scanConnection(target = owner, source = "qr") {
  const id = crypto.randomUUID();
  await db.query("select public.sync_workspace($1::jsonb)", [
    JSON.stringify({
      profile: null,
      contacts: [
        {
          id,
          profileId: target,
          name: "Shared public name",
          headline: "",
          project: "",
          avatar: "",
          tags: [],
          links: [],
          meetings: [
            {
              id: crypto.randomUUID(),
              at: new Date().toISOString(),
              eventId: "ibw-2026",
              note: "PRIVATE meeting context",
            },
          ],
          source,
          starred: false,
          archived: false,
          createdAt: new Date().toISOString(),
        },
      ],
      projects: [],
      reminders: [],
      preferencesChanged: false,
    }),
  ]);
}
describe("Private connection receipts", () => {
  it("creates one recipient-only receipt after a real saved profile, without private context", async () => {
    await scanConnection();
    expect(
      (
        await db.query<{
          id: string;
          actor_id: string;
          recipient_id: string;
          read_at: string | null;
        }>("select * from public.connection_receipts")
      ).rows,
    ).toHaveLength(0);
    await scanConnection();
    await asUser(owner);
    const result = (
      await db.query<{
        id: string;
        actor_id: string;
        recipient_id: string;
        read_at: string | null;
      }>("select * from public.connection_receipts")
    ).rows;
    expect(result).toHaveLength(1);
    expect(result[0].actor_id).toBe(builder);
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(JSON.stringify(result)).not.toContain("ibw-2026");
    await db.query("select public.mark_connection_receipt_read($1::uuid)", [
      result[0].id,
    ]);
    expect(
      (
        await db.query<{ read_at: string | null }>(
          "select read_at from public.connection_receipts",
        )
      ).rows[0].read_at,
    ).not.toBeNull();
    await asUser(outsider);
    expect(
      (
        await db.query<{
          id: string;
          actor_id: string;
          recipient_id: string;
          read_at: string | null;
        }>("select * from public.connection_receipts")
      ).rows,
    ).toHaveLength(0);
  });
  it("rejects forged receipts and direct client modifications", async () => {
    await expect(
      db.query(
        "insert into public.connection_receipts(actor_id,recipient_id) values($1,$2)",
        [outsider, owner],
      ),
    ).rejects.toThrow(/row-level security/);
    await scanConnection();
    await asUser(owner);
    await db.query("update public.connection_receipts set actor_id=$1", [
      outsider,
    ]);
    expect(
      (
        await db.query<{ actor_id: string }>(
          "select actor_id from public.connection_receipts",
        )
      ).rows[0].actor_id,
    ).toBe(builder);
  });
  it("does not notify for a private sender or imported contact", async () => {
    await db.exec("reset role");
    await db.query(
      "update public.profiles set is_public=false,discoverable=false,data=jsonb_set(data,'{public}','false') where id=$1",
      [builder],
    );
    await asUser(builder);
    await scanConnection();
    await db.exec("reset role");
    expect(
      (
        await db.query<{
          id: string;
          actor_id: string;
          recipient_id: string;
          read_at: string | null;
        }>("select * from public.connection_receipts")
      ).rows,
    ).toHaveLength(0);
    await db.query(
      "update public.profiles set is_public=true,data=jsonb_set(data,'{public}','true') where id=$1",
      [builder],
    );
    await asUser(builder);
    await scanConnection(outsider, "import");
    await db.exec("reset role");
    expect(
      (
        await db.query<{
          id: string;
          actor_id: string;
          recipient_id: string;
          read_at: string | null;
        }>("select * from public.connection_receipts")
      ).rows,
    ).toHaveLength(0);
  });
  it("respects bilateral blocks, including after a receipt was created", async () => {
    await scanConnection();
    await db.exec("reset role");
    await db.query("insert into public.blocked_users values($1,$2)", [
      owner,
      builder,
    ]);
    await asUser(owner);
    expect(
      (
        await db.query<{
          id: string;
          actor_id: string;
          recipient_id: string;
          read_at: string | null;
        }>("select * from public.connection_receipts")
      ).rows,
    ).toHaveLength(0);
    await asUser(builder);
    await scanConnection();
    await db.exec("reset role");
    expect(
      (
        await db.query<{
          id: string;
          actor_id: string;
          recipient_id: string;
          read_at: string | null;
        }>("select * from public.connection_receipts")
      ).rows,
    ).toHaveLength(1);
  });
});
describe("Consent-based collaboration in real PostgreSQL", () => {
  it("keeps requests pending and deduplicates updates before owner acceptance", async () => {
    const id = await action("request", publicProject, {
      message: "I can help with Rust.",
    });
    expect(
      await action("request", publicProject, {
        message: "I can help with Solana.",
      }),
    ).toBe(id);
    expect(
      (await db.query("select * from public.project_members")).rows,
    ).toHaveLength(0);
    await asUser(owner);
    expect(
      (
        await db.query(
          "select message,status from public.project_collaboration_requests",
        )
      ).rows,
    ).toEqual([{ message: "I can help with Solana.", status: "pending" }]);
    await action("respond_request", id, { decision: "accepted" });
    expect(
      (await db.query("select user_id,role from public.project_members")).rows,
    ).toEqual([{ user_id: builder, role: "Collaborator" }]);
    await expect(
      action("respond_request", id, { decision: "accepted" }),
    ).rejects.toThrow(/no longer pending/);
  });
  it("isolates participant inboxes and rejects another builder's response or withdrawal", async () => {
    const id = await action("request", publicProject, {
      message: "Happy to help.",
    });
    await asUser(outsider);
    expect(
      (await db.query("select * from public.project_collaboration_requests"))
        .rows,
    ).toHaveLength(0);
    await expect(
      action("respond_request", id, { decision: "accepted" }),
    ).rejects.toThrow(/Only the project owner/);
    await expect(action("withdraw_request", id)).rejects.toThrow(
      /Only your pending/,
    );
    await asUser(builder);
    await action("withdraw_request", id);
    expect(
      (await db.query("select * from public.project_collaboration_requests"))
        .rows,
    ).toHaveLength(0);
  });
  it("declines without creating membership and refuses private-project requests", async () => {
    await expect(
      action("request", privateProject, { message: "Guessing a private ID." }),
    ).rejects.toThrow(/cannot accept/);
    const id = await action("request", publicProject, {
      message: "Happy to help.",
    });
    await asUser(owner);
    await action("respond_request", id, { decision: "declined" });
    expect(
      (await db.query("select * from public.project_members")).rows,
    ).toHaveLength(0);
  });
  it("denies manufactured members, invitations, and accepted requests through direct writes", async () => {
    await expect(
      db.query(
        "insert into public.project_members(project_id,user_id) values($1,$2)",
        [publicProject, builder],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        "insert into public.project_collaboration_requests(project_id,sender_id,message,status) values($1,$2,'Forged','accepted')",
        [publicProject, builder],
      ),
    ).rejects.toThrow(/row-level security/);
    await asUser(owner);
    await expect(
      db.query(
        "insert into public.project_invitations(project_id,invited_by,invitee_id) values($1,$2,$3)",
        [privateProject, owner, builder],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        "insert into public.project_members(project_id,user_id) values($1,$2)",
        [privateProject, builder],
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("shares only a private-project summary until the invited builder accepts", async () => {
    await asUser(owner);
    const id = await action("invite", privateProject, {
      username: "builder",
      role: "Engineer",
    });
    await asUser(outsider);
    expect(
      (await db.query("select * from public.project_invitations")).rows,
    ).toHaveLength(0);
    await expect(
      action("respond_invitation", id, { decision: "accepted" }),
    ).rejects.toThrow(/Only the invited/);
    await asUser(builder);
    expect(
      (
        await db.query("select * from public.projects where id=$1", [
          privateProject,
        ])
      ).rows,
    ).toHaveLength(0);
    const summary = await db.query<{ result: object[] }>(
      "select public.project_summaries(array[$1::uuid]) as result",
      [privateProject],
    );
    expect(summary.rows[0].result).toHaveLength(1);
    expect(JSON.stringify(summary.rows)).not.toContain("Private strategy");
    await action("respond_invitation", id, { decision: "accepted" });
    expect(
      (
        await db.query("select * from public.projects where id=$1", [
          privateProject,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "update public.projects set is_public=true where id=$1 returning id",
          [privateProject],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("lets owners change role labels, while members can leave but cannot escalate privileges", async () => {
    await asUser(owner);
    const id = await action("invite", privateProject, {
      username: "builder",
      role: "Contributor",
    });
    await asUser(builder);
    await action("respond_invitation", id, { decision: "accepted" });
    await expect(
      action("set_member_role", privateProject, {
        userId: builder,
        role: "Owner",
      }),
    ).rejects.toThrow(/not permitted/);
    await asUser(owner);
    await action("set_member_role", privateProject, {
      userId: builder,
      role: "Engineer",
    });
    expect(
      (await db.query("select role from public.project_members")).rows,
    ).toEqual([{ role: "Engineer" }]);
    await asUser(builder);
    await action("remove_member", privateProject, { userId: builder });
    expect(
      (
        await db.query("select * from public.projects where id=$1", [
          privateProject,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it("allows invitation revocation and decline without granting membership", async () => {
    await asUser(owner);
    const id = await action("invite", privateProject, {
      username: "builder",
      role: "Designer",
    });
    await action("revoke_invitation", id);
    await asUser(builder);
    await expect(
      action("respond_invitation", id, { decision: "accepted" }),
    ).rejects.toThrow(/no longer pending/);
    await asUser(owner);
    await action("invite", privateProject, {
      username: "builder",
      role: "Designer",
    });
    await asUser(builder);
    await action("respond_invitation", id, { decision: "declined" });
    expect(
      (await db.query("select * from public.project_members")).rows,
    ).toHaveLength(0);
  });
  it("honors blocks in either direction for requests and invitations", async () => {
    await asUser(owner);
    await db.query("insert into public.blocked_users values($1,$2)", [
      owner,
      builder,
    ]);
    await expect(
      action("invite", publicProject, { username: "builder", role: "Builder" }),
    ).rejects.toThrow(/unavailable/);
    await asUser(builder);
    await expect(
      action("request", publicProject, { message: "Blocked request" }),
    ).rejects.toThrow(/cannot accept/);
    await db.exec("reset role;delete from public.blocked_users");
    await asUser(builder);
    await db.query("insert into public.blocked_users values($1,$2)", [
      builder,
      owner,
    ]);
    await expect(
      action("request", publicProject, { message: "Other direction" }),
    ).rejects.toThrow(/cannot accept/);
  });
  it("rejects anonymous RPC execution", async () => {
    await db.exec("reset role;set role anon");
    await expect(
      action("request", publicProject, { message: "Anon" }),
    ).rejects.toThrow(/permission denied/);
    await expect(presence()).rejects.toThrow(/permission denied/);
  });
});
describe("Voluntary venue discovery in real PostgreSQL", () => {
  it("returns active opted-in profiles, filters skills/roles/goals, and omits expired check-ins", async () => {
    await db.exec("reset role");
    await db.query(
      "insert into public.event_checkins values($1,'ibw-2026',now()+interval '1 hour'),($2,'ibw-2026',now()-interval '1 minute')",
      [builder, outsider],
    );
    await asUser(owner);
    const rows = await presence();
    expect(rows.map((r) => r.profile.id)).toEqual([builder]);
    expect(
      await presence(["payment", "Solana", "Developer", "Collaborators"]),
    ).toHaveLength(1);
    expect(await presence(["", "Ethereum", "", ""])).toHaveLength(0);
    expect(await presence(["", "", "Designer", ""])).toHaveLength(0);
    expect(await presence(["", "", "", "Hiring"])).toHaveLength(0);
    expect(JSON.stringify(rows)).not.toMatch(
      /latitude|longitude|private_note|email/,
    );
  });
  it("hides private and undiscoverable profiles even when they still have an active check-in", async () => {
    await db.exec("reset role");
    await db.query(
      "insert into public.event_checkins values($1,'ibw-2026',now()+interval '1 hour'),($2,'ibw-2026',now()+interval '1 hour')",
      [builder, outsider],
    );
    await db.query(
      "update public.profiles set discoverable=false,is_public=false where id=$1",
      [builder],
    );
    await db.query(
      "update public.profiles set discoverable=false where id=$1",
      [outsider],
    );
    await asUser(owner);
    expect(await presence()).toEqual([]);
    expect(
      (await db.query("select * from public.event_checkins")).rows,
    ).toEqual([]);
  });
  it("hides blocked builders from the RPC and direct check-in reads in both directions", async () => {
    await db.exec("reset role");
    await db.query(
      "insert into public.event_checkins values($1,'ibw-2026',now()+interval '1 hour'),($2,'ibw-2026',now()+interval '1 hour')",
      [builder, outsider],
    );
    await db.query("insert into public.blocked_users values($1,$2),($3,$1)", [
      owner,
      builder,
      outsider,
    ]);
    await asUser(owner);
    expect(await presence()).toEqual([]);
    expect(
      (await db.query("select * from public.event_checkins")).rows,
    ).toEqual([]);
  });
  it("bounds pagination and rejects unknown events", async () => {
    await db.exec("reset role");
    await db.query(
      "insert into public.event_checkins values($1,'ibw-2026',now()+interval '1 hour')",
      [builder],
    );
    await asUser(owner);
    expect(await presence(["", "", "", ""], 1)).toEqual([]);
    expect(await presence(["", "", "", ""], -1)).toHaveLength(1);
    await expect(
      db.query("select public.discover_venue_builders('invented-event')"),
    ).rejects.toThrow(/verified event/);
  });
  it("finds a multi-role person by a secondary role while keeping legacy profiles discoverable", async () => {
    await db.exec("reset role");
    await db.query(
      "update public.profiles set data=jsonb_set(data,'{roles}','[\"Founder\",\"Engineer\"]'::jsonb) where id=$1",
      [builder],
    );
    await db.query(
      "insert into public.event_checkins values($1,'ibw-2026',now()+interval '1 hour'),($2,'ibw-2026',now()+interval '1 hour')",
      [builder, outsider],
    );
    await asUser(owner);
    expect(
      (await presence(["", "", "Engineer", ""])).map((row) => row.profile.id),
    ).toEqual([builder]);
    expect(
      (await presence(["", "", "Developer", ""])).map((row) => row.profile.id),
    ).toContain(outsider);
  });
});
