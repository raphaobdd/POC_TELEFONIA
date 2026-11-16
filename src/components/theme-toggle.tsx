"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  return <div className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--t-border)] bg-[var(--t-subtle-bg)] text-[var(--t-heading)] transition-colors hover:bg-[var(--t-hover)] focus-within:ring-2 focus-within:ring-[var(--t-accent)]">
    <Sun size={19} aria-hidden="true" className="hidden dark:block" />
    <Moon size={19} aria-hidden="true" className="dark:hidden" />
    <button type="button" aria-label="Ativar tema claro" className="absolute inset-0 hidden rounded-xl dark:block" onClick={() => setTheme("light")} />
    <button type="button" aria-label="Ativar tema escuro" className="absolute inset-0 rounded-xl dark:hidden" onClick={() => setTheme("dark")} />
  </div>;
}
