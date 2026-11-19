import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true, reducedMotion: "reduce" });
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByRole("heading", { name: /Sua planilha de faturamento/ }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Baixar fechamento em Excel" }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "FechamentoMensal_RIP_Vencimento_2026-04.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(readFileSync(await download.path()));
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Fechamento Mensal"]);
    assert.equal(workbook.worksheets[0].getCell("B46").value, 35581.24);
    await page.close();
  }
} finally { await browser.close(); }
