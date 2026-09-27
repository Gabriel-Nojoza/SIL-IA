"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChartColumn, Check, CircleAlert, LoaderCircle, Mail, MessageSquareText, RefreshCw, ShieldCheck, User } from "lucide-react";
import { listCompanies } from "@/lib/company-service";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useAdminSurface } from "@/hooks/use-admin-surface";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { createUuid } from "@/lib/uuid";
import type { CompanyRecord } from "@/types/company";
import type { AuthUser, UserRole } from "@/types/chat";

const ADMIN_LOGIN_STORAGE_KEY = "sil-admin-login-draft";

export function LoginScreen() {
  const { login } = useAuthContext();
  const router = useRouter();
  const { canAccessAdminSurface, isReady, isStandalone } = useAdminSurface();
  const autoFilledNameRef = useRef("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [userFound, setUserFound] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedAdminLogin = window.localStorage.getItem(ADMIN_LOGIN_STORAGE_KEY);

    if (!storedAdminLogin) {
      return;
    }

    try {
      const parsed = JSON.parse(storedAdminLogin) as {
        name?: string;
        email?: string;
      };

      if (parsed.name) {
        setName(parsed.name);
      }

      if (parsed.email) {
        setEmail(parsed.email);
      }

      if (parsed.name || parsed.email) {
        setRole("admin");
      }
    } catch {
      window.localStorage.removeItem(ADMIN_LOGIN_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    listCompanies().then((data) => {
      setCompanies(data);
      if (data.length > 0) setCompanyId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (role !== "admin") {
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName && !trimmedEmail) {
      return;
    }

    window.localStorage.setItem(
      ADMIN_LOGIN_STORAGE_KEY,
      JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
      }),
    );
  }, [email, name, role]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setIsLookingUp(false);
      setWebhookUrl("");
      setUserFound(false);
      setEmailChecked(false);
      autoFilledNameRef.current = "";
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .ilike("email", normalizedEmail)
          .maybeSingle();

        if (!active) {
          return;
        }

        if (error) {
          throw error;
        }

        if (data) {
          setUserFound(true);
          setDbUserId(String(data.id));
          setName(data.name ?? "");
          autoFilledNameRef.current = data.name ?? "";
          setWebhookUrl(data.webhook_url ?? "");
          if (data.company_id) {
            setCompanyId(data.company_id);
          }
          if (data.status === "admin" || data.status === "user") {
            setRole(data.status as UserRole);
          }
        } else {
          setUserFound(false);
          setDbUserId(null);
          setName("");
          setWebhookUrl("");
          autoFilledNameRef.current = "";
        }
        setEmailChecked(true);
      } catch {
        if (!active) return;
        setUserFound(false);
        setEmailChecked(true);
        setWebhookUrl("");
      } finally {
        if (active) setIsLookingUp(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [email]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId),
    [companies, companyId],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady) return;
    if (!email.trim() || !userFound) return;
    if (!name.trim()) return;
    if (role !== "admin" && !selectedCompany) return;

    const nextUser: AuthUser = {
      userId: dbUserId ?? createUuid(),
      name: name.trim(),
      email: email.trim(),
      role,
      webhookUrl: webhookUrl || undefined,
      company: selectedCompany
        ? {
            companyId: selectedCompany.id,
            companyName: selectedCompany.name,
            workspaceId: selectedCompany.workspaceId,
            datasetId: selectedCompany.datasetId,
            webhookUrl: selectedCompany.webhookUrl,
          }
        : { companyId: "", companyName: "" },
    };

    login(nextUser);

    if (role === "admin" && canAccessAdminSurface) {
      router.replace("/admin/dashboard");
      return;
    }

    router.replace("/");
  }

  const canSubmit = !isLookingUp && userFound && Boolean(name.trim());

  return (
    <main className="flex h-[100dvh] w-screen overflow-hidden bg-[#070a12]">
      {/* ── LADO ESQUERDO: apresentação ── */}
      <section className="relative hidden flex-1 flex-col justify-between overflow-hidden px-14 py-12 lg:flex xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid bg-[length:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent/[0.07] blur-[140px]" />

        <header className="relative z-10 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sil-logo.png" alt="" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">SIL</p>
            <p className="text-xs text-muted">Inteligência Analítica</p>
          </div>
        </header>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-[2.5rem] font-semibold leading-[1.15] tracking-tight text-foreground xl:text-5xl">
            Os números da sua operação, em uma pergunta.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-muted">
            Pergunte em português sobre faturamento, metas, clientes e produtos. A SIL consulta a base do
            Power BI e responde com tabela, gráfico e análise.
          </p>

          {/* Prévia de uma conversa */}
          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-soft">
            <div className="flex justify-end">
              <p className="rounded-xl rounded-br-sm bg-accent/15 px-3.5 py-2 text-[13px] text-foreground/90">
                Qual a tendência de fechamento por equipe?
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sil-logo.png" alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-6 text-foreground/80">
                  Duas equipes devem fechar acima da meta. Food Service precisa acelerar na última semana.
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.06]">
                  {[
                    { equipe: "Capital", pct: 108 },
                    { equipe: "Interior", pct: 101 },
                    { equipe: "Food Service", pct: 86 },
                  ].map((linha) => (
                    <div
                      key={linha.equipe}
                      className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 border-b border-white/[0.05] px-3 py-2 text-xs last:border-b-0"
                    >
                      <span className="text-foreground/80">{linha.equipe}</span>
                      <span className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <span
                          className={`block h-full rounded-full ${linha.pct >= 100 ? "bg-accent" : "bg-muted/60"}`}
                          style={{ width: `${Math.min(linha.pct, 110) / 1.1}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums text-foreground/80">{linha.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="relative z-10 grid max-w-xl grid-cols-3 gap-6 text-xs leading-5 text-muted">
          {[
            { icon: MessageSquareText, titulo: "Linguagem natural", texto: "Sem filtros nem relatórios." },
            { icon: ChartColumn, titulo: "Tabela e gráfico", texto: "Prontos para copiar e apresentar." },
            { icon: RefreshCw, titulo: "Base diária", texto: "Atualizada todo dia às 6h." },
          ].map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo}>
              <Icon className="mb-2 h-4 w-4 text-accent" strokeWidth={1.75} />
              <p className="font-medium text-foreground/90">{titulo}</p>
              <p>{texto}</p>
            </div>
          ))}
        </footer>
      </section>

      {/* ── LADO DIREITO: formulário ── */}
      <section className="relative flex w-full flex-col overflow-y-auto border-white/[0.06] bg-[#0b0f19] lg:w-[460px] lg:shrink-0 lg:border-l">
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-sm">
            {/* Logo mobile */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sil-logo.png" alt="" className="h-8 w-auto" />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">SIL</p>
                <p className="text-xs text-muted">Inteligência Analítica</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Entrar</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use o e-mail cadastrado pela sua empresa.</p>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-foreground/80">E-mail</span>
                <span className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] pl-10 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/70 focus:ring-4 focus:ring-accent/10"
                  />
                  {isLookingUp ? (
                    <LoaderCircle className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
                  ) : userFound ? (
                    <Check className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                  ) : null}
                </span>
              </label>

              {!isLookingUp && emailChecked && !userFound && (
                <p className="-mt-2 flex items-start gap-2 text-xs leading-5 text-red-300">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  E-mail não cadastrado. Solicite acesso ao administrador.
                </p>
              )}

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-foreground/80">Nome</span>
                <span className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={isLookingUp ? "Buscando..." : "Preenchido pelo e-mail"}
                    disabled={isLookingUp}
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] pl-10 pr-3.5 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/70 focus:ring-4 focus:ring-accent/10 disabled:opacity-50"
                  />
                </span>
              </label>

              {!isLookingUp && userFound && role !== "admin" && selectedCompany && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-sm">
                  <span className="text-muted">Empresa</span>
                  <span className="truncate font-medium text-foreground">{selectedCompany.name}</span>
                </div>
              )}

              {role === "admin" && isReady && !canAccessAdminSurface ? (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs leading-6 text-muted">
                  <p className="mb-1 text-sm font-medium text-foreground">Admin somente no computador</p>
                  {isStandalone
                    ? "No app instalado, o acesso continua pelo chat. O painel admin fica disponível apenas no navegador do computador."
                    : "Em celular ou tablet, o login continua pelo chat. O painel admin fica disponível apenas no navegador do computador."}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="group mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition hover:bg-accent/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Entrar
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </form>
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 px-6 pb-6 text-[11px] text-muted/80">
          <ShieldCheck className="h-3.5 w-3.5" />
          Acesso restrito a usuários cadastrados
        </p>
      </section>
    </main>
  );
}
