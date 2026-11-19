"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle, DownloadSimple, FileText, SpinnerGap, UploadSimple, WarningCircle, X, LockKey, FileXls, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { DotPattern } from "@/components/ui/dot-pattern";
import { ThemeToggle } from "@/components/theme-toggle";
import { closingReference } from "@/lib/excel/fechamento-mensal-abril-2026.js";

type Result = { name: string; operator: string; recordCount: number; lineCount: number | null; totalCents: number | null; warnings: string[]; interpretation: "partial"; company: string | null; period: string | null; accountId: string | null; reconciled: boolean };
type Summary = { fileCount: number; recordCount: number; uniqueLines: number; totalCents: number | null; lineSpendingCents: number | null; unassignedCents: number | null; fineCents: number | null; fineCount: number; warnings: string[] };
type ConsolidatedResult = { files: Result[]; summary: Summary };
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConsolidatedResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  function clear() {
    if (busy) return;
    setFiles([]); setError(""); setResult(null); setDownloadUrl("");
    if (input.current) input.current.value = "";
  }

  function addFiles(selected: File[]) {
    if (busy || !selected.length) return;
    setError("");
    for (const file of selected) {
      if (!/\.txt$/i.test(file.name)) { setError(`${file.name}: selecione arquivos com extensão .txt.`); return; }
      if (!file.size) { setError(`${file.name}: o arquivo está vazio.`); return; }
      if (file.size > 10 * 1024 * 1024) { setError(`${file.name}: máximo de 10 MB por arquivo.`); return; }
    }
    const sameFile = (left: File, right: File) => left.name === right.name && left.size === right.size && left.lastModified === right.lastModified;
    const additions = selected.filter((file, index) => !files.some((current) => sameFile(current, file)) && selected.findIndex((other) => sameFile(other, file)) === index);
    const next = [...files, ...additions];
    if (next.length > MAX_FILES) { setError(`Selecione no máximo ${MAX_FILES} arquivos por conversão.`); return; }
    if (next.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) { setError("O conjunto de arquivos deve ter no máximo 30 MB."); return; }
    if (!additions.length) { setError("Esses arquivos já estão na lista."); return; }
    setFiles(next); setResult(null); setDownloadUrl("");
  }

  function removeFile(index: number) {
    if (busy) return;
    setFiles((current) => current.filter((_, position) => position !== index));
    setError(""); setResult(null); setDownloadUrl("");
  }

  async function convert() {
    if (!files.length || busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); files.forEach((file) => form.append("file", file));
      const response = await fetch("/api/convert", { method: "POST", body: form });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "Falha na conversão."); }
      const metadata = response.headers.get("X-Conversion-Metadata");
      if (!metadata) throw new Error("Resposta incompleta do servidor.");
      const blob = await response.blob();
      setResult(JSON.parse(decodeURIComponent(metadata)) as ConsolidatedResult);
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conversão."); }
    finally { setBusy(false); }
  }

  const step = result ? 3 : busy ? 2 : files.length ? 1 : 0;
  const animate = !reducedMotion;
  return <main className="telefonia-app relative min-h-screen overflow-hidden bg-[var(--t-bg)] text-[var(--t-heading)] selection:bg-[#e6331b]/35">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[image:var(--t-glow)]" />
    <DotPattern width={27} height={27} cr={0.7} className="pointer-events-none absolute inset-0 !h-[650px] text-[var(--t-dot)] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8">
      <header className="flex min-h-[94px] items-center justify-between gap-2 border-b border-[var(--t-border)] py-4 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm"><Image src="/kaefer-rip-logo.png" alt="KAEFER RIP Serviços Industriais" width={170} height={47} priority className="h-auto w-[118px] sm:w-[170px]" /></div>
          <div className="hidden h-10 w-px bg-[var(--t-border)] sm:block" />
          <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--t-muted)]">Ferramenta interna</p><p className="mt-1 text-sm font-semibold tracking-wide text-[var(--t-heading)] sm:text-base">Gestão de Telefonia</p></div>
        </div>
        <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-[var(--t-border)] bg-[var(--t-subtle-bg)] px-3 py-1.5 text-xs text-[var(--t-muted)] md:flex"><span className="size-1.5 rounded-full bg-[#e6331b]" /> Conversor de faturas</div><ThemeToggle /></div>
      </header>

      <div className="mx-auto max-w-[850px] pb-20">
        <BlurFade duration={animate ? 0.45 : 0} offset={animate ? 8 : 0} blur={animate ? "6px" : "0px"}>
          <section className="pb-9 pt-12 sm:pb-11 sm:pt-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--t-accent-border)] bg-[var(--t-accent-bg)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-[var(--t-accent)] sm:text-[11px]"><span className="size-1.5 rounded-full bg-[#e6331b]" /> Processamento de faturas</div>
            <h1 className="font-heading max-w-[760px] text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.12] tracking-[-.045em]">Dados de telefonia, <span className="text-[var(--t-accent)]">prontos para análise.</span></h1>
            <p className="mt-5 max-w-[640px] text-[15px] leading-7 text-[var(--t-muted)] sm:text-lg">Importe suas faturas TXT para demonstrar o fluxo de conversão. Por enquanto, o Excel gerado usa o fechamento mensal fixo de abril de 2026.</p>
          </section>
        </BlurFade>

        <BlurFade delay={animate ? 0.1 : 0} duration={animate ? 0.45 : 0} offset={animate ? 8 : 0} blur={animate ? "6px" : "0px"}>
          <section aria-labelledby="upload-title" className="relative overflow-hidden rounded-[22px] border border-[var(--t-border)] bg-[var(--t-card)] shadow-[0_24px_75px_-34px_rgba(0,0,0,.68)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--t-border)] px-6 py-6 sm:px-8">
              <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.19em] text-[var(--t-accent)]">01 / Conversão</p><h2 id="upload-title" className="font-heading text-xl font-bold tracking-tight sm:text-2xl">Importar faturas</h2><p className="mt-1 text-sm text-[var(--t-muted)]">Selecione até 10 arquivos TXT para começar.</p></div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--t-border)] bg-[var(--t-subtle-bg)] text-[var(--t-accent)]"><FileText size={22} weight="duotone" /></div>
            </div>
            <div className="p-5 sm:p-8">
              <input ref={input} type="file" accept=".txt,text/plain" multiple className="sr-only" aria-label="Selecionar arquivos TXT" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
              <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}
                className={`rounded-2xl border border-dashed px-5 py-9 text-center transition-[border-color,background-color,box-shadow] duration-200 sm:py-11 ${dragging ? "border-[var(--t-accent)] bg-[var(--t-accent-bg)] shadow-[inset_0_0_45px_rgba(230,51,27,.1)]" : "border-[var(--t-border-strong)] bg-[var(--t-drop)]"}`}>
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-[var(--t-border)] bg-[var(--t-icon-bg)] text-[var(--t-accent)]"><UploadSimple size={26} weight="duotone" /></div>
                <p className="text-base font-semibold sm:text-lg">Arraste seus arquivos TXT para cá</p><p className="mt-1.5 text-sm text-[var(--t-muted)]">ou escolha vários arquivos do dispositivo</p>
                <Button type="button" variant="outline" size="lg" disabled={busy} className="mt-5 h-10 border-[var(--t-border-strong)] bg-[var(--t-subtle-bg)] px-5 text-sm text-[var(--t-heading)] hover:bg-[var(--t-hover)] hover:text-[var(--t-heading)] focus-visible:ring-[#f05a43]" onClick={() => input.current?.click()}>Adicionar arquivos</Button>
                <p className="mt-5 text-xs text-[var(--t-subdued)]">Até 10 arquivos .txt · 10 MB cada · 30 MB no total</p>
              </div>
              {files.length > 0 && <div className="mt-4 space-y-2" aria-label="Arquivos selecionados"><p className="text-xs font-semibold text-[var(--t-muted)]">{files.length} {files.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}</p>{files.map((file, index) => <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-[var(--t-border)] bg-[var(--t-selected)] p-3.5"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--t-accent-bg)] text-[var(--t-accent)]"><FileText size={22} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold" title={file.name}>{file.name}</p><p className="mt-0.5 text-xs text-[var(--t-muted)]">{file.size < 1024 ? "Menos de 1 KB" : `${(file.size / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB`} · TXT</p></div><button type="button" disabled={busy} aria-label={`Remover ${file.name}`} className="rounded-lg p-2 text-[var(--t-muted)] hover:bg-[var(--t-subtle-bg)] hover:text-[var(--t-heading)] focus-visible:outline-2 focus-visible:outline-[#f05a43] disabled:opacity-50" onClick={() => removeFile(index)}><X size={18} /></button></div>)}</div>}
              {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--t-error-border)] bg-[var(--t-error-bg)] p-3 text-sm text-[var(--t-error)]"><WarningCircle size={18} className="mt-0.5 shrink-0" />{error}</p>}
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[var(--t-border)] pt-5" aria-label="Etapas da conversão">
                {["Importar arquivo", "Processar registros", "Gerar Excel"].map((label, index) => <div key={label} className="flex items-center gap-2 text-[11px] leading-4 sm:text-xs"><span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${step > index ? "border-[var(--t-accent)] bg-[#e6331b] text-white" : step === index ? "border-[var(--t-accent)] text-[var(--t-accent)]" : "border-[var(--t-border-strong)] text-[var(--t-subdued)]"}`}>{step > index ? "✓" : index + 1}</span><span className={step >= index ? "text-[var(--t-heading)]" : "text-[var(--t-subdued)]"}>{label}</span></div>)}
              </div>
              {busy && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-[var(--t-muted)]"><SpinnerGap size={17} className="animate-spin motion-reduce:animate-none" /> Processando {files.length} {files.length === 1 ? "arquivo" : "arquivos"} e preparando o Excel consolidado…</p>}
              <Button type="button" size="lg" disabled={!files.length || busy} onClick={convert} className="mt-6 h-12 w-full bg-[#e6331b] text-sm font-bold text-white shadow-[0_10px_25px_-12px_rgba(230,51,27,.8)] hover:bg-[#f0442c] focus-visible:ring-[#ff8b7b] disabled:bg-[var(--t-disabled-bg)] disabled:text-[var(--t-disabled-text)] disabled:shadow-none sm:text-base">{busy ? <><SpinnerGap className="animate-spin motion-reduce:animate-none" /> Processando arquivos</> : <>{files.length > 1 ? `Converter ${files.length} arquivos` : "Converter para Excel"} <ArrowRight weight="bold" /></>}</Button>
            </div>
          </section>
        </BlurFade>

        {result && <BlurFade duration={animate ? 0.4 : 0} offset={animate ? 8 : 0} blur={animate ? "6px" : "0px"}><section aria-live="polite" className="mt-6 overflow-hidden rounded-[22px] border border-[var(--t-border)] bg-[var(--t-card)] shadow-[0_24px_75px_-34px_rgba(0,0,0,.68)]">
          <div className="flex items-start gap-3 border-b border-[var(--t-border)] px-6 py-6 sm:px-8"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400"><CheckCircle size={24} weight="fill" /></div><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.19em] text-emerald-400">02 / Resultado</p><h2 className="font-heading text-xl font-bold">Excel consolidado pronto</h2><p className="mt-1 text-sm text-[var(--t-muted)]">{result.files.length} {result.files.length === 1 ? "fatura processada" : "faturas processadas"}. A planilha para download é uma demonstração com valores fixos de abril de 2026.</p></div></div>
          <div className="p-6 sm:p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--t-muted)]">Prévia do processamento dos TXT</p>
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--t-border)] bg-[var(--t-subtle-bg)] sm:grid-cols-2">
              {[["Faturas", String(result.summary.fileCount)], ["Registros preservados", result.summary.recordCount.toLocaleString("pt-BR")], ["Linhas distintas", String(result.summary.uniqueLines)], ["Total consolidado", result.summary.totalCents === null ? "Não reconciliado" : (result.summary.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })], ["Gastos das linhas", result.summary.lineSpendingCents === null ? "Não mapeado" : (result.summary.lineSpendingCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })], ["Cobranças sem linha", result.summary.unassignedCents === null ? "Não mapeadas" : (result.summary.unassignedCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })], ["Multas identificadas", `${result.summary.fineCount} · ${result.summary.fineCents === null ? "valor não mapeado" : (result.summary.fineCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`]].map(([label, value]) => <div key={label} className="bg-[var(--t-cell)] p-4 sm:p-5"><dt className="text-xs text-[var(--t-muted)]">{label}</dt><dd className="mt-1.5 text-sm font-semibold text-[var(--t-heading)] sm:text-base">{value}</dd></div>)}
            </dl>
            <div className="mt-5 space-y-3"><h3 className="text-sm font-semibold">Faturas incluídas</h3>{result.files.map((item, index) => <div key={`${index}-${item.name}`} className="rounded-xl border border-[var(--t-border)] bg-[var(--t-cell)] p-4"><p className="break-all text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[var(--t-muted)]">{item.operator} · {item.recordCount.toLocaleString("pt-BR")} registros · {item.lineCount ?? "linhas não identificadas"} {item.lineCount === null ? "" : "linhas"} · {item.totalCents === null ? "total não reconciliado" : (item.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>{item.warnings.map((warning) => <p key={warning} className="mt-2 flex items-start gap-2 text-xs leading-5 text-[var(--t-warning)]"><WarningCircle size={14} className="mt-0.5 shrink-0" />{warning}</p>)}</div>)}</div>
            {result.summary.warnings.length > 0 && <div className="mt-5 rounded-xl border border-[var(--t-warning-border)] bg-[var(--t-warning-bg)] p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--t-warning)]">Critérios da síntese</p>{result.summary.warnings.map((warning) => <p key={warning} className="mt-1.5 flex items-start gap-2 text-xs leading-5 text-[var(--t-warning)]"><WarningCircle size={14} className="mt-0.5 shrink-0" />{warning}</p>)}</div>}
            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--t-border)]">
              <div className="border-b border-[var(--t-border)] px-4 py-4"><h3 className="font-heading text-base font-bold">Prévia da planilha demonstrativa</h3><p className="mt-1 text-xs text-[var(--t-muted)]">Valores fixos do fechamento Vivo com vencimento em 04/2026.</p></div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-[#e6331b] text-white"><tr><th className="px-4 py-3">Rótulos de Linha</th><th className="px-4 py-3 text-right">Soma de Valor</th></tr></thead>
                  <tbody>{closingReference.slice(3).filter(([label]) => label).map(([label, rawValue]) => <tr key={label} className={label === "Total Geral" ? "bg-[#202633] font-bold text-white" : "even:bg-[var(--t-subtle-bg)]"}><td className="px-4 py-2.5">{label}</td><td className="px-4 py-2.5 text-right tabular-nums">{Number(rawValue.replaceAll(".", "").replace(",", ".")).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="h-11 bg-[#e6331b] px-5 text-sm font-bold text-white hover:bg-[#f0442c]" onClick={() => { const a = document.createElement("a"); a.href = downloadUrl; a.download = "FechamentoMensal_RIP_Vencimento_2026-04.xlsx"; a.click(); }}><DownloadSimple /> Baixar Excel consolidado</Button><Button size="lg" variant="outline" className="h-11 border-[var(--t-border-strong)] bg-transparent px-5 text-sm text-[var(--t-heading)] hover:bg-[var(--t-subtle-bg)] hover:text-[var(--t-heading)]" onClick={clear}><ArrowCounterClockwise /> Converter outros arquivos</Button></div>
          </div>
        </section></BlurFade>}

        <div className="mt-7 flex flex-col items-center justify-between gap-3 text-xs text-[var(--t-subdued)] sm:flex-row"><div className="flex items-center gap-2"><LockKey size={15} /> Arquivos processados sem armazenamento permanente</div><div className="flex items-center gap-2"><FileXls size={15} /> TXT → XLSX</div></div>
      </div>
    </div>
  </main>;
}
