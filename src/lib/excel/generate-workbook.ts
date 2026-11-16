import ExcelJS from "exceljs";
import type { ParsedInvoice, ParsedRecord } from "@/lib/parsers/vivo";
import type { ClaroInvoice } from "@/lib/parsers/claro-febraban";
import { generateClaroWorkbook } from "./generate-claro-workbook";

export async function generateWorkbook(invoice: ParsedInvoice | ClaroInvoice): Promise<Buffer> {
  if ("layout" in invoice && invoice.layout === "claro-febraban") return generateClaroWorkbook(invoice);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RIP Telefonia";
  const addSheet = (name: string, headers: string[], rows: (string | number | null)[][]) => {
    const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8D2331" } };
    sheet.getRow(1).height = 24;
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: headers.length } };
    headers.forEach((header, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = Math.min(80, Math.max(17, header.length + 3, ...rows.map((row) => String(row[index] ?? "").length + 2)));
      if (header === "Registro original" || header === "Telefone") column.numFmt = "@";
    });
    return sheet;
  };
  const rawRows = (records: ParsedRecord[]) => records.map((record) => [record.line, record.code, record.type, record.raw]);
  const typedHeaders = ["Linha do TXT", "Código", "Tipo", "Registro original"];
  addSheet("Resumo", ["Empresa", "Operadora", "Período", "Valor total (R$)", "Observações"],
    [[invoice.company, invoice.operator, invoice.period, invoice.totalCents === null ? null : invoice.totalCents / 100, invoice.warnings.join(" ")]]);
  const summary = workbook.getWorksheet("Resumo")!;
  summary.getColumn(4).numFmt = '"R$ "#,##0.00';
  addSheet("Linhas e Planos", ["Telefone", "Plano", "Valor (R$)", "Desconto (R$)", ...typedHeaders],
    invoice.records.filter((r) => r.code === "110D").map((r) => [null, null, null, null, r.line, r.code, r.type, r.raw]));
  addSheet("Descontos", ["Telefone", "Valor (R$)", ...typedHeaders],
    invoice.records.filter((r) => r.code === "162D").map((r) => [null, null, r.line, r.code, r.type, r.raw]));
  addSheet("Parcelamentos", ["Parcela", "Valor (R$)", ...typedHeaders],
    invoice.records.filter((r) => r.code === "190D").map((r) => [null, null, r.line, r.code, r.type, r.raw]));
  addSheet("Registros Brutos", typedHeaders, rawRows(invoice.records));
  for (const name of ["Linhas e Planos", "Descontos", "Parcelamentos"]) {
    const sheet = workbook.getWorksheet(name)!;
    sheet.getColumn(name === "Linhas e Planos" ? 3 : 2).numFmt = '"R$ "#,##0.00';
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
