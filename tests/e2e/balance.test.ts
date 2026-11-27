import { test, expect } from "@playwright/test";
import {
  createTestSession,
  deleteTestUser,
  seedCategory,
  seedPerson,
  seedRecurringTemplate,
} from "./fixtures/auth";

// US-19 / US-20: split expenses entered in the app show up in the monthly balance.

test.use({ viewport: { width: 360, height: 640 } });

test.describe("Monthly balance (US-20)", () => {
  let userId: string;
  let subcategoryId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;

    await seedPerson(userId, "Rafa", { isSelf: true, defaultShareBps: 5000 });
    await seedPerson(userId, "Ana", { defaultShareBps: 5000 });
    ({ subcategoryId } = await seedCategory(userId));

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

  test("TC-E2E-01: rent paid by the partner shows what I owe", async ({ page }) => {
    await page.goto("/expenses");

    for (const [amount, payer] of [["10000", "Ana"], ["3500", "Rafa"]]) {
      await page.getByRole("button", { name: "Add expense" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Amount").fill(amount);
      await dialog.getByLabel("Subcategory").selectOption({ label: "E2E Subcategory" });
      await dialog.getByLabel("Paid by").selectOption({ label: payer });
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog).toHaveCount(0, { timeout: 10000 });
    }

    await page.getByRole("link", { name: "Balance" }).filter({ visible: true }).click();

    const transfers = page.getByRole("list", { name: "Transfers" });
    await expect(transfers).toContainText(/You pay Ana\s+kr.3,250\.00/, { timeout: 10000 });
  });

  test("TC-E2E-03: moving an existing rent template to my partner updates this month", async ({ page }) => {
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
    await seedRecurringTemplate(userId, subcategoryId, "10000.00", monthStart);

    // The catch-up generates this month's rent as a personal expense of mine
    await page.goto("/balance");
    await expect(page.getByText("All settled for this month")).toBeVisible({ timeout: 10000 });

    await page.goto("/recurring");
    await page.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Paid by").selectOption({ label: "Ana" });
    await dialog.getByRole("radio", { name: "Split" }).check();
    await dialog.getByRole("checkbox", { name: "Also apply to expenses already generated this month" }).check();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByText("Paid by Ana")).toBeVisible({ timeout: 10000 });

    await page.goto("/balance");
    await expect(page.getByRole("list", { name: "Transfers" })).toContainText(
      /You pay Ana\s+kr.5,000\.00/,
      { timeout: 10000 },
    );
  });

  test("TC-E2E-02: changing the payer from the list updates the balance", async ({ page }) => {
    await page.goto("/expenses");
    await page.getByRole("button", { name: "Add expense" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Amount").fill("200");
    await dialog.getByLabel("Subcategory").selectOption({ label: "E2E Subcategory" });
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10000 });

    await page.goto("/balance");
    const transfers = page.getByRole("list", { name: "Transfers" });
    await expect(transfers).toContainText(/Ana pays you\s+kr.100\.00/, { timeout: 10000 });

    await page.goto("/expenses");
    await page.getByRole("button", { name: "Edit" }).click();
    await dialog.getByLabel("Paid by").selectOption({ label: "Ana" });
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10000 });

    await page.goto("/balance");
    await expect(transfers).toContainText(/You pay Ana\s+kr.100\.00/, { timeout: 10000 });
  });

  test("all navigation tabs fit on a phone", async ({ page }) => {
    await page.goto("/balance");

    for (const name of ["Expenses", "Categories", "Recurring", "Balance", "Summary", "Settings"]) {
      const box = await page.getByRole("link", { name }).filter({ visible: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    }
  });
});

test.describe("Add a partner and settle up (US-16 to US-20)", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const session = await createTestSession();
    userId = session.userId;
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

  test("TC-E2E-01: from adding a partner to knowing what I owe", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("New person name").fill("Ana");
    await page.getByRole("button", { name: "Add person" }).click();
    // The default split appears once there are two people
    await page.getByLabel("E2E Test User percentage").fill("50", { timeout: 10000 });
    await page.getByLabel("Ana percentage").fill("50");
    await page.getByRole("button", { name: "Save split" }).click();
    await expect(page.getByText("Default split saved")).toBeVisible({ timeout: 10000 });

    await page.goto("/expenses");
    for (const [amount, payer] of [["8000", "Ana"], ["1000", "E2E Test User"]]) {
      await page.getByRole("button", { name: "Add expense" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Amount").fill(amount);
      await dialog.getByLabel("Subcategory").selectOption({ label: "E2E Subcategory" });
      await dialog.getByLabel("Paid by").selectOption({ label: payer });
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog).toHaveCount(0, { timeout: 10000 });
    }

    await page.goto("/balance");
    await expect(page.getByRole("list", { name: "Transfers" })).toContainText(
      /You pay Ana\s+kr.3,500\.00/,
      { timeout: 10000 },
    );
  });
});
