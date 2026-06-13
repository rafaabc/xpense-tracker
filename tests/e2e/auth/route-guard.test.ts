import { test, expect } from "@playwright/test";

// TC-02-10: Global redirect-to-login enforced across all protected routes

const protectedRoutes = [
  "/dashboard",
  "/categories",
  "/settings",
  "/groups/123",
  "/groups/123/subcategories",
];

test.describe("Route guard — unauthenticated", () => {
  for (const route of protectedRoutes) {
    test(`TC-02-10: ${route} redirects unauthenticated user to landing`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page).toHaveURL("/");
      await expect(
        page.getByRole("button", { name: /sign in with google/i })
      ).toBeVisible();
    });
  }
});
