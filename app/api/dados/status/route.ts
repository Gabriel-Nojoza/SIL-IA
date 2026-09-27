import { NextResponse } from "next/server";
import { autorizar, lerStatus, respostaErro } from "@/lib/sil-dados/base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chamado pelo chat (n8n) antes de cada pergunta: quando foi a última carga da base
export async function GET(request: Request) {
  try {
    autorizar(request);
    const companyId = new URL(request.url).searchParams.get("company_id") ?? "";
    return NextResponse.json({ ok: true, ...(await lerStatus(companyId)) });
  } catch (error) {
    return respostaErro(error);
  }
}
