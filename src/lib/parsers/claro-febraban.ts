import type { ParsedInvoice, ParsedRecord } from "./vivo";

export type ClaroRecord = ParsedRecord & {
  validLength: boolean;
  phone: string | null;
  summaryRecord: number | null;
  description: string | null;
  eventDate: string | null;
  amountCents: number | null;
};

export type ClaroInvoice = Omit<ParsedInvoice, "records" | "layout"> & {
  layout: "claro-febraban";
  records: ClaroRecord[];
  accountId: string | null;
  customerId: string | null;
  headerDateA: string | null;
  headerDateB: string | null;
  controlTotalCents: number | null;
  summaryTotalCents: number | null;
  detailTotalCents: number | null;
  reconciled: boolean;
  interpretation: "partial";
};

const TYPES: Record<string, string> = {
  "0": "Cabeçalho da fatura",
  "1": "Resumo por recurso",
  "3": "Detalhamento de chamadas",
  "4": "Serviço ou cobrança",
  "9": "Totalizador final",
};

const field = (line: string, from: number, to: number) => line.slice(from - 1, to);
const textField = (line: string, from: number, to: number) => field(line, from, to).trim() || null;
const dateField = (line: string, from: number, to: number) => {
  const value = field(line, from, to);
  return /^\d{8}$/.test(value) ? value : null;
};

function moneyField(line: string, from: number): number | null {
  const value = field(line, from, from + 13);
  if (!/^[+-]\d{13}$/.test(value)) return null;
  const cents = Number(value.slice(1)) * (value[0] === "-" ? -1 : 1);
  return Number.isSafeInteger(cents) ? cents : null;
}

function sumExact(values: (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  const sum = values.reduce<number>((total, value) => total + (value ?? 0), 0);
  return Number.isSafeInteger(sum) ? sum : null;
}

export function isClaroFebraban(content: string): boolean {
  const header = content.split(/\r\n|\n|\r/, 1)[0] ?? "";
  return header.startsWith("0") && field(header, 22, 36).trim().toUpperCase() === "CLARO S/A";
}

export function parseClaroFebraban(content: string): ClaroInvoice {
  const lines = content.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") lines.pop();
  let currentSummary: ClaroRecord | null = null;
  const records: ClaroRecord[] = lines.map((raw, index) => {
    const code = raw[0] ?? "";
    const validLength = raw.length === 350;
    const line = index + 1;
    const record: ClaroRecord = {
      line, raw, code, type: TYPES[code] ?? "Não reconhecido", validLength,
      phone: null, summaryRecord: null, description: null, eventDate: null, amountCents: null,
    };
    if (!validLength) return record;
    if (code === "1") {
      record.phone = textField(raw, 55, 65);
      record.summaryRecord = line;
      record.description = textField(raw, 125, 150);
      record.amountCents = moneyField(raw, 301);
      currentSummary = record;
    } else if (code === "4" || code === "3") {
      record.phone = textField(raw, 30, 40);
      record.summaryRecord = currentSummary?.phone === record.phone ? currentSummary.line : null;
      record.eventDate = dateField(raw, code === "4" ? 87 : 89, code === "4" ? 94 : 96);
      record.description = textField(raw, code === "4" ? 218 : 178, code === "4" ? 257 : 202);
      if (code === "4") record.amountCents = moneyField(raw, 258);
    }
    return record;
  });

  const header = records[0]?.code === "0" && records[0].validLength ? records[0].raw : null;
  const trailer = records.at(-1)?.code === "9" && records.at(-1)?.validLength ? records.at(-1)!.raw : null;
  const summaries = records.filter((record) => record.code === "1");
  const charges = records.filter((record) => record.code === "4");
  const controlTotalCents = trailer ? moneyField(trailer, 94) : null;
  const summaryTotalCents = sumExact(summaries.map((record) => record.amountCents));
  const detailTotalCents = sumExact(charges.map((record) => record.amountCents));
  const declaredRecords = trailer ? Number(field(trailer, 70, 81)) : NaN;
  const declaredSummaries = trailer ? Number(field(trailer, 82, 93)) : NaN;
  const badLengths = records.filter((record) => !record.validLength).length;
  const unknownCount = records.filter((record) => record.type === "Não reconhecido").length;
  const unlinked = records.filter((record) => (record.code === "3" || record.code === "4") && record.summaryRecord === null).length;
  const perSummary = new Map<number, number>();
  for (const record of charges) if (record.summaryRecord !== null && record.amountCents !== null)
    perSummary.set(record.summaryRecord, (perSummary.get(record.summaryRecord) ?? 0) + record.amountCents);
  const mismatchedSummaries = summaries.filter((record) => record.amountCents !== null && perSummary.get(record.line) !== record.amountCents).length;
  const reconciled = badLengths === 0 && unknownCount === 0 && unlinked === 0 && mismatchedSummaries === 0 &&
    Number.isInteger(declaredRecords) && declaredRecords === records.length &&
    Number.isInteger(declaredSummaries) && declaredSummaries === summaries.length &&
    controlTotalCents !== null && controlTotalCents === summaryTotalCents && controlTotalCents === detailTotalCents;
  const referenceDate = header ? dateField(header, 142, 149) : null;
  const warnings = [
    "Interpretação parcial: campos de detalhamento de chamadas, tributos e demais posições ainda não foram mapeados.",
    ...(badLengths ? [`${badLengths} registro(s) fora do tamanho esperado de 350 caracteres; conteúdo original preservado.`] : []),
    ...(unknownCount ? [`${unknownCount} tipo(s) de registro não reconhecido(s); conteúdo original preservado.`] : []),
    ...(unlinked ? [`${unlinked} detalhe(s) sem vínculo confirmado com um resumo de recurso.`] : []),
    ...(mismatchedSummaries ? [`${mismatchedSummaries} resumo(s) divergem da soma das cobranças vinculadas.`] : []),
    ...(!reconciled ? ["Os totais da fatura não foram completamente reconciliados; confira os registros de controle."] : []),
  ];
  return {
    layout: "claro-febraban", operator: header ? textField(header, 22, 36) ?? "Claro S/A" : "Claro S/A",
    company: header ? textField(header, 57, 92) : null,
    accountId: header ? textField(header, 109, 117) : null,
    customerId: header ? textField(header, 39, 47) : null,
    headerDateA: header ? dateField(header, 134, 141) : null,
    headerDateB: referenceDate,
    period: referenceDate ? `${referenceDate.slice(4, 6)}/${referenceDate.slice(0, 4)} (referência)` : null,
    records, unknownCount, lineCount: new Set(summaries.map((record) => record.phone).filter(Boolean)).size,
    totalCents: reconciled ? controlTotalCents : null,
    controlTotalCents, summaryTotalCents, detailTotalCents, reconciled, interpretation: "partial", warnings,
  };
}
