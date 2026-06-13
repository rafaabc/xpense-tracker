import { test, expect } from "@playwright/test";

// TC-01-01: "Sign in with Google" button visible on landing page
// TC-01-02: Clicking button initiates Google OAuth consent flow

test.describe("Landing page — unauthenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("TC-01-01: sign-in button visible on landing page", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /sign in with google/i })
    ).toBeVisible();
  });

  test("TC-01-02: clicking sign-in button redirects to Google OAuth", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign in with google/i }).click();
    await page.waitForURL(/accounts\.google\.com/, { timeout: 10_000 });
    expect(page.url()).toContain("accounts.google.com");
  });
});
