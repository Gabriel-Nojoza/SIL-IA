"use client";

import type { SilResponse } from "./types";
import { TextBlock } from "./blocks/TextBlock";
import { ChartBlock } from "./blocks/ChartBlock";
import { TableBlock } from "./blocks/TableBlock";
import { InsightBlock } from "./blocks/InsightBlock";
import { ActionBlock } from "./blocks/ActionBlock";

function Fonte({ fonte }: { fonte: NonNullable<SilResponse["fonte"]> }) {
  if (!fonte.dadosAte) return null;

  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted">
      <span
        className={`h-1.5 w-1.5 rounded-full ${fonte.defasada ? "bg-yellow-400" : "bg-success"}`}
        aria-hidden
      />
      Dados até {fonte.dadosAte}
      {fonte.atualizadoEm ? ` · atualizado em ${fonte.atualizadoEm}` : " · atualização não confirmada"}
    </p>
  );
}

export function SilBubble({ response }: { response: SilResponse }) {
  return (
    <div className="flex flex-col gap-3">
      {response.blocks.map((block, i) => {
        switch (block.type) {
          case "text":    return <TextBlock    key={i} block={block} />;
          case "chart":   return <ChartBlock   key={i} block={block} />;
          case "table":   return <TableBlock   key={i} block={block} />;
          case "insight": return <InsightBlock key={i} block={block} />;
          case "action":  return <ActionBlock  key={i} block={block} />;
          default:        return null;
        }
      })}
      {response.fonte ? <Fonte fonte={response.fonte} /> : null}
    </div>
  );
}
