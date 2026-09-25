"use client";

import { useEffect, useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { MessageList } from "@/components/chat/MessageList";
import { HistorySidebar } from "@/components/chat/HistorySidebar";
import { sendChatMessage } from "@/lib/chat-service";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { createUuid } from "@/lib/uuid";
import { useAuthContext } from "@/hooks/use-auth-context";
import type { ChatMessage, ChatRequestPayload, MessageStatus } from "@/types/chat";

async function saveSession(sessionId: string, userId: string, companyId: string, messages: ChatMessage[]) {
  if (!sessionId || messages.length === 0) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("conversation_logs").upsert(
    { session_id: sessionId, user_id: userId, company_id: companyId, messages },
    { onConflict: "session_id" }
  );
  if (error) console.error("[saveSession]", error.message, error.code, error.details, error.hint);
}

export function ChatScreen() {
  const { user } = useAuthContext();
  const company = user?.company;
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setSessionId(createUuid());
  }, []);

  function handleNewChat() {
    setSessionId(createUuid());
    setMessages([]);
    setError(null);
  }

  async function handleSendMessage(texto?: string) {
    const trimmedInput = (texto ?? inputValue).trim();
    if (!trimmedInput || isSending) return;

    const activeSessionId = sessionId || createUuid();
    if (!sessionId) setSessionId(activeSessionId);

    const userMessage: ChatMessage = {
      id: createUuid(),
      role: "user",
      content: trimmedInput,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    if (!company) {
      setError("Nenhuma empresa vinculada ao usuario autenticado.");
      return;
    }

    const payload: ChatRequestPayload = {
      sessionId: activeSessionId,
      userId: user.userId,
      userName: user.name,
      userEmail: user.email,
      user_role: user.role,
      chatInput: trimmedInput,
      company_id: company.companyId,
      company_name: company.companyName,
      workspace_id: company.workspaceId,
      dataset_id: company.datasetId,
      webhook_url: user.webhookUrl || company.webhookUrl,
      history: messages
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    };

    const updatedWithUser = [...messages, { ...userMessage, status: "sending" as MessageStatus }];
    setMessages(updatedWithUser);
    setInputValue("");
    setError(null);
    setIsSending(true);

    try {
      const response = await sendChatMessage(payload);
      const finalMessages = updatedWithUser
        .map((m) => m.id === userMessage.id ? { ...m, status: "sent" as MessageStatus } : m)
        .concat(response.message);

      setMessages(finalMessages);
      await saveSession(activeSessionId, user.userId, company.companyId, finalMessages);
      setSidebarRefresh((n) => n + 1);
    } catch (sendError) {
      const msg = sendError instanceof Error ? sendError.message : "Ocorreu um erro inesperado.";
      setMessages((prev) =>
        prev.map((m) => m.id === userMessage.id ? { ...m, status: "error" as MessageStatus } : m),
      );
      setError(msg);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ChatLayout
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarClose={() => setMobileSidebarOpen(false)}
      sidebar={
        <HistorySidebar
          userId={user?.userId ?? ""}
          currentSessionId={sessionId}
          refreshTick={sidebarRefresh}
          onSelectSession={(sid, msgs) => { setSessionId(sid); setMessages(msgs); setMobileSidebarOpen(false); }}
          onNewChat={() => { handleNewChat(); setMobileSidebarOpen(false); }}
        />
      }
      header={
        <ChatHeader
          userName={user?.name ?? "Usuario"}
          userEmail={user?.email ?? ""}
          companyId={company?.companyId ?? ""}
          companyName={company?.companyName ?? ""}
          sessionId={sessionId}
          onHistoryClick={handleNewChat}
          onMobileHistoryOpen={() => setMobileSidebarOpen(true)}
        />
      }
      footer={
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={() => handleSendMessage()}
          disabled={isSending}
        />
      }
    >
      <MessageList
        messages={messages}
        isSending={isSending}
        error={error}
        userName={user?.name ?? ""}
        companyName={company?.companyName ?? ""}
        onSuggestion={(pergunta) => handleSendMessage(pergunta)}
      />
    </ChatLayout>
  );
}
