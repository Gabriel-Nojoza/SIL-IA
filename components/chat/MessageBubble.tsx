"use client";

import { SilAvatar } from "@/components/chat/SilAvatar";
import { SilBubble } from "@/components/sil/SilBubble";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <article className="flex w-full flex-col items-end" aria-live="polite">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-accent/30 bg-accent/15 px-4 py-2.5 text-foreground sm:max-w-[70%]">
          <p className="whitespace-pre-wrap text-sm leading-6 sm:text-[15px]">{message.content}</p>
        </div>
        {message.status === "sending" ? (
          <span className="mt-1 text-xs text-muted">Enviando...</span>
        ) : message.status === "error" ? (
          <span className="mt-1 text-xs text-red-300">Não foi enviada</span>
        ) : null}
      </article>
    );
  }

  return (
    <article className="flex w-full gap-3" aria-live="polite">
      <SilAvatar />
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-xs font-medium text-muted">SIL</p>
        {message.silResponse ? (
          <SilBubble response={message.silResponse} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90 sm:text-[15px]">
            {message.content}
          </p>
        )}
      </div>
    </article>
  );
}
