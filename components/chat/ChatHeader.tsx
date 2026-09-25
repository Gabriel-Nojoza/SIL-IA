"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useAdminSurface } from "@/hooks/use-admin-surface";

interface ChatHeaderProps {
  userName: string;
  userEmail: string;
  companyName: string;
  companyId: string;
  sessionId: string;
  onHistoryClick: () => void;
  onMobileHistoryOpen?: () => void;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return (partes.slice(0, 2).map((p) => p[0]).join("") || "U").toUpperCase();
}

export function ChatHeader({
  userName,
  companyName,
  onMobileHistoryOpen,
}: ChatHeaderProps) {
  const { user, logout } = useAuthContext();
  const { canAccessAdminSurface } = useAdminSurface();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/40 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMobileHistoryOpen ? (
          <button
            type="button"
            onClick={onMobileHistoryOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted transition hover:text-foreground lg:hidden"
            aria-label="Conversas"
          >
            <Menu size={18} />
          </button>
        ) : null}
        <Image
          src="/sil-logo.png"
          alt="Logo SIL"
          width={36}
          height={36}
          className="h-9 w-9 rounded-lg object-contain"
          priority
        />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold text-foreground">
            SIL <span className="font-normal text-muted">Inteligência Analítica</span>
          </p>
          <p className="truncate text-xs text-muted">{companyName || "Chat de IA para análise de dados"}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {user?.role === "admin" && canAccessAdminSurface ? (
          <Link
            href="/admin/dashboard"
            className="hidden h-9 items-center rounded-lg border border-border/60 px-3 text-sm text-foreground transition hover:border-accent/50 hover:bg-accent/10 sm:inline-flex"
          >
            Admin
          </Link>
        ) : null}
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] p-1 sm:pr-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
            {iniciais(userName)}
          </span>
          <span className="hidden max-w-[160px] truncate text-sm text-foreground sm:block">{userName}</span>
        </div>
        <button
          type="button"
          onClick={logout}
          title="Sair"
          className="flex h-9 items-center gap-2 rounded-lg border border-border/60 px-2.5 text-sm text-muted transition hover:border-danger/50 hover:text-red-300"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
