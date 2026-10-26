import { expect, type Page } from "@playwright/test";
// The auth fixture accepts "fixture_" + base64url(email) as a valid one-time token hash.
export const linkFor = (email: string) =>
  `/auth/confirm?token_hash=fixture_${Buffer.from(email).toString("base64url")}`;
export async function requestLink(page: Page, email: string) {
  await page.goto("/login");
  await page.getByText("Other ways to sign in", { exact: true }).click();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Email me a sign-in link", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toBeVisible();
  // There is nothing to type: the link in the email signs the person in.
  await expect(page.getByLabel("Verification code")).toHaveCount(0);
}
// Opening the emailed link is a plain navigation, like tapping it in a mail app.
export async function openLink(page: Page, email: string) {
  await page.goto(linkFor(email));
  await expect(page).toHaveURL(/\/app(?:\/profile)?$/, { timeout: 30000 });
}
