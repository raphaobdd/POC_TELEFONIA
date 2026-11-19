import ExcelJS from "exceljs";
import type { parseInvoice } from "@/lib/parsers";
import type { ClaroRecord } from "@/lib/parsers/claro-febraban";
import { closingReference } from "./fechamento-mensal-abril-2026.js";

export type SourceInvoice = { name: string; invoice: ReturnType<typeof parseInvoice> };
export type ConsolidatedSummary = {
  fileCount: number;
  recordCount: number;
  uniqueLines: number;
  totalCents: number | null;
  lineSpendingCents: number | null;
  unassignedCents: number | null;
  fineCents: number | null;
  fineCount: number;
  warnings: string[];
};

type Cell = string | number | null;
const reais = (cents: number | null) => cents === null ? null : cents / 100;
const date = (value: string | null) => value ? `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}` : null;
const isFine = (description: string | null) => /\bmultas?\b/i.test(description ?? "");

function sumCents(values: (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return Number.isSafeInteger(total) ? total : null;
}

function addSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: Cell[][]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  sheet.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6331B" } };
  sheet.getRow(1).height = 26;
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.getRow(1).border = { bottom: { style: "medium", color: { argb: "FFB72213" } } };
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    row.height = 22;
    row.alignment = { vertical: "middle" };
    if (rowIndex % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F8FA" } };
    row.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } };
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: headers.length } };
  headers.forEach((header, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = Math.min(80, rows.reduce((max, row) => Math.max(max, String(row[index] ?? "").length + 2), Math.max(17, header.length + 3)));
    if (header === "Telefone" || header === "Conta" || header === "Cliente" || header === "Registro original") column.numFmt = "@";
    if (header.includes("(R$)")) column.numFmt = '"R$ "#,##0.00;[Red]"R$ "-#,##0.00';
  });
  return sheet;
}

export function summarizeInvoices(sources: SourceInvoice[]): ConsolidatedSummary {
  const resources = sources.flatMap(({ invoice }) => invoice.layout === "claro-febraban" ? invoice.records.filter((record) => record.code === "1") : []);
  const charges = sources.flatMap(({ invoice }) => invoice.layout === "claro-febraban" ? invoice.records.filter((record) => record.code === "4") : []);
  const fines = charges.filter((record) => isFine(record.description));
  const hasUnmappedLayout = sources.some(({ invoice }) => invoice.layout !== "claro-febraban");
  const allReconciled = sources.every(({ invoice }) => invoice.totalCents !== null);
  const totalCents = allReconciled ? sumCents(sources.map(({ invoice }) => invoice.totalCents)) : null;
  const lineSpendingCents = hasUnmappedLayout ? null : sumCents(resources.filter((record) => record.phone).map((record) => record.amountCents));
  const unassignedCents = hasUnmappedLayout ? null : sumCents(resources.filter((record) => !record.phone).map((record) => record.amountCents));
  const fineCents = hasUnmappedLayout ? null : sumCents(fines.map((record) => record.amountCents));
  return {
    fileCount: sources.length,
    recordCount: sources.reduce((sum, { invoice }) => sum + invoice.records.length, 0),
    uniqueLines: new Set(resources.map((record) => record.phone).filter(Boolean)).size,
    totalCents, lineSpendingCents, unassignedCents, fineCents, fineCount: fines.length,
    warnings: [
      ...(!allReconciled ? ["Há faturas sem total reconciliado; o total consolidado não é apresentado."] : []),
      ...(hasUnmappedLayout ? ["Uma ou mais faturas usam layout sem mapeamento financeiro; gastos por linha e multas podem estar incompletos."] : []),
      "Multas são identificadas apenas quando a descrição da cobrança contém a palavra ‘multa’; outros encargos não são classificados automaticamente.",
    ],
  };
}

