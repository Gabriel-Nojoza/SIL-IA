"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { ChatMessage } from "@/types/chat";

interface Session {
  session_id: string;
  first_message: string;
  created_at: string;
}

interface HistorySidebarProps {
  userId: string;
  currentSessionId: string;
  refreshTick?: number;
  onSelectSession: (sessionId: string, messages: ChatMessage[]) => void;
  onNewChat: () => void;
}

export function HistorySidebar({ userId, currentSessionId, refreshTick, onSelectSession, onNewChat }: HistorySidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSessions(showSpinner = true) {
    if (!userId) return;
    if (showSpinner) setLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const { data } = await supabase
        .from("conversation_logs")
        .select("session_id, messages, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data) { setSessions([]); return; }

      const seen = new Set<string>();
      const grouped: Session[] = [];
      for (const row of data) {
        if (seen.has(row.session_id)) continue;
        seen.add(row.session_id);
        const msgs: ChatMessage[] = Array.isArray(row.messages) ? row.messages : [];
        const first = msgs.find((m) => m.role === "user")?.content ?? "Nova conversa";
        grouped.push({ session_id: row.session_id, first_message: first, created_at: row.created_at });
      }
      setSessions(grouped);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSessions(true); }, [userId]);
  useEffect(() => { if (refreshTick) void loadSessions(false); }, [refreshTick]);

  async function handleDelete(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const supabase = getSupabaseBrowserClient();
    await supabase.from("conversation_logs").delete().eq("session_id", sessionId).eq("user_id", userId);
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    if (sessionId === currentSessionId) onNewChat();
  }

  async function handleSelect(sessionId: string) {
    if (sessionId === currentSessionId) return;
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("conversation_logs")
      .select("messages")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const msgs: ChatMessage[] = (data ?? []).flatMap((r) =>
      Array.isArray(r.messages) ? r.messages : []
    );
    onSelectSession(sessionId, msgs);
  }

  // sessions já vem da mais recente para a mais antiga, então os grupos saem em ordem
  const grupos: { titulo: string; itens: Session[] }[] = [];
  for (const s of sessions) {
    const titulo = grupoDaData(s.created_at);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.titulo === titulo) ultimo.itens.push(s);
    else grupos.push({ titulo, itens: [s] });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-2 pt-4">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90"
        >
          <Plus size={16} />
          Nova conversa
        </button>
      </div>

      <div className="chat-scrollbar flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <p className="px-3 py-3 text-xs text-muted">Carregando...</p>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-3 text-xs leading-5 text-muted">
            Suas conversas aparecem aqui. Faça a primeira pergunta para começar.
          </p>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.titulo} className="mt-3">
              <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted/80">
                {grupo.titulo}
              </p>
              {grupo.itens.map((s) => (
                <div
                  key={s.session_id}
                  className={`group relative flex items-center rounded-lg transition hover:bg-white/[0.05] ${
                    s.session_id === currentSessionId ? "bg-white/[0.07]" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(s.session_id)}
                    className="min-w-0 flex-1 px-3 py-2 text-left"
                    title={s.first_message}
                  >
                    <p
                      className={`truncate text-sm ${
                        s.session_id === currentSessionId ? "text-foreground" : "text-foreground/80"
                      }`}
                    >
                      {s.first_message}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(s.session_id, e)}
                    className="mr-1 flex shrink-0 rounded p-1.5 text-muted/60 transition hover:text-red-400 sm:hidden sm:group-hover:flex"
                    title="Apagar conversa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function grupoDaData(iso: string) {
  const agora = new Date();
  const inicioDeHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const umDia = 86_400_000;
  const t = new Date(iso).getTime();
  if (t >= inicioDeHoje) return "Hoje";
  if (t >= inicioDeHoje - umDia) return "Ontem";
  if (t >= inicioDeHoje - 6 * umDia) return "Últimos 7 dias";
  return "Anteriores";
}
