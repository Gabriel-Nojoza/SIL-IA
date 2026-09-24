import { NextResponse } from "next/server";
import { autorizar, carregarBase, ErroDados, respostaErro, TABELAS, type Tabela } from "@/lib/sil-dados/base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chamado pelo SIL_DATA_EXPORT (n8n) às 06h: multipart com company_id + base_comercial, base_clientes, base_produtos
export async function POST(request: Request) {
  try {
    autorizar(request);
    const form = await request.formData();
    const companyId = String(form.get("company_id") ?? "");

    const arquivos = {} as Record<Tabela, File>;
    for (const tabela of TABELAS) {
      const arquivo = form.get(tabela);
      if (!(arquivo instanceof File)) {
        throw new ErroDados(400, `Arquivo ${tabela} nao enviado.`);
      }
      arquivos[tabela] = arquivo;
    }

    const resultado = await carregarBase(companyId, arquivos);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    return respostaErro(error);
  }
}
