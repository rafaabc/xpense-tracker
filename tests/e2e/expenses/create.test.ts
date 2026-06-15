import { test, expect } from "@playwright/test";
import {
  createTestSession,
  deleteTestUser,
  seedCategory,
} from "../fixtures/auth";

// Smoke: US-10 create-expense happy path (TC-10-01→10)
// Verifies the full Next.js RSC + server action + DB pipeline end-to-end.
// Lower-layer unit/mocked-integration tests cover per-field validation in depth.

test.describe("Create expense — smoke (US-10)", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;

    // Seed a group + subcategory so the expense form has an option to select
    await seedCategory(userId);

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

  test("TC-10-01: fill expense form, save, row appears in list", async ({
    page,
  }) => {
    await page.goto("/expenses");

    // Open the add-expense form
    await page.getByRole("button", { name: /add expense/i }).click();

    // Fill in the amount
    await page.getByLabel(/amount/i).fill("150.00");

    // Select the seeded subcategory
    await page
      .getByLabel(/subcategory/i)
      .selectOption({ label: "E2E Subcategory" });

    // Date defaults to today — leave it

    // Save
    await page.getByRole("button", { name: /^save$/i }).click();

    // The expense row should appear in the list
    await expect(page.getByText("E2E Group")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("E2E Subcategory")).toBeVisible();
  });
});
