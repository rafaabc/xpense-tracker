import { test, expect } from "@playwright/test";
import {
  createTestSession,
  deleteTestUser,
  seedCategory,
  seedRecurringTemplate,
} from "../fixtures/auth";

// US-08: edit / delete a recurring expense (e.g. subscription price rise).
// Regression: on phone widths the Edit/Delete buttons were clipped off-screen.

test.use({ viewport: { width: 390, height: 844 } });

test.describe("Manage recurring expense — mobile (US-08)", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;

    const { subcategoryId } = await seedCategory(userId);
    await seedRecurringTemplate(userId, subcategoryId, "99.00");

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
    await page.goto("/recurring");

    for (const name of ["Edit", "Delete"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
  });

  test("edit amount and save shows the new amount", async ({ page }) => {
    await page.goto("/recurring");
    await expect(page.getByText(/99\.00/)).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel(/amount/i).fill("119,00");
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(/119\.00/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/99\.00/)).toHaveCount(0);
  });

  test("delete removes the template", async ({ page }) => {
    await page.goto("/recurring");

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: /delete template/i }).click();

    await expect(page.getByText(/no recurring expenses/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
