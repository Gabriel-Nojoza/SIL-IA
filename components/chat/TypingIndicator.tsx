import { SilAvatar } from "@/components/chat/SilAvatar";

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <SilAvatar />
      <div className="min-w-0">
        <p className="mb-1.5 text-xs font-medium text-muted">SIL</p>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
          </span>
          Analisando os dados...
        </div>
      </div>
    </div>
  );
}
