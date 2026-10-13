import { test, expect } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
test("live dashboard, real deposit QR, clipboard, refresh and disabled withdraw", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/wallet");
  expect(response.ok()).toBe(true);
  const wallet = await response.json();
  const b = await request.get("/api/wallet/balance");
  expect(b.ok()).toBe(true);
  const balance = await b.json();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little space for your SOL." }),
  ).toBeVisible();
  await expect(page.locator("header .network")).toHaveText("SOLANA DEVNET");
  await expect(page.locator(".balance-number")).toContainText(
    balance.balanceSol,
  );
  await page.getByRole("button", { name: "Add Funds", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".full-address")).toHaveText(wallet.address);
  const png = PNG.sync.read(await dialog.locator(".qr").screenshot());
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(code?.data).toBe(wallet.address);
  await dialog
    .getByRole("button", { name: "Copy Address", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Address copied" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    wallet.address,
  );
  const fresh = page.waitForResponse(
    (r) => r.url().endsWith("/api/wallet/balance") && r.ok(),
  );
  await dialog.getByRole("button", { name: "Refresh deposit balance" }).click();
  const refreshed = await (await fresh).json();
  await expect(dialog.locator(".modal-balance")).toContainText(
    refreshed.balanceSol,
  );
  await page.screenshot({
    path: "test-results/deposit-desktop.png",
  });
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
  });
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByLabel("DESTINATION ADDRESS")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Withdraw · Coming next" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Withdrawal broadcasting is not enabled. This form will never send funds.",
    ),
  ).toBeVisible();
});
test("mobile dashboard and deposit do not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".balance-number")).toContainText("SOL");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
  });
  await page.getByRole("button", { name: "Add Funds", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".qr")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("RPC failure displays unavailable balance and honest activity error", async ({
  page,
}) => {
  await page.route("**/api/wallet/balance", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Solana Devnet is unavailable." },
      }),
    }),
  );
  await page.route("**/api/wallet/transactions", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Solana Devnet is unavailable." },
      }),
    }),
  );
  await page.goto("/");
  await expect(page.locator(".balance-number")).toHaveText("Unavailable");
  await expect(
    page.getByRole("heading", { name: "Activity is unavailable" }),
  ).toBeVisible();
  await expect(page.locator(".error")).toContainText(
    "Solana Devnet is unavailable.",
  );
});

test("Vercel plain-text failure is readable without JSON parser errors", async ({
  page,
}) => {
  await page.route("**/api/wallet", (r) =>
    r.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "A server error has occurred\nFUNCTION_INVOCATION_FAILED",
    }),
  );
  await page.route("**/api/wallet/balance", (r) =>
    r.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "A server error has occurred\nFUNCTION_INVOCATION_FAILED",
    }),
  );
  await page.goto("/");
  await expect(page.locator(".error")).toContainText(
    "Wallet API unavailable (HTTP 500)",
  );
  await expect(page.locator(".address-short")).toHaveText("Wallet unavailable");
  await expect(
    page.getByRole("heading", { name: "Devnet connection unverified" }),
  ).toBeVisible();
  await expect(page.locator(".error")).not.toContainText("Unexpected token");
});
