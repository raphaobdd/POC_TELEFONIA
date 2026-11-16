import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { parseClaroFebraban, isClaroFebraban } from "../src/lib/parsers/claro-febraban.ts";
import { generateClaroWorkbook } from "../src/lib/excel/generate-claro-workbook.ts";

const referencePath = process.env.CLARO_REFERENCE_TXT ?? resolve("..", "fwdfaturaskaefergestodetelefonia", "874990746_111360636_2026_08_53_Febraban.txt");
const available = existsSync(referencePath);
const content = available ? new TextDecoder("windows-1252").decode(readFileSync(referencePath)) : "";

test("reconhece o layout e preserva os 3.209 registros de referência", { skip: !available }, () => {
  assert.equal(isClaroFebraban(content), true);
  const invoice = parseClaroFebraban(content);
  assert.equal(invoice.operator, "CLARO S/A");
  assert.equal(invoice.records.length, 3209);
  assert.deepEqual(Object.fromEntries(["0", "1", "3", "4", "9"].map((type) => [type, invoice.records.filter((record) => record.code === type).length])),
    { "0": 1, "1": 57, "3": 157, "4": 2993, "9": 1 });
  assert.equal(invoice.records.every((record) => record.validLength && record.raw.length === 350), true);
  assert.equal(invoice.lineCount, 56);
  assert.equal(invoice.records.filter((record) => record.code === "1" && record.phone === null).length, 1);
  assert.equal(invoice.records.filter((record) => ["3", "4"].includes(record.code) && record.summaryRecord === null).length, 0);
  assert.equal(invoice.records[2].description, "Gestão e Autosserviço");
  assert.equal(invoice.records[0].raw, content.split("\r\n")[0]);
  assert.equal(invoice.records.at(-1).raw, content.split("\r\n").at(-2));
});

test("reconcilia valores sem somar resumo e detalhe duas vezes", { skip: !available }, () => {
  const invoice = parseClaroFebraban(content);
  assert.equal(invoice.reconciled, true);
  assert.equal(invoice.totalCents, 136940);
  assert.equal(invoice.summaryTotalCents, 136940);
  assert.equal(invoice.detailTotalCents, 136940);
  assert.equal(invoice.controlTotalCents, 136940);
  assert.equal(invoice.interpretation, "partial");
});

test("gera XLSX íntegro com cinco abas e rastreabilidade", { skip: !available }, async () => {
  const invoice = parseClaroFebraban(content);
  const bytes = await generateClaroWorkbook(invoice);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Resumo da Fatura", "Linhas Telefônicas", "Serviços e Cobranças", "Detalhamento", "Registros Brutos"]);
  assert.equal(workbook.getWorksheet("Registros Brutos").rowCount, 3210);
  assert.equal(workbook.getWorksheet("Linhas Telefônicas").rowCount, 58);
  assert.equal(workbook.getWorksheet("Serviços e Cobranças").rowCount, 2994);
  assert.equal(workbook.getWorksheet("Detalhamento").rowCount, 158);
  assert.equal(workbook.getWorksheet("Registros Brutos").getRow(3210).getCell(5).value, invoice.records.at(-1).raw);
  assert.equal(workbook.getWorksheet("Resumo da Fatura").getRow(2).getCell(16).value, 1369.4);
});

test("avisa divergência e conserva um registro fora do tamanho esperado", { skip: !available }, () => {
  const altered = content.replace(/\r\n/, "X\r\n");
  const invoice = parseClaroFebraban(altered);
  assert.equal(invoice.records.length, 3209);
  assert.equal(invoice.records[0].raw.length, 351);
  assert.equal(invoice.reconciled, false);
  assert.equal(invoice.totalCents, null);
  assert.match(invoice.warnings.join(" "), /350 caracteres/);
});

test("bloqueia total reconciliado quando uma cobrança diverge do resumo", { skip: !available }, () => {
  const altered = content.replace("+0000000000700", "+0000000000701");
  const invoice = parseClaroFebraban(altered);
  assert.equal(invoice.records.length, 3209);
  assert.equal(invoice.reconciled, false);
  assert.equal(invoice.totalCents, null);
  assert.equal(invoice.detailTotalCents, 136941);
  assert.match(invoice.warnings.join(" "), /divergem/);
});
