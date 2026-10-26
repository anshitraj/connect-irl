// Local-only Supabase HTTP fixture. Real RLS/trigger authorization is tested
// separately against the actual PostgreSQL migrations in tests/database/.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
const users = new Map();
const profiles = new Map();
const contacts = new Map();
const preferences = new Map();
const receipts = [];
const owner = "11111111-1111-4111-8111-111111111111";
const builder = "22222222-2222-4222-8222-222222222222";
function profile(id, name, username) {
  return {
    id,
    username,
    name,
    headline: "Building useful things",
    bio: "",
    role: "Developer",
    organization: "",
    city: "",
    avatar: "",
    tags: [],
    lookingFor: [],
    project: "",
    links: [],
    public: true,
    discoverable: false,
  };
}
function user(id, email) {
  return {
    id,
    email,
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
  };
}
function reset() {
  users.clear();
  profiles.clear();
  contacts.clear();
  preferences.clear();
  receipts.length = 0;
  users.set(owner, user(owner, "priya@example.com"));
  users.set(builder, user(builder, "asha@example.com"));
  profiles.set(owner, profile(owner, "Priya Shah", "priya-shah"));
  profiles.set(builder, profile(builder, "Asha Rao", "asha-rao"));
}
reset();
const base64 = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
function session(person) {
  const access_token = `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ sub: person.id, email: person.email, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}.fixture-signature`;
  return {
    access_token,
    refresh_token: `fixture-${person.id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: person,
  };
}
function actor(request) {
  try {
    return JSON.parse(
      Buffer.from(
        request.headers.authorization?.split(" ")[1].split(".")[1] || "",
        "base64url",
      ).toString(),
    ).sub;
  } catch {
    return null;
  }
}
createServer(async (request, response) => {
  response.setHeader(
    "Access-Control-Allow-Origin",
    request.headers.origin || "*",
  );
  response.setHeader(
    "Access-Control-Allow-Headers",
    request.headers["access-control-request-headers"] ||
      "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile,x-retry-count",
  );
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS,PATCH,DELETE",
  );
  response.setHeader("Content-Type", "application/json");
  const send = (body, status = 200) => {
    response.statusCode = status;
    response.end(JSON.stringify(body));
  };
  if (request.method === "OPTIONS") return send({});
  const url = new URL(request.url, "http://127.0.0.1:4401");
  let text = "";
  for await (const part of request) text += part;
  const body = text ? JSON.parse(text) : {};
  if (url.pathname === "/_test/reset") {
    reset();
    return send({ reset: true });
  }
  if (url.pathname === "/health") return send({ ready: true });
  if (url.pathname === "/auth/v1/otp") return send({});
  if (url.pathname === "/auth/v1/verify") {
    if (body.token !== "123456")
      return send(
        { msg: "Token has expired or is invalid", code: "otp_expired" },
        403,
      );
    let person = [...users.values()].find((item) => item.email === body.email);
    if (!person) {
      person = user(randomUUID(), body.email);
      users.set(person.id, person);
    }
    return send(session(person));
  }
  const id = actor(request);
  if (url.pathname === "/auth/v1/user")
    return users.has(id)
      ? send(users.get(id))
      : send({ msg: "Invalid token" }, 401);
  if (url.pathname === "/auth/v1/logout") return send({});
  if (url.pathname === "/auth/v1/token") {
    const person = users.get(body.refresh_token?.replace("fixture-", ""));
    return person ? send(session(person)) : send({ msg: "Invalid token" }, 401);
  }
  if (url.pathname === "/rest/v1/rpc/check_rate_limit")
    return send(Boolean(id));
  if (url.pathname === "/rest/v1/rpc/mark_connection_receipt_read") {
    const item = receipts.find(
      (item) => item.id === body.target && item.recipient_id === id,
    );
    if (item) item.read_at = new Date().toISOString();
    return send(null);
  }
  if (url.pathname === "/rest/v1/rpc/sync_workspace") {
    if (!id) return send({ message: "Unauthorized" }, 401);
    const data = body.payload;
    if (data.profile) profiles.set(id, data.profile);
    for (const contact of data.contacts || []) {
      contacts.set(contact.id, { id: contact.id, owner_id: id, data: contact });
      if (
        contact.profileId &&
        contact.profileId !== id &&
        profiles.get(id)?.public &&
        profiles.get(contact.profileId)?.public &&
        !receipts.some(
          (item) =>
            item.actor_id === id && item.recipient_id === contact.profileId,
        )
      )
        receipts.unshift({
          id: randomUUID(),
          actor_id: id,
          recipient_id: contact.profileId,
          created_at: new Date().toISOString(),
          read_at: null,
        });
    }
    if (data.preferencesChanged) preferences.set(id, data);
    return send({});
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.split("/").pop();
    let rows =
      table === "profiles"
        ? [...profiles.values()].map((data) => ({
            id: data.id,
            username: data.username,
            is_public: data.public,
            data,
          }))
        : table === "saved_contacts"
          ? [...contacts.values()].filter((item) => item.owner_id === id)
          : table === "profile_preferences"
            ? preferences.has(id)
              ? [{ owner_id: id, data: preferences.get(id) }]
              : []
            : table === "connection_receipts"
              ? receipts.filter((item) => item.recipient_id === id)
              : [];
    for (const [key, filter] of url.searchParams) {
      if (filter.startsWith("eq."))
        rows = rows.filter((row) => String(row[key]) === filter.slice(3));
      if (filter.startsWith("in.(")) {
        const values = filter.slice(4, -1).replaceAll('"', "").split(",");
        rows = rows.filter((row) => values.includes(String(row[key])));
      }
    }
    if (request.headers.accept?.includes("vnd.pgrst.object"))
      return rows.length ? send(rows[0]) : send(null);
    return send(rows);
  }
  return send({ message: "Fixture endpoint not implemented" }, 404);
}).listen(4401, "127.0.0.1", () =>
  process.stdout.write("Local auth fixture ready on 4401\n"),
);
