import { chromium } from "../frontend/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";

const output = "../docs/images";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  recordVideo: { dir: "/tmp/voting-video", size: { width: 1100, height: 850 } },
});
const page = await context.newPage();

// Use an unlocked local Anvil account for the demo only. No real wallet or funds are used.
await page.addInitScript(() => {
  const account = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  window.ethereum = {
    isMetaMask: true,
    request: async ({ method, params = [] }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [account];
      if (method === "eth_chainId") return "0x7a69";
      const response = await fetch("http://127.0.0.1:8545", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return result.result;
    },
    on: () => {},
    removeListener: () => {},
  };
});

try {
  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 60000 });
  await page.locator(".candidate-row").first().waitFor({ state: "visible", timeout: 60000 });
  await page.screenshot({ path: `${output}/blockchain-voting.png`, fullPage: true });
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page.getByText(/Wallet connected/).waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${output}/blockchain-voting-connected.png`, fullPage: true });
  await page.locator(".vote-button").first().click();
  await page.getByText(/Vote confirmed/).waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/blockchain-voting-result.png`, fullPage: true });
} finally {
  await context.close();
  await browser.close();
}
