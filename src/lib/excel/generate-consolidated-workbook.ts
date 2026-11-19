import ExcelJS from "exceljs";
import type { parseInvoice } from "@/lib/parsers";
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

const isFine = (description: string | null) => /\bmultas?\b/i.test(description ?? "");

function sumCents(values: (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return Number.isSafeInteger(total) ? total : null;
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
  // Esta versão entrega apenas o fechamento fixo do CSV de referência.
  const closing = workbook.addWorksheet("Fechamento Mensal", { views: [{ showGridLines: false, state: "frozen", ySplit: 3 }] });
  closing.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  closing.getColumn(1).width = 48;
  closing.getColumn(2).width = 22;
  closing.getColumn(2).numFmt = '"R$ "#,##0.00;[Red]"R$ "-#,##0.00';
  closing.headerFooter.oddHeader = '&C&BGestão de Telefonia | Fechamento Mensal';
  closing.headerFooter.oddFooter = '&LReferência: abril de 2026&R&P / &N';
  closing.pageSetup.margins = { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 };
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
  return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), summary };
}
