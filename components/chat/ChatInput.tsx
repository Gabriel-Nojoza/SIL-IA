import { KeyboardEvent, useEffect, useRef } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cresce com o texto até ~6 linhas; depois rola por dentro
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-card/80 p-2 shadow-soft transition focus-within:border-accent/60">
        <label className="sr-only" htmlFor="chat-input">
          Digite sua pergunta
        </label>

        <textarea
          ref={textareaRef}
          id="chat-input"
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre vendas, clientes ou produtos..."
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-6 text-foreground outline-none placeholder:text-muted sm:text-sm"
          disabled={disabled}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Enviar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowUp size={18} />}
        </button>
      </div>

      <p className="mt-2 hidden text-center text-[11px] text-muted/80 sm:block">
        Enter envia · Shift + Enter quebra a linha · A SIL pode errar: confira números importantes.
      </p>
    </div>
  );
}
