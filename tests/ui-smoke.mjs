import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true, reducedMotion: "reduce" });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: /Dados de telefonia/ }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Converter para Excel/ }).isDisabled(), true);
    assert.equal(await page.locator("img[alt='KAEFER RIP Serviços Industriais']").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.getByRole("button", { name: "Ativar tema claro" }).click();
    await page.locator("html.light").waitFor();
    assert.equal(await page.locator("main").evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(247, 248, 248)");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("html.light").waitFor();
    await page.getByRole("button", { name: "Ativar tema escuro" }).click();
    await page.locator("html.dark").waitFor();
    await page.getByRole("button", { name: "Ativar tema claro" }).click();
    await page.locator("html.light").waitFor();
    if (width === 390) {
      await page.locator("input[type=file]").setInputFiles({ name: "invalido.csv", mimeType: "text/csv", buffer: Buffer.from("abc") });
      await page.getByRole("alert").getByText(/extensão/).waitFor();
    }
    await page.locator("input[type=file]").setInputFiles({ name: "fatura.txt", mimeType: "text/plain", buffer: Buffer.from("010Dabc\n110D00001234\n999Doutro") });
    await page.getByText("fatura.txt").waitFor();
    assert.equal(await page.getByRole("button", { name: /Converter para Excel/ }).isEnabled(), true);
    await page.getByRole("button", { name: /Converter para Excel/ }).click();
    await page.getByRole("heading", { name: "Excel consolidado pronto" }).waitFor();
    await page.getByText("3", { exact: true }).first().waitFor();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Baixar Excel consolidado/ }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "FechamentoMensal_RIP_Vencimento_2026-04.xlsx");
    await page.screenshot({ path: `${process.env.TEMP ?? "."}/rip-telefonia-${width}.png`, fullPage: true });
    console.log(`UI ${width}px: upload, conversão, download e responsividade OK`);
    await page.close();
  }
} finally { await browser.close(); }
