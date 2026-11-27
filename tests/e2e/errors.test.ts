import { test, expect } from "@playwright/test";
import { createTestSession, deleteTestUser, seedPerson } from "./fixtures/auth";

// Server errors must reach the user with their own message, in production too.

test.describe("Server error messages", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;
    await seedPerson(userId, "Rafa", { isSelf: true, defaultShareBps: 10000 });
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

  test("TC-16-03: a duplicate person name is explained", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("New person name").fill("rafa");
    await page.getByRole("button", { name: "Add person" }).click();
    await expect(page.getByText("A person with this name already exists")).toBeVisible({ timeout: 10000 });
  });
});
