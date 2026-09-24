import { createWriteStream, existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { timingSafeEqual } from "node:crypto";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";

// Base consultada pela SIL: gerada todo dia pelo SIL_DATA_EXPORT (n8n) a partir dos CSVs do Power BI.
// Cada empresa tem seu próprio arquivo DuckDB, então uma consulta nunca enxerga dados de outra.

export const TABELAS = ["base_comercial", "base_clientes", "base_produtos"] as const;
export type Tabela = (typeof TABELAS)[number];

const DATA_DIR = process.env.SIL_DADOS_DIR || path.join(process.cwd(), ".sil-dados");
const MAX_LINHAS = 2000;
const TIMEOUT_MS = 15_000;
const MEMORY_LIMIT = "2GB";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class ErroDados extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function autorizar(request: Request) {
  const token = process.env.SIL_DADOS_TOKEN;
  if (!token) {
    throw new ErroDados(503, "SIL_DADOS_TOKEN nao configurado no servidor.");
  }

  const recebido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${token}`);
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) {
    throw new ErroDados(401, "Token invalido.");
  }
}

function arquivoBase(companyId: string) {
  if (!UUID_RE.test(companyId)) {
    throw new ErroDados(400, "company_id invalido.");
  }
  return path.join(DATA_DIR, companyId, "sil.duckdb");
}

// Mesmo padrão que a IA usa no SQL: "Vl_Faturados" -> "vl_faturados", "Mês_Ano" -> "mes_ano"
function nomeColuna(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function literalSql(texto: string) {
  return `'${texto.replaceAll("'", "''")}'`;
}

async function linhas(con: DuckDBConnection, sql: string, params: string[] = []) {
  const reader = await con.runAndReadAll(sql, params);
  return reader.getRowObjectsJson();
}

const cargasEmAndamento = new Set<string>();

export async function carregarBase(companyId: string, arquivos: Record<Tabela, File>) {
  const destino = arquivoBase(companyId);
  if (cargasEmAndamento.has(companyId)) {
    throw new ErroDados(409, "Ja existe uma carga em andamento para esta empresa.");
  }

  cargasEmAndamento.add(companyId);
  const tmp = path.join(path.dirname(destino), `.carga-${Date.now()}`);

  try {
    await mkdir(tmp, { recursive: true });
    const novaBase = path.join(tmp, "sil.duckdb");
    const instance = await DuckDBInstance.create(novaBase, { memory_limit: MEMORY_LIMIT });
    const con = await instance.connect();
    const contagem = {} as Record<Tabela, number>;
    const carregadoEm = new Date().toISOString();

    try {
      for (const tabela of TABELAS) {
        const csv = path.join(tmp, `${tabela}.csv`);
        await pipeline(
          Readable.fromWeb(arquivos[tabela].stream() as unknown as WebReadableStream),
          createWriteStream(csv),
        );

        // sample_size = -1: lê o arquivo todo para decidir os tipos
        // (Fat_AnoPassado e Crescimento_Pct só vêm preenchidos no último mês)
        await con.run(
          `create table ${tabela} as select * from read_csv(${literalSql(csv.replaceAll("\\", "/"))}, header = true, delim = ',', quote = '"', escape = '"', sample_size = -1)`,
        );

        const colunas = await linhas(
          con,
          "select column_name from information_schema.columns where table_name = ?",
          [tabela],
        );
        for (const { column_name } of colunas) {
          const atual = String(column_name);
          const novo = nomeColuna(atual);
          if (novo && novo !== atual) {
            await con.run(
              `alter table ${tabela} rename column "${atual.replaceAll('"', '""')}" to "${novo}"`,
            );
          }
        }

        const [{ n }] = await linhas(con, `select count(*)::integer as n from ${tabela}`);
        contagem[tabela] = Number(n);
        if (contagem[tabela] === 0) {
          throw new ErroDados(422, `${tabela} veio vazia; a base anterior foi mantida.`);
        }
      }

      await con.run(
        "create table _carga as select ?::timestamptz as carregado_em, ?::varchar as linhas",
        [carregadoEm, JSON.stringify(contagem)],
      );
      await con.run("checkpoint");
    } finally {
      con.closeSync();
      instance.closeSync();
    }

    // Troca atômica: consultas em andamento terminam na base anterior
    await rename(novaBase, destino);
    return { carregado_em: carregadoEm, linhas: contagem };
  } finally {
    cargasEmAndamento.delete(companyId);
    await rm(tmp, { recursive: true, force: true });
  }
}

async function abrirLeitura(companyId: string) {
  const arquivo = arquivoBase(companyId);
  if (!existsSync(arquivo)) {
    throw new ErroDados(404, "Nenhuma carga encontrada para esta empresa.");
  }

  // Sem acesso a arquivos/rede: o SQL da IA só enxerga as tabelas desta base
  const instance = await DuckDBInstance.create(arquivo, {
    access_mode: "READ_ONLY",
    enable_external_access: "false",
    memory_limit: MEMORY_LIMIT,
    threads: "2",
    lock_configuration: "true",
  });
  const con = await instance.connect();
  const fechar = () => {
    con.closeSync();
    instance.closeSync();
  };
  return { con, fechar };
}

function valorJson(valor: unknown): unknown {
  if (valor === null || typeof valor !== "object") {
    return typeof valor === "bigint" ? Number(valor) : valor;
  }
  if ("toDouble" in valor && typeof valor.toDouble === "function") {
    return valor.toDouble();
  }
  return String(valor);
}

export async function lerEsquema(companyId: string) {
  const { con, fechar } = await abrirLeitura(companyId);

  try {
    const colunas = await linhas(
      con,
      `select table_name, column_name, data_type from information_schema.columns
        where table_name in (${TABELAS.map(literalSql).join(", ")})
        order by table_name, ordinal_position`,
    );
    const [carga] = await linhas(con, "select carregado_em::varchar as carregado_em, linhas from _carga");

    const tabelas: Record<string, { colunas: { nome: string; tipo: string }[]; amostra: unknown[] }> = {};
    for (const { table_name, column_name, data_type } of colunas) {
      const tabela = String(table_name);
      tabelas[tabela] ??= { colunas: [], amostra: [] };
      tabelas[tabela].colunas.push({ nome: String(column_name), tipo: String(data_type) });
    }
    // Algumas linhas de exemplo ajudam a IA a acertar formatos (ex.: mes_ano, filial)
    for (const tabela of TABELAS) {
      if (tabelas[tabela]) {
        tabelas[tabela].amostra = await linhas(con, `select * from ${tabela} limit 3`);
      }
    }

    return {
      carregado_em: carga?.carregado_em ?? null,
      linhas: carga ? JSON.parse(String(carga.linhas)) : null,
      tabelas,
    };
  } finally {
    fechar();
  }
}

export async function consultar(companyId: string, sqlBruto: string) {
  const sql = sqlBruto.trim().replace(/;+\s*$/, "").trim();
  if (sql.includes(";") || !/^(select|with)\b/i.test(sql)) {
    throw new ErroDados(400, "Envie apenas uma consulta SELECT por vez.");
  }

  const { con, fechar } = await abrirLeitura(companyId);
  const timer = setTimeout(() => con.interrupt(), TIMEOUT_MS);

  try {
    const reader = await con.runAndReadUntil(sql, MAX_LINHAS + 1);
    const colunas = reader.columnNames();
    const todas = reader.getRowObjects();
    const rows = todas.slice(0, MAX_LINHAS).map((linha) =>
      Object.fromEntries(Object.entries(linha).map(([k, v]) => [k, valorJson(v)])),
    );
    return { colunas, rows, total: rows.length, truncado: todas.length > MAX_LINHAS };
  } catch (error) {
    if (error instanceof ErroDados) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/interrupt/i.test(message)) {
      throw new ErroDados(408, "A consulta demorou demais. Tente filtrar mais os dados.");
    }
    // Volta para o n8n: a IA pode corrigir o SQL e tentar de novo
    throw new ErroDados(400, message);
  } finally {
    clearTimeout(timer);
    fechar();
  }
}

export function respostaErro(error: unknown) {
  if (error instanceof ErroDados) {
    return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
  }
  console.error("[/api/dados]", error);
  const message = error instanceof Error ? error.message : "Erro interno.";
  return NextResponse.json({ ok: false, message }, { status: 500 });
}
