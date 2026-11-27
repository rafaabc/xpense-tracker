import { test, expect } from "@playwright/test";
import {
  createTestSession,
  deleteTestUser,
  seedCategory,
  seedExpense,
  seedPerson,
} from "../fixtures/auth";

// Regression: on phone widths the row actions were clipped off-screen and the
// form validation error appeared outside the visible part of the dialog.

test.use({ viewport: { width: 360, height: 640 } });

test.describe("Expenses — mobile (US-12, US-19)", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;

    await seedPerson(userId, "E2E Test User", { isSelf: true, defaultShareBps: 5000 });
    await seedPerson(userId, "Ana", { defaultShareBps: 5000 });
    const { subcategoryId } = await seedCategory(userId);
    // Widest possible amount, the worst case for the row layout
    await seedExpense(userId, subcategoryId, "9999999999.99", new Date().toISOString().slice(0, 10));

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

  test("Edit and Delete buttons are inside the viewport", async ({ page }) => {
    await page.goto("/expenses");

    for (const name of ["Edit", "Delete"]) {
      const box = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    }
  });

  test("validation error is visible after pressing Save", async ({ page }) => {
    await page.goto("/expenses");
    await page.getByRole("button", { name: "Add expense" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "Split" }).check();
    await dialog.getByLabel("Amount").fill("10");
    await dialog.getByLabel("Subcategory").selectOption({ label: "E2E Subcategory" });
    await dialog.getByLabel("Ana percentage").fill("abc");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog.getByRole("alert")).toBeInViewport();
  });
});
