import ExcelJS from "exceljs";
import type { ClaroInvoice, ClaroRecord } from "@/lib/parsers/claro-febraban";

type Cell = string | number | null;

function addSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: Cell[][]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6331B" } };
  sheet.getRow(1).height = 26;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(sheet.rowCount, 1), column: headers.length } };
  headers.forEach((header, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = Math.min(85, Math.max(17, header.length + 3, ...rows.map((row) => String(row[index] ?? "").length + 2)));
    if (["Telefone", "Conta", "Cliente", "Data", "Vencimento", "Referência", "Registro original"].includes(header)) column.numFmt = "@";
    if (header.includes("(R$)")) column.numFmt = '"R$ "#,##0.00;[Red]"R$ "-#,##0.00';
  });
  return sheet;
}

const reais = (cents: number | null) => cents === null ? null : cents / 100;
const date = (value: string | null) => value ? `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}` : null;
const trace = (record: ClaroRecord): Cell[] => [record.line, record.summaryRecord, record.phone, record.description, date(record.eventDate), record.amountCents, reais(record.amountCents)];

export async function generateClaroWorkbook(invoice: ClaroInvoice): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gestão de Telefonia — KAEFER RIP";
  const header = ["Registro cabeçalho", "Registro trailer", "Empresa", "Operadora", "Cliente", "Conta", "Referência inferida", "Data A (pos. 134–141)", "Data B (pos. 142–149)", "Linhas telefônicas", "Resumos de recurso", "Cobranças", "Total de controle (centavos)", "Total dos resumos (centavos)", "Total das cobranças (centavos)", "Total reconciliado (R$)", "Situação", "Avisos"];
  addSheet(workbook, "Resumo da Fatura", header, [[
    invoice.records[0]?.line ?? null, invoice.records.at(-1)?.line ?? null, invoice.company, invoice.operator,
    invoice.customerId, invoice.accountId, invoice.period, date(invoice.headerDateA), date(invoice.headerDateB), invoice.lineCount,
    invoice.records.filter((record) => record.code === "1").length,
    invoice.records.filter((record) => record.code === "4").length,
    invoice.controlTotalCents, invoice.summaryTotalCents, invoice.detailTotalCents, reais(invoice.totalCents),
    invoice.reconciled ? "Valores reconciliados; interpretação parcial" : "Reconciliação pendente; interpretação parcial",
    invoice.warnings.join(" "),
  ]]);
  workbook.getWorksheet("Resumo da Fatura")!.getColumn(16).numFmt = '"R$ "#,##0.00';

  const resourceRows = invoice.records.filter((record) => record.code === "1").map((record) => [
    record.line, record.phone, record.description, record.amountCents, reais(record.amountCents),
    record.phone ? "Linha identificada" : "Recurso sem telefone", record.raw,
  ]);
  addSheet(workbook, "Linhas Telefônicas", ["Registro original nº", "Telefone", "Serviço", "Valor (centavos)", "Valor (R$)", "Identificação", "Registro original"], resourceRows);

  addSheet(workbook, "Serviços e Cobranças", ["Registro original nº", "Resumo vinculado nº", "Telefone", "Descrição", "Data", "Valor (centavos)", "Valor (R$)", "Registro original"],
    invoice.records.filter((record) => record.code === "4").map((record) => [...trace(record), record.raw]));
  addSheet(workbook, "Detalhamento", ["Registro original nº", "Resumo vinculado nº", "Telefone", "Descrição", "Data", "Registro original"],
    invoice.records.filter((record) => record.code === "3").map((record) => [record.line, record.summaryRecord, record.phone, record.description, date(record.eventDate), record.raw]));
  addSheet(workbook, "Registros Brutos", ["Registro original nº", "Tipo", "Classificação", "Tamanho", "Registro original"],
    invoice.records.map((record) => [record.line, record.code, record.type, record.raw.length, record.raw]));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
