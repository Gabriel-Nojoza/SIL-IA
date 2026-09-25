import { useEffect, useRef, memo } from "react";
import Image from "next/image";
import { Package, TrendingUp, Trophy, Users } from "lucide-react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { ChatMessage } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  userName: string;
  companyName: string;
  onSuggestion: (pergunta: string) => void;
}

const SUGESTOES = [
  { icon: Trophy, titulo: "Ranking de vendedores", pergunta: "Quais os 5 vendedores que mais faturaram no mês passado?" },
  { icon: TrendingUp, titulo: "Evolução do faturamento", pergunta: "Como evoluiu o faturamento nos últimos 6 meses?" },
  { icon: Users, titulo: "Maiores clientes", pergunta: "Quais os 10 clientes que mais compraram este mês?" },
  { icon: Package, titulo: "Margem por produto", pergunta: "Quais produtos tiveram a maior margem no mês passado?" },
];

const MemoizedBubble = memo(MessageBubble, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.status === next.message.status &&
    prev.message.content === next.message.content
  );
});

export function MessageList({ messages, isSending, error, userName, companyName, onSuggestion }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;
  const primeiroNome = userName.trim().split(/\s+/)[0] || "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  return (
    <div className="chat-scrollbar flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6">
      {isEmpty ? (
        <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center py-6 text-center">
          <Image
            src="/sil-logo.png"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-2xl border border-border/60 bg-card object-contain"
          />
          <h2 className="mt-5 text-2xl font-semibold text-foreground sm:text-3xl">
            {primeiroNome ? `Olá, ${primeiroNome}` : "Olá!"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Pergunte sobre vendas, clientes e produtos{companyName ? ` da ${companyName}` : ""}. A SIL consulta
            os dados e responde com tabelas, gráficos e análises.
          </p>

          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            {SUGESTOES.map(({ icon: Icon, titulo, pergunta }) => (
              <button
                key={titulo}
                type="button"
                onClick={() => onSuggestion(pergunta)}
                disabled={isSending}
                className="group flex gap-3 rounded-xl border border-border/60 bg-white/[0.03] p-4 text-left transition hover:border-accent/50 hover:bg-accent/[0.06] disabled:opacity-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{titulo}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted group-hover:text-foreground/80">
                    {pergunta}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-6 w-full rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-left text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.map((message) => (
            <MemoizedBubble key={message.id} message={message} />
          ))}

          {isSending ? <TypingIndicator /> : null}

          {error ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
