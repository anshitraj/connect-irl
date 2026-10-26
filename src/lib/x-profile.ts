import { normalizeXHandle } from "./onboarding";
type XPhoto = { handle: string; avatar: string };
const photos = new Map<string, { value: XPhoto; expires: number }>();
export class PhotoLookupError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function lookupXPhoto(
  input: string,
  signal?: AbortSignal,
): Promise<XPhoto> {
  const handle = normalizeXHandle(input);
  if (!handle)
    throw new PhotoLookupError("Enter a valid X / Twitter username.", 400);
  const key = handle.toLowerCase();
  const token = process.env.X_BEARER_TOKEN;
  if (!token)
    throw new PhotoLookupError(
      "X photo lookup isn’t configured yet. You can continue without a photo.",
      503,
    );
  const cached = photos.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const timeout = AbortSignal.timeout(5000);
  const response = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=profile_image_url`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: "no-store",
      redirect: "error",
    },
  );
  if (response.status === 429)
    throw new PhotoLookupError(
      "X photo lookup is busy. Try again later; you can continue now.",
      429,
    );
  if (response.status === 401 || response.status === 403)
    throw new PhotoLookupError(
      "X photo lookup is unavailable. You can add your photo later.",
      503,
    );
  if (!response.ok)
    throw new PhotoLookupError(
      "That X profile photo couldn’t be found. Check the handle or continue.",
      response.status === 404 ? 404 : 502,
    );
  const text = await response.text();
  if (text.length > 65536)
    throw new PhotoLookupError(
      "X photo lookup returned an unreadable response.",
    );
  const result = JSON.parse(text) as {
    data?: { username?: unknown; profile_image_url?: unknown };
  };
  const data = result.data;
  if (
    typeof data?.username !== "string" ||
    data.username.toLowerCase() !== key ||
    typeof data.profile_image_url !== "string"
  )
    throw new PhotoLookupError("That X profile photo isn’t available.", 404);
  const image = new URL(data.profile_image_url);
  if (
    image.protocol !== "https:" ||
    image.hostname !== "pbs.twimg.com" ||
    image.username ||
    image.password ||
    image.port ||
    !image.pathname.startsWith("/profile_images/") ||
    image.href.length > 2048
  )
    throw new PhotoLookupError("That X profile photo isn’t available.");
  const value = { handle: data.username, avatar: image.href };
  if (photos.size >= 128) photos.delete(photos.keys().next().value!);
  photos.set(key, { value, expires: Date.now() + 10 * 60 * 1000 });
  return value;
}
