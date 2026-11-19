import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

const download = "/FechamentoMensal_RIP_Vencimento_2026-04.xlsx";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--t-bg)] text-[var(--t-heading)]">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-[var(--t-border)] pb-7">
          <div className="flex items-center gap-4">
            <Image src="/kaefer-rip-logo.png" alt="KAEFER RIP" width={150} height={54} className="h-auto w-[150px] object-contain" priority />
            <span className="hidden border-l border-[var(--t-border)] pl-4 text-sm font-semibold text-[var(--t-muted)] sm:block">Gestão de Telefonia</span>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-[var(--t-accent-border)] bg-[var(--t-accent-bg)] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--t-accent)]">Fechamento mensal · Abril 2026</span>
            <h1 className="font-heading mt-7 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Sua planilha de faturamento, mais clara e organizada.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--t-muted)] sm:text-lg">Os dados são exatamente os do fechamento mensal da Vivo que você enviou. O Excel tem uma única aba, com valores fixos e formatação para leitura e impressão.</p>
            <a href={download} download className="mt-9 inline-flex min-h-14 items-center justify-center rounded-xl bg-[#e6331b] px-7 text-base font-bold text-white shadow-[0_10px_25px_-12px_rgba(230,51,27,.8)] transition-colors hover:bg-[#f0442c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6331b]">Baixar fechamento em Excel</a>
            <p className="mt-4 text-sm text-[var(--t-subdued)]">Arquivo XLSX · referência fixa de vencimento 04/2026</p>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-[var(--t-border)] bg-[var(--t-card)] shadow-[0_24px_75px_-34px_rgba(0,0,0,.68)]">
            <div className="bg-[#202633] px-7 py-5 text-white"><p className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Operadora</p><p className="mt-1 font-heading text-2xl font-bold">VIVO - MÓVEL</p></div>
            <div className="border-b border-[var(--t-border)] bg-[#e6331b] px-7 py-4 text-sm font-bold text-white">Rótulos de Linha <span className="float-right">Soma de Valor</span></div>
            <div className="space-y-0 text-sm">
              <div className="flex justify-between px-7 py-4"><span>Gestão Despesa Telecom</span><strong>R$ 3.463,51</strong></div>
              <div className="flex justify-between bg-[var(--t-subtle-bg)] px-7 py-4"><span>Gestor Operadora</span><strong>R$ 3.990,06</strong></div>
              <div className="flex justify-between px-7 py-4"><span>Multa</span><strong>R$ 810,35</strong></div>
              <div className="flex justify-between bg-[var(--t-subtle-bg)] px-7 py-4"><span>Outras categorias</span><span>Incluídas no Excel</span></div>
            </div>
            <div className="flex justify-between bg-[#202633] px-7 py-5 text-base font-bold text-white"><span>Total Geral</span><span>R$ 35.581,24</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
