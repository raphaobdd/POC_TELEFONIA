import { createHash } from "node:crypto";
import { generateConsolidatedWorkbook, type SourceInvoice } from "@/lib/excel/generate-consolidated-workbook";
import { parseInvoice } from "@/lib/parsers";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function metadataFor(invoice: ReturnType<typeof parseInvoice>, name: string) {
  return { name, operator: invoice.operator, recordCount: invoice.records.length,
    lineCount: invoice.lineCount, totalCents: invoice.totalCents, warnings: invoice.warnings,
    interpretation: "partial" as const, company: invoice.company, period: invoice.period,
    accountId: invoice.layout === "claro-febraban" ? invoice.accountId : null,
    reconciled: invoice.layout === "claro-febraban" ? invoice.reconciled : false };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("file");
    if (!files.length || files.some((item) => !(item instanceof File)))
      return Response.json({ error: "Selecione um ou mais arquivos TXT." }, { status: 400 });
    const uploads = files as File[];
    if (uploads.length > MAX_FILES) return Response.json({ error: `Selecione no máximo ${MAX_FILES} arquivos por conversão.` }, { status: 400 });
    if (uploads.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES)
      return Response.json({ error: "O conjunto de arquivos deve ter no máximo 30 MB." }, { status: 400 });
    for (const file of uploads) {
      if (!/\.txt$/i.test(file.name)) return Response.json({ error: `${file.name}: o arquivo deve ter extensão .txt.` }, { status: 400 });
      if (!file.size) return Response.json({ error: `${file.name}: o arquivo está vazio.` }, { status: 400 });
      if (file.size > MAX_BYTES) return Response.json({ error: `${file.name}: o arquivo deve ter no máximo 10 MB.` }, { status: 400 });
    }

    const sources: SourceInvoice[] = [];
    const hashes = new Set<string>();
    for (const file of uploads) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hashes.has(hash)) return Response.json({ error: `${file.name}: este conteúdo já foi adicionado; remova a cópia para evitar gasto duplicado.` }, { status: 400 });
      hashes.add(hash);
      if (bytes.includes(0)) return Response.json({ error: `${file.name}: o arquivo não parece ser um TXT válido.` }, { status: 400 });
      let content: string;
      try { content = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, ""); }
      catch { content = new TextDecoder("windows-1252").decode(bytes); }
      if (!content.trim()) return Response.json({ error: `${file.name}: o arquivo não contém registros.` }, { status: 400 });
      sources.push({ name: file.name, invoice: parseInvoice(content) });
    }
    const { buffer, summary } = await generateConsolidatedWorkbook(sources);
    const metadata = { files: sources.map(({ name, invoice }) => metadataFor(invoice, name)), summary };
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="FechamentoMensal_RIP_Vencimento_2026-04.xlsx"',
        "X-Conversion-Metadata": encodeURIComponent(JSON.stringify(metadata)),
      },
    });
  } catch {
    return Response.json({ error: "Não foi possível processar o arquivo." }, { status: 500 });
  }
}
