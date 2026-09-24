import { NextResponse } from "next/server";
import { autorizar, lerEsquema, respostaErro } from "@/lib/sil-dados/base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Colunas, tipos e exemplos de cada tabela: vai no prompt da IA que escreve o SQL
export async function GET(request: Request) {
  try {
    autorizar(request);
    const companyId = new URL(request.url).searchParams.get("company_id") ?? "";
    return NextResponse.json({ ok: true, ...(await lerEsquema(companyId)) });
  } catch (error) {
    return respostaErro(error);
  }
}
