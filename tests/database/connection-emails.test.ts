import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
let db: PGlite;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const carol = "33333333-3333-4333-8333-333333333333";
const profile = (id: string, username: string) => ({
  id,
  username,
  name: `${username} Example`,
  headline: "Builder",
  avatar: "/avatars/priya.jpg",
  public: true,
});
type Claim = {
  receiptId: string;
  recipientId: string;
  email: string;
  actor: { name: string; username: string; headline: string; avatar: string };
};
const claim = async (actor: string) =>
  (
    await db.query<{ result: Claim[] }>(
      "select public.claim_connection_emails($1::uuid) as result",
      [actor],
    )
  ).rows[0].result;
const receipt = (actor: string, recipient: string, age = "0 seconds") =>
  db.query(
    "insert into public.connection_receipts(actor_id,recipient_id,created_at) values($1,$2,now()-$3::interval)",
    [actor, recipient, age],
  );
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
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
    "202610260007_connection_emails.sql",
  ]) {
    await db.exec(
      (await readFile(resolve("supabase/migrations", file), "utf8")).replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  }
  await db.exec(await readFile(resolve("supabase/seed.sql"), "utf8"));
  await db.exec(
    "grant select,insert,update,delete on all tables in schema public to authenticated;",
  );
});
beforeEach(async () => {
  await db.exec("reset role; delete from auth.users;");
  for (const [id, name] of [
    [alice, "alice"],
    [bob, "bob"],
    [carol, "carol"],
  ]) {
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [id, `${name}@example.com`],
    );
    await db.query(
      "insert into public.profiles(id,username,is_public,discoverable,data) values($1,$2,true,true,$3::jsonb)",
      [id, name, JSON.stringify(profile(id, name))],
    );
  }
});
afterAll(async () => {
  await db?.close();
});
describe("Connection email claims", () => {
  it("hands out each eligible receipt exactly once, with public profile fields only", async () => {
    await receipt(alice, bob);
    const first = await claim(alice);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      recipientId: bob,
      email: "bob@example.com",
      actor: {
        name: "alice Example",
        username: "alice",
        headline: "Builder",
        avatar: "/avatars/priya.jpg",
      },
    });
    expect(Object.keys(first[0].actor).sort()).toEqual([
      "avatar",
      "headline",
      "name",
      "username",
    ]);
    expect(await claim(alice)).toEqual([]);
    expect(
      (
        await db.query<{ emailed_at: string | null }>(
          "select emailed_at from public.connection_receipts",
        )
      ).rows[0].emailed_at,
    ).not.toBeNull();
  });
  it("only claims receipts created by the named actor", async () => {
    await receipt(alice, bob);
    await receipt(carol, bob);
    expect((await claim(alice)).map((row) => row.actor.username)).toEqual([
      "alice",
    ]);
    expect((await claim(carol)).map((row) => row.actor.username)).toEqual([
      "carol",
    ]);
  });
  it.each([
    [
      "opted out",
      `update public.users set connection_emails=false where id='${bob}'`,
    ],
    ["has no email", `update auth.users set email=null where id='${bob}'`],
    [
      "is unconfirmed",
      `update auth.users set email_confirmed_at=null where id='${bob}'`,
    ],
    [
      "is private",
      `update public.profiles set is_public=false,discoverable=false where id='${bob}'`,
    ],
    [
      "blocked the sender",
      `insert into public.blocked_users values('${bob}','${alice}')`,
    ],
    [
      "was blocked by the sender",
      `insert into public.blocked_users values('${alice}','${bob}')`,
    ],
  ])("sends nothing when the recipient %s", async (_name, setup) => {
    await receipt(alice, bob);
    await db.exec(setup);
    expect(await claim(alice)).toEqual([]);
  });
  it("sends nothing for a private sender or a stale receipt", async () => {
    await receipt(alice, bob);
    await db.query(
      "update public.profiles set is_public=false,discoverable=false where id=$1",
      [alice],
    );
    expect(await claim(alice)).toEqual([]);
    await db.query("delete from public.connection_receipts");
    await db.query("update public.profiles set is_public=true where id=$1", [
      alice,
    ]);
    await receipt(alice, bob, "2 hours");
    expect(await claim(alice)).toEqual([]);
  });
  it("is not callable by signed-in clients", async () => {
    await receipt(alice, bob);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      alice,
    ]);
    await db.exec("set role authenticated");
    await expect(claim(alice)).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
});
