import { test, expect } from "@playwright/test";
import { createTestSession, deleteTestUser } from "../fixtures/auth";

// TC-01-04: After auth, user lands on Expenses (Dashboard removed)
// TC-01-05: Expenses empty-state hint for new account
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

  test("TC-01-04: authenticated user lands on expenses", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/expenses");
  });

  test("TC-01-04: legacy /dashboard redirects to expenses", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/expenses");
  });

  test("TC-01-05: expenses empty for new account (no expenses/groups)", async ({
    page,
  }) => {
    await page.goto("/expenses");
    await expect(
      page.getByText(/add groups and subcategories to get started/i)
    ).toBeVisible();
  });

  test("TC-02-05: sign out button visible in header", async ({ page }) => {
    await page.goto("/expenses");
    await expect(
      page.getByRole("button", { name: /sign out/i })
    ).toBeVisible();
  });

  test("TC-02-05: sign out redirects to landing page", async ({ page }) => {
    await page.goto("/expenses");
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL("/");
    await expect(
      page.getByRole("button", { name: /sign in with google/i })
    ).toBeVisible();
  });
});
