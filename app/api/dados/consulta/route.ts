import { NextResponse } from "next/server";
import { autorizar, consultar, ErroDados, respostaErro } from "@/lib/sil-dados/base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chamado pelo chat (n8n): { company_id, sql } -> linhas da consulta
export async function POST(request: Request) {
  try {
    autorizar(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.sql !== "string") {
      throw new ErroDados(400, "Envie { company_id, sql }.");
    }

    const resultado = await consultar(String(body.company_id ?? ""), body.sql);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    return respostaErro(error);
  }
}
