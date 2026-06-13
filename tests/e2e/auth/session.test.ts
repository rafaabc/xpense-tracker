import { test, expect } from "@playwright/test";
import { createTestSession, deleteTestUser } from "../fixtures/auth";

// TC-01-04: After auth, user lands on Dashboard
// TC-01-05: Dashboard empty for new account
// TC-02-04: Dashboard shows user's own data
// TC-02-05: Sign out action available

test.describe("Authenticated session", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;

    await context.addCookies([
      {
        name: "authjs.session-token",
        value: session.sessionToken,
        url: "http://localhost:3000",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        expires: Math.floor(session.expires.getTime() / 1000),
      },
    ]);
  });

  test.afterEach(async () => {
    await deleteTestUser(userId);
  });

  test("TC-01-04: authenticated user lands on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("TC-01-05: dashboard empty for new account (no expenses/groups)", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText(/add groups and subcategories to get started/i)
    ).toBeVisible();
  });

  test("TC-02-04: dashboard shows authenticated user's name", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/e2e test user/i)).toBeVisible();
  });

  test("TC-02-05: sign out button visible in header", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: /sign out/i })
    ).toBeVisible();
  });

  test("TC-02-05: sign out redirects to landing page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL("/");
    await expect(
      page.getByRole("button", { name: /sign in with google/i })
    ).toBeVisible();
  });
});
