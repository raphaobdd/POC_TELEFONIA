import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { parseClaroFebraban } from "../src/lib/parsers/claro-febraban.ts";
import { parseVivo } from "../src/lib/parsers/vivo.ts";
import { generateConsolidatedWorkbook, summarizeInvoices } from "../src/lib/excel/generate-consolidated-workbook.ts";
import { closingReference } from "../src/lib/excel/fechamento-mensal-abril-2026.js";

const path = process.env.CLARO_REFERENCE_TXT ?? resolve("..", "fwdfaturaskaefergestodetelefonia", "874990746_111360636_2026_08_53_Febraban.txt");
const available = existsSync(path);
const content = available ? new TextDecoder("windows-1252").decode(readFileSync(path)) : "";

test("sintetiza gastos por linha, cobrança sem linha e total reconciliado", { skip: !available }, async () => {
  const invoice = parseClaroFebraban(content);
  const source = [{ name: "fatura.txt", invoice }];
  const summary = summarizeInvoices(source);
  assert.equal(summary.fileCount, 1);
  assert.equal(summary.recordCount, 3209);
  assert.equal(summary.uniqueLines, 56);
  assert.equal(summary.lineSpendingCents, 94640);
  assert.equal(summary.unassignedCents, 42300);
  assert.equal(summary.totalCents, 136940);
  assert.equal(summary.fineCount, 0);
  assert.equal(summary.fineCents, 0);
  const { buffer } = await generateConsolidatedWorkbook(source);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.equal(workbook.worksheets.length, 1);
  const closing = workbook.getWorksheet("Fechamento Mensal");
  assert.equal(closing.getCell("A1").value, "Operadora");
  assert.equal(closing.getCell("B1").value, "VIVO - MÓVEL");
  assert.equal(closing.getCell("A3").value, "Rótulos de Linha");
  assert.equal(closing.getCell("B3").value, "Soma de Valor");
  const closingRows = closing.getColumn(1).values;
  const totalRow = closingRows.indexOf("Total Geral");
  assert.ok(totalRow > 3);
  assert.equal(closing.getRow(totalRow).getCell(2).value, 35581.24);
  assert.equal(closingRows.includes("Multa"), true);
  assert.equal(closing.getCell("B7").value, -4782);
  assert.equal(closing.rowCount, closingReference.length);
  closingReference.forEach(([label, rawValue], index) => {
    const row = closing.getRow(index + 1);
    assert.equal(row.getCell(1).value, label || null);
    const expected = index === 0 || index === 2 ? rawValue : rawValue ? Number(rawValue.replaceAll(".", "").replace(",", ".")) : null;
    assert.equal(row.getCell(2).value, expected);
  });
});

test("identifica multa apenas por descrição explícita sem somá-la de novo ao total", { skip: !available }, () => {
  const lines = content.split("\r\n");
  const original = lines[2];
  lines[2] = `${original.slice(0, 217)}${"Multa contratual".padEnd(40)}${original.slice(257)}`;
  const invoice = parseClaroFebraban(lines.join("\r\n"));
  const summary = summarizeInvoices([{ name: "fatura-com-multa.txt", invoice }]);
  assert.equal(summary.fineCount, 1);
  assert.equal(summary.fineCents, 700);
  assert.equal(summary.totalCents, 136940);
});

test("não exibe total consolidado quando há fatura sem valor mapeado", { skip: !available }, () => {
  const summary = summarizeInvoices([
    { name: "claro.txt", invoice: parseClaroFebraban(content) },
    { name: "vivo.txt", invoice: parseVivo("010Dsem-layout-confirmado") },
  ]);
  assert.equal(summary.totalCents, null);
  assert.equal(summary.lineSpendingCents, null);
  assert.equal(summary.fineCents, null);
});
