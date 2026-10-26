import type { Instrumentation } from "next";
// Replace this adapter with your monitoring provider. Do not include private
// meeting notes, request bodies, cookies, or identity data in error telemetry.
export const onRequestError: Instrumentation.onRequestError = (
  error,
  _request,
  context,
) => {
  console.error("[Connect IRL] Request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    digest:
      error && typeof error === "object" && "digest" in error
        ? String(error.digest)
        : undefined,
    route: context.routePath,
    router: context.routerKind,
  });
};
