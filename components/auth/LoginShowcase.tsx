"use client";

import { useEffect, useState } from "react";

// Demonstração animada do lado esquerdo do login: uma conversa com a SIL que se repete sozinha
// e cartões com números em movimento. Os valores são ilustrativos, não vêm da base.

type Grafico = "barras" | "linha" | "ranking";

interface Cena {
  pergunta: string;
  resposta: string;
  grafico: Grafico;
}

interface Mensagem {
  id: number;
  autor: "usuario" | "sil";
  cena: Cena;
}

const CENAS: Cena[] = [
  {
    pergunta: "Qual a tendência de fechamento por equipe?",
    resposta: "Capital e Interior devem fechar acima da meta. Food Service precisa acelerar na última semana.",
    grafico: "barras",
  },
  {
    pergunta: "Como evoluiu o faturamento nos últimos 6 meses?",
    resposta: "Crescimento de 18% desde abril, com o melhor resultado em agosto.",
    grafico: "linha",
  },
  {
    pergunta: "Quais marcas têm a maior margem este mês?",
    resposta: "As três primeiras marcas concentram 41% do lucro do mês.",
    grafico: "ranking",
  },
];

const EQUIPES = [
  { nome: "Capital", pct: 108 },
  { nome: "Interior", pct: 101 },
  { nome: "Atacado", pct: 94 },
  { nome: "Food Service", pct: 86 },
];

const MESES = [
  { mes: "abr", valor: 41 },
  { mes: "mai", valor: 43.5 },
  { mes: "jun", valor: 42.8 },
  { mes: "jul", valor: 46.2 },
  { mes: "ago", valor: 49.9 },
  { mes: "set", valor: 48.4 },
];

