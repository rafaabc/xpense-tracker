import { test, expect } from "@playwright/test";
import {
  createTestSession,
  deleteTestUser,
  seedCategory,
  seedExpense,
} from "../fixtures/auth";

// Smoke: US-14 monthly summary happy path (TC-14-01/02/03)
// Verifies RSC data fetching + calcMonthlyBreakdown + MonthlySummary rendering end-to-end.

test.describe("Monthly summary — smoke (US-14)", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;

    // Seed a group, subcategory, and an expense for this month
    const { subcategoryId } = await seedCategory(userId);
    const today = new Date().toISOString().slice(0, 10);
    await seedExpense(userId, subcategoryId, "250.00", today);

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

  test("TC-14-01: monthly summary shows total spend for the current month", async ({
    page,
  }) => {
    // Navigate to summary with current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    await page.goto(`/summary?tab=monthly&month=${year}-${month}`);

    // The "Total" stat heading should be visible
    await expect(page.getByText(/total/i).first()).toBeVisible({
      timeout: 10000,
    });

    // The seeded amount (250) should appear somewhere on the page.
    // .first() because 250 renders in both the total stat and breakdown row.
    await expect(page.getByText(/250/).first()).toBeVisible();

    // The seeded group name should appear in the breakdown
    await expect(page.getByText("E2E Group")).toBeVisible();
  });
});
