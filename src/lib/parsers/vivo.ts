export const RECORD_TYPES: Record<string, string> = {
  "010D": "Resumo", "011D": "Cliente", "020D": "Pagamento",
  "050": "Agrupamento de serviços", "110D": "Linha e plano",
  "162D": "Desconto", "190D": "Parcelamento",
  "200D": "Detalhamento", "225D": "Detalhamento", "282D": "Detalhamento",
};

export type ParsedRecord = { line: number; code: string; type: string; raw: string };
export type ParsedInvoice = {
  layout: "vivo";
  operator: string;
  records: ParsedRecord[];
  unknownCount: number;
  lineCount: number | null;
  totalCents: number | null;
  company: string | null;
  period: string | null;
  warnings: string[];
};

export function parseVivo(content: string): ParsedInvoice {
  const lines = content.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") lines.pop();
  const records = lines.map((raw, index) => ({ raw, line: index + 1 }))
    .map(({ raw, line }) => {
      const code = Object.keys(RECORD_TYPES).find((candidate) => raw.startsWith(candidate)) ??
        (raw.match(/^\d{3,4}[A-Z]?/)?.[0] ?? "—");
      return { line, code, type: RECORD_TYPES[code] ?? "Não reconhecido", raw };
    });
  const unknownCount = records.filter((record) => record.type === "Não reconhecido").length;
  return {
    layout: "vivo",
    operator: records.some((record) => record.type !== "Não reconhecido") ? "Vivo / Telefônica" : "Não identificada", records, unknownCount,
    lineCount: null, totalCents: null, company: null, period: null,
    warnings: [
      "Campos de fatura e telefones ainda não mapeados; consulte os registros brutos.",
      ...(unknownCount ? [`${unknownCount} registro(s) não reconhecido(s), preservado(s) integralmente.`] : []),
    ],
  };
}