const MARCAS = [
  { nome: "Marca A", margem: 31.4 },
  { nome: "Marca B", margem: 27.9 },
  { nome: "Marca C", margem: 24.2 },
  { nome: "Marca D", margem: 19.6 },
];

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prefereMenosMovimento() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function GraficoBarras() {
  const max = 120;
  return (
    <div className="relative mt-3 h-28">
      {/* Linha da meta (100%) */}
      <div className="absolute inset-x-0 border-t border-dashed border-white/25" style={{ bottom: `${(100 / max) * 100}%` }}>
        <span className="absolute -top-4 right-0 text-[10px] text-muted">meta</span>
      </div>
      <div className="flex h-full items-end gap-3">
        {EQUIPES.map((e, i) => (
          <div key={e.nome} className="flex h-full flex-1 flex-col justify-end">
            <span className="sil-fade mb-1 text-center text-[10px] tabular-nums text-foreground/80" style={{ animationDelay: `${0.5 + i * 0.12}s` }}>
              {e.pct}%
            </span>
            <div
              className={`sil-grow-y rounded-t-md ${e.pct >= 100 ? "bg-accent" : "bg-teal-400/70"}`}
              style={{ height: `${(e.pct / max) * 100}%`, animationDelay: `${i * 0.12}s` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-3">
        {EQUIPES.map((e) => (
          <span key={e.nome} className="flex-1 truncate text-center text-[10px] text-muted">{e.nome}</span>
        ))}
      </div>
    </div>
  );
}

function GraficoLinha() {
  const min = 38;
  const max = 52;
  const pontos = MESES.map((m, i) => ({
    x: (i / (MESES.length - 1)) * 300,
    y: 100 - ((m.valor - min) / (max - min)) * 100,
  }));
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

  return (
    <div className="mt-3">
      <svg viewBox="-6 -8 312 116" className="sil-reveal h-28 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sil-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${linha} L300 108 L0 108 Z`} fill="url(#sil-area)" />
        <path
          d={linha}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        {MESES.map((m) => (
          <span key={m.mes}>{m.mes}</span>
        ))}
      </div>
    </div>
  );
}

function GraficoRanking() {
  return (
    <div className="mt-3 grid gap-2">
      {MARCAS.map((m, i) => (
        <div key={m.nome} className="grid grid-cols-[4.5rem_1fr_2.75rem] items-center gap-3 text-[11px]">
          <span className="text-foreground/80">{m.nome}</span>
          <span className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <span
              className={`sil-grow-x block h-full rounded-full ${i < 3 ? "bg-accent" : "bg-teal-400/70"}`}
              style={{ width: `${(m.margem / 35) * 100}%`, animationDelay: `${i * 0.12}s` }}
            />
          </span>
          <span className="text-right tabular-nums text-foreground/80">{m.margem.toFixed(1).replace(".", ",")}%</span>
        </div>
      ))}
    </div>
  );
}

const GRAFICOS: Record<Grafico, () => React.JSX.Element> = {
  barras: GraficoBarras,
  linha: GraficoLinha,
  ranking: GraficoRanking,
};

function Conversa() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [digitando, setDigitando] = useState("");
  const [pensando, setPensando] = useState(false);

  useEffect(() => {
    if (prefereMenosMovimento()) {
      setMensagens([
        { id: 1, autor: "usuario", cena: CENAS[0] },
        { id: 2, autor: "sil", cena: CENAS[0] },
      ]);
      return;
    }

    let ativo = true;
    let id = 0;
    const adicionar = (autor: Mensagem["autor"], cena: Cena) =>
      setMensagens((atuais) => [...atuais.slice(-3), { id: ++id, autor, cena }]);

    (async () => {
      await esperar(600);
      for (let i = 0; ativo; i++) {
        const cena = CENAS[i % CENAS.length];

        for (let n = 1; n <= cena.pergunta.length && ativo; n++) {
          setDigitando(cena.pergunta.slice(0, n));
          await esperar(32);
        }
        await esperar(350);
        if (!ativo) break;

        setDigitando("");
        adicionar("usuario", cena);
        setPensando(true);
        await esperar(1300);
        if (!ativo) break;

        setPensando(false);
        adicionar("sil", cena);
        await esperar(5200);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/90 shadow-soft backdrop-blur">
      {/* Barra superior */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sil-logo.png" alt="" className="h-6 w-6 rounded-md" />
        <div className="leading-tight">
          <p className="text-xs font-semibold text-foreground">SIL</p>
          <p className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            online
          </p>
        </div>
        <span className="ml-auto rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-muted">demonstração</span>
      </div>

      {/* Mensagens: as novas entram por baixo e empurram as antigas para cima */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-hidden px-4 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_18%)]">
        {mensagens.map((m) => {
          if (m.autor === "usuario") {
            return (
              <div key={m.id} className="sil-enter flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-br-md border border-accent/30 bg-accent/15 px-3.5 py-2 text-[13px] text-foreground">
                  {m.cena.pergunta}
                </p>
              </div>
            );
          }
          const Grafico = GRAFICOS[m.cena.grafico];
          return (
            <div key={m.id} className="sil-enter flex gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sil-logo.png" alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                <p className="text-[13px] leading-5 text-foreground/85">{m.cena.resposta}</p>
                <Grafico />
              </div>
            </div>
          );
        })}

        {pensando && (
          <div className="sil-enter flex gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sil-logo.png" alt="" className="h-6 w-6 shrink-0 rounded-md" />
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="sil-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Campo de digitação */}
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px]">
          <span className={`min-w-0 flex-1 truncate ${digitando ? "text-foreground" : "text-muted/60"}`}>
            {digitando || "Pergunte sobre faturamento, metas, clientes..."}
            {digitando && <span className="sil-caret ml-px inline-block h-3.5 w-px translate-y-0.5 bg-accent" />}
          </span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${digitando ? "bg-accent text-white" : "bg-white/[0.05] text-muted"}`}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function CartaoFaturamento() {
  const [serie, setSerie] = useState(() => [30, 34, 31, 38, 36, 42, 40, 45, 43, 49, 47, 52, 50, 55]);
  const [valor, setValor] = useState(48.35);

  useEffect(() => {
    if (prefereMenosMovimento()) return;
    const timer = setInterval(() => {
      setSerie((s) => {
        const ultimo = s[s.length - 1];
        const proximo = Math.min(70, Math.max(25, ultimo + (Math.random() * 10 - 4.5)));
        return [...s.slice(1), proximo];
      });
      setValor((v) => v + Math.random() * 0.04);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const pontos = serie
    .map((v, i) => `${(i / (serie.length - 1)) * 100},${36 - ((v - min) / (max - min || 1)) * 32}`)
    .join(" ");

  return (
    <div className="sil-float w-56 rounded-2xl border border-white/[0.08] bg-[#0e1320]/95 p-4 shadow-soft backdrop-blur">
      <p className="text-[11px] text-muted">Faturamento do mês</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
        R$ {valor.toFixed(2).replace(".", ",")} mi
      </p>
      <p className="mt-0.5 text-[11px] text-success">▲ 6,2% vs ano passado</p>
      <svg viewBox="0 0 100 40" className="mt-3 h-10 w-full" preserveAspectRatio="none">
        <polyline
          points={pontos}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function CartaoMeta() {
  const pct = 83;
  const raio = 22;
  const circ = 2 * Math.PI * raio;
  const [cheio, setCheio] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCheio(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="sil-float flex w-56 items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0e1320]/95 p-4 shadow-soft backdrop-blur" style={{ animationDelay: "-3s" }}>
      <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0 -rotate-90">
        <circle cx="28" cy="28" r={raio} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={raio}
          fill="none"
          stroke="rgb(45 212 191)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={cheio ? circ * (1 - pct / 100) : circ}
          className="transition-[stroke-dashoffset] duration-[1600ms] ease-out motion-reduce:transition-none"
        />
      </svg>
      <div>
        <p className="text-[11px] text-muted">Meta do mês</p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{pct}%</p>
        <p className="text-[11px] text-muted">tendência de 97%</p>
      </div>
    </div>
  );
}

export function LoginShowcase() {
  return (
    <div className="relative h-full">
      <div className="absolute inset-y-0 left-0 right-0 xl:right-[216px]">
        <Conversa />
      </div>
      <div className="absolute right-0 top-16 z-10 hidden xl:block">
        <CartaoFaturamento />
      </div>
      <div className="absolute bottom-24 right-0 z-10 hidden xl:block">
        <CartaoMeta />
      </div>

      <style>{`
        @keyframes sil-enter { from { opacity: 0; transform: translateY(10px) } }
        @keyframes sil-fade { from { opacity: 0 } }
        @keyframes sil-grow-y { from { transform: scaleY(0) } }
        @keyframes sil-grow-x { from { transform: scaleX(0) } }
        @keyframes sil-reveal { from { clip-path: inset(-10% 100% -10% 0) } to { clip-path: inset(-10% 0 -10% 0) } }
        @keyframes sil-dot { 0%, 80%, 100% { opacity: .3; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-3px) } }
        @keyframes sil-caret { 50% { opacity: 0 } }
        @keyframes sil-float { 50% { transform: translateY(-8px) } }
        .sil-enter { animation: sil-enter .45s cubic-bezier(.22,1,.36,1) both }
        .sil-fade { animation: sil-fade .6s ease both }
        .sil-grow-y { transform-origin: bottom; animation: sil-grow-y .9s cubic-bezier(.22,1,.36,1) both }
        .sil-grow-x { transform-origin: left; animation: sil-grow-x .9s cubic-bezier(.22,1,.36,1) both }
        .sil-reveal { animation: sil-reveal 1.4s cubic-bezier(.4,0,.2,1) both }
        .sil-dot { animation: sil-dot 1s infinite ease-in-out }
        .sil-caret { animation: sil-caret 1s steps(1) infinite }
        .sil-float { animation: sil-float 6s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) {
          .sil-enter, .sil-fade, .sil-grow-y, .sil-grow-x, .sil-reveal, .sil-dot, .sil-caret, .sil-float { animation: none }
        }
      `}</style>
    </div>
  );
}