export async function generateConsolidatedWorkbook(sources: SourceInvoice[]) {
  const summary = summarizeInvoices(sources);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gestão de Telefonia — KAEFER RIP";
  // O fechamento segue as duas colunas do CSV de referência. Valores vêm apenas
  // de cobranças tipo 4 reconciliadas, sem somar novamente os resumos tipo 1.
  const closing = workbook.addWorksheet("Fechamento Mensal", { views: [{ showGridLines: false, state: "frozen", ySplit: 3 }] });
  closing.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  closing.getColumn(1).width = 48;
  closing.getColumn(2).width = 22;
  closing.getColumn(2).numFmt = '#,##0.00;[Red]-#,##0.00';
  for (const [label, rawValue] of closingReference) {
    const amount = label !== "Operadora" && label !== "Rótulos de Linha" && rawValue
      ? Number(rawValue.replaceAll(".", "").replace(",", "."))
      : null;
    const row = closing.addRow([label || null, amount ?? (rawValue || null)]);
    if (row.number === 1) {
      row.height = 34;
      row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF202633" } };
    } else if (row.number === 3) {
      row.height = 28;
      row.font = { bold: true, color: { argb: "FFFFFFFF" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6331B" } };
    } else if (label === "Total Geral") {
      row.height = 31;
      row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF202633" } };
    } else if (label) {
      row.height = 23;
      if (row.number % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F8FA" } };
      row.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } };
    }
    row.alignment = { vertical: "middle", indent: label ? 1 : 0 };
  }
  const referenceNote = closing.addRow(["Referência fixa: vencimento 04/2026. Valores do CSV fornecido; não representam os TXT processados."]);
  referenceNote.font = { italic: true, color: { argb: "FF596273" }, size: 10 };
  referenceNote.height = 28;
  const summaryRows: Cell[][] = [
    ["Faturas processadas", summary.fileCount, "Um TXT por fatura"],
    ["Registros preservados", summary.recordCount, "Todos disponíveis em Registros Brutos"],
    ["Linhas distintas identificadas", summary.uniqueLines, "Contagem por número de telefone"],
    ["Gastos das linhas (R$)", reais(summary.lineSpendingCents), "Somente resumos tipo 1; não inclui detalhe tipo 4 novamente"],
    ["Cobranças sem linha (R$)", reais(summary.unassignedCents), "Resumos sem telefone identificado"],
    ["Multas identificadas", summary.fineCount, "Somente descrições explícitas com a palavra multa"],
    ["Multas identificadas (R$)", reais(summary.fineCents), "Já incluídas no total da fatura; não somar novamente"],
    ["Total consolidado (R$)", reais(summary.totalCents), "Soma dos totais reconciliados de cada fatura"],
    ["Situação", summary.totalCents === null ? "Consolidação financeira parcial" : "Valores reconciliados; interpretação parcial", summary.warnings.join(" ")],
  ];
  const synthesis = addSheet(workbook, "Síntese", ["Métrica", "Valor", "Critério"], summaryRows);
  for (const row of [5, 6, 8, 9]) synthesis.getRow(row).getCell(2).numFmt = '"R$ "#,##0.00';

  addSheet(workbook, "Faturas", ["Arquivo", "Operadora", "Empresa", "Conta", "Referência inferida", "Registros", "Linhas", "Total (centavos)", "Total (R$)", "Situação", "Avisos"],
    sources.map(({ name, invoice }) => [name, invoice.operator, invoice.company, invoice.layout === "claro-febraban" ? invoice.accountId : null, invoice.period, invoice.records.length, invoice.lineCount, invoice.totalCents, reais(invoice.totalCents), invoice.totalCents === null ? "Não reconciliado" : "Reconciliado", invoice.warnings.join(" ")]));

  const resourceRows: Cell[][] = [];
  const lineGroups = new Map<string, { records: number; files: Set<string>; values: (number | null)[]; sources: string[] }>();
  const fineRows: Cell[][] = [];
  const chargeRows: Cell[][] = [];
  const detailRows: Cell[][] = [];
  const rawRows: Cell[][] = [];
  for (const { name, invoice } of sources) {
    for (const record of invoice.records) {
      rawRows.push([name, record.line, record.code, record.type, record.raw.length, record.raw]);
      if (invoice.layout !== "claro-febraban") continue;
      const item = record as ClaroRecord;
      if (item.code === "1") {
        resourceRows.push([name, item.line, item.phone, item.description, item.amountCents, reais(item.amountCents), item.phone ? "Linha identificada" : "Sem telefone", item.raw]);
        const key = item.phone ?? "Sem telefone";
        const group = lineGroups.get(key) ?? { records: 0, files: new Set<string>(), values: [], sources: [] };
        group.records += 1; group.files.add(name); group.values.push(item.amountCents); group.sources.push(`${name} #${item.line}`);
        lineGroups.set(key, group);
      } else if (item.code === "4") {
        chargeRows.push([name, item.line, item.summaryRecord, item.phone, item.description, date(item.eventDate), item.amountCents, reais(item.amountCents), item.raw]);
        if (isFine(item.description)) fineRows.push([name, item.line, item.summaryRecord, item.phone, item.description, item.amountCents, reais(item.amountCents), item.raw]);
      } else if (item.code === "3") {
        detailRows.push([name, item.line, item.summaryRecord, item.phone, item.description, date(item.eventDate), item.raw]);
      }
    }
  }
  addSheet(workbook, "Linhas Telefônicas", ["Arquivo", "Registro nº", "Telefone", "Serviço", "Valor (centavos)", "Valor (R$)", "Identificação", "Registro original"], resourceRows);
  addSheet(workbook, "Síntese por Linha", ["Telefone", "Faturas", "Registros de resumo", "Total (centavos)", "Total (R$)", "Origem"],
    [...lineGroups].map(([phone, group]) => [phone, group.files.size, group.records, sumCents(group.values), reais(sumCents(group.values)), group.sources.join("; ")]));
  addSheet(workbook, "Multas", ["Arquivo", "Registro nº", "Resumo vinculado nº", "Telefone", "Descrição", "Valor (centavos)", "Valor (R$)", "Registro original"], fineRows);
  addSheet(workbook, "Serviços e Cobranças", ["Arquivo", "Registro nº", "Resumo vinculado nº", "Telefone", "Descrição", "Data", "Valor (centavos)", "Valor (R$)", "Registro original"], chargeRows);
  addSheet(workbook, "Detalhamento", ["Arquivo", "Registro nº", "Resumo vinculado nº", "Telefone", "Descrição", "Data", "Registro original"], detailRows);
  addSheet(workbook, "Registros Brutos", ["Arquivo", "Registro nº", "Tipo", "Classificação", "Tamanho", "Registro original"], rawRows);
  return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), summary };
}
