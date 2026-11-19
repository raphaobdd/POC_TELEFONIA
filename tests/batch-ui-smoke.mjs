import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, acceptDownloads: true, reducedMotion: "reduce" });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });
  const picker = page.locator("input[type=file]");
  assert.equal(await picker.getAttribute("multiple"), "");
  await picker.setInputFiles({ name: "primeira.txt", mimeType: "text/plain", buffer: Buffer.from("010Dprimeiro\n110Dlinha") });
  await page.getByText("1 arquivo selecionado").waitFor();
  await picker.setInputFiles({ name: "segunda.txt", mimeType: "text/plain", buffer: Buffer.from("010Dsegundo\n999Ddesconhecido") });
  await page.getByText("2 arquivos selecionados").waitFor();
  await page.getByRole("button", { name: "Remover segunda.txt" }).click();
  await page.getByText("1 arquivo selecionado").waitFor();
  await page.locator(".border-dashed").evaluate((target) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["010Dsegundo\n999Ddesconhecido"], "segunda.txt", { type: "text/plain" }));
    target.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
  });
  await page.getByText("2 arquivos selecionados").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole("button", { name: /Converter 2 arquivos/ }).click();
  await page.getByRole("heading", { name: "Excel consolidado pronto" }).waitFor();
  await page.getByRole("heading", { name: "Prévia da planilha demonstrativa" }).waitFor();
  await page.getByRole("cell", { name: "R$ 35.581,24" }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar Excel consolidado/ }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "FechamentoMensal_RIP_Vencimento_2026-04.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(readFileSync(await download.path()));
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Fechamento Mensal"]);
  assert.equal(workbook.getWorksheet("Fechamento Mensal").getCell("B46").value, 35581.24);
  console.log("Navegador: dois TXTs acionaram o fluxo e geraram o Excel demonstrativo fixo");
} finally { await browser.close(); }
