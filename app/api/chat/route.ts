import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ChatHistoryEntry } from "@/types/chat";
import { buildSilResponse } from "@/lib/sil/formatter";
import { generateDax } from "@/lib/sil/dax-generator";
import { getPowerBiToken, executePowerBiDax } from "@/lib/powerbi/execute-query";
import { resolveIntent, isChartRequest, normalizeText } from "@/lib/sil/interpreter";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

async function getCompanyCredentials(companyId: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("companies")
      .select("tenant_id, client_id, client_secret, workspace_id, dataset_id, webhook_url")
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      // webhook_url column may not exist yet — retry without it
      const { data: fallback } = await supabase
        .from("companies")
        .select("tenant_id, client_id, client_secret, workspace_id, dataset_id")
        .eq("id", companyId)
        .maybeSingle();
      return fallback ? { ...fallback, webhook_url: null } : null;
    }

    return data ?? null;
  } catch {
    return null;
  }
}

function getPayloadMessage(payload: Record<string, unknown>) {
  return String(payload.chatInput ?? payload.message ?? "");
}

function getPayloadHistory(payload: Record<string, unknown>): ChatHistoryEntry[] {
  if (!Array.isArray(payload.history)) {
    return [];
  }

  return payload.history.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const candidate = entry as Partial<ChatHistoryEntry>;

    if (
      (candidate.role === "user" || candidate.role === "assistant") &&
      typeof candidate.content === "string"
    ) {
      return [{ role: candidate.role, content: candidate.content }];
    }

    return [];
  });
}

function isGenericChartPrompt(message: string) {
  const cleaned = normalizeText(message)
    .replace(
      /\b(gera|gerar|mostra|mostrar|mostre|abre|abrir|quero|me|o|a|um|uma|isso|esse|esta|pra|para|em|de|do|da|grafico|chart|visual)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length < 8;
}

function getLastUserMessage(history: ChatHistoryEntry[]) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (
      entry.role === "user" &&
      entry.content.trim() &&
      !isGenericChartPrompt(entry.content)
    ) {
      return entry.content.trim();
    }
  }

  return null;
}

function buildChartContextErrorResponse() {
  return NextResponse.json({
    blocks: [
      {
        type: "insight",
        severity: "warning",
        icon: "!",
        content:
          "Eu consigo gerar o grafico, mas preciso de uma consulta anterior no contexto. Primeiro pergunte algo como vendas por vendedor ou faturamento por mes.",
      },
    ],
    message: "Preciso de uma consulta anterior para gerar o grafico.",
  });
}

async function runSilEngine(payload: Record<string, unknown>): Promise<NextResponse> {
  const message = getPayloadMessage(payload);
  const history = getPayloadHistory(payload);
  const chartRequested = isChartRequest(message);
  const previousUserMessage = getLastUserMessage(history);
  const baseMessage =
    chartRequested && isGenericChartPrompt(message) ? previousUserMessage : message;
  const companyId = String(payload.company_id ?? "");
  const workspaceId = String(payload.workspace_id ?? "");
  const datasetId = String(payload.dataset_id ?? "");

  if (chartRequested && isGenericChartPrompt(message) && !baseMessage) {
    return buildChartContextErrorResponse();
  }

  const resolvedMessage = baseMessage ?? message;
  const intent = await resolveIntent(resolvedMessage);
  const dax = generateDax(intent);
  const credentials = await getCompanyCredentials(companyId);

  const tenantId = credentials?.tenant_id || process.env.POWERBI_TENANT_ID || "";
  const clientId = credentials?.client_id || process.env.POWERBI_CLIENT_ID || "";
  const clientSecret =
    credentials?.client_secret || process.env.POWERBI_CLIENT_SECRET || "";
  const resolvedWorkspaceId = credentials?.workspace_id || workspaceId;
  const resolvedDatasetId = credentials?.dataset_id || datasetId;

  if (
    !tenantId ||
    !clientId ||
    !clientSecret ||
    !resolvedWorkspaceId ||
    !resolvedDatasetId
  ) {
    return NextResponse.json(
      {
        message: "Credenciais do Power BI nao configuradas para esta empresa.",
        intent,
        dax,
        rows: [],
      },
      { status: 500 },
    );
  }

  const token = await getPowerBiToken(tenantId, clientId, clientSecret);
  const rows = await executePowerBiDax(
    resolvedWorkspaceId,
    resolvedDatasetId,
    token,
    dax,
  );
  const { message: answer, response } = buildSilResponse(rows, intent, {
    chartRequested,
  });

  return NextResponse.json({
    ...response,
    message: answer,
    intent,
    dax,
    rows,
    sourceQuery: resolvedMessage,
  });
}

type RawDataset = { data?: unknown; values?: unknown; [key: string]: unknown };

function normalizeChartBlock(block: Record<string, unknown>): Record<string, unknown> {
  if (block.type !== "chart") return block;

  // Already nested under `data` — just fix `data` → `values` inside datasets if needed
  if (block.data && typeof block.data === "object" && !Array.isArray(block.data)) {
    const d = block.data as Record<string, unknown>;
    if (Array.isArray(d.datasets)) {
      d.datasets = d.datasets.map((ds: RawDataset) =>
        Array.isArray(ds.data) && !ds.values ? { ...ds, values: ds.data, data: undefined } : ds,
      );
    }
    return block;
  }

  // Flat format from n8n: labels + datasets at block root level
  if (Array.isArray(block.labels) && Array.isArray(block.datasets)) {
    const datasets = (block.datasets as RawDataset[]).map((ds) =>
      Array.isArray(ds.data) && !ds.values ? { ...ds, values: ds.data, data: undefined } : ds,
    );
    const { labels, datasets: _ds, ...rest } = block;
    return { ...rest, data: { labels, datasets } };
  }

  return block;
}

function normalizeN8nBlocks(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.blocks)) return body;
  return {
    ...obj,
    blocks: obj.blocks.map((b) =>
      b && typeof b === "object" ? normalizeChartBlock(b as Record<string, unknown>) : b,
    ),
  };
}

async function runN8n(payload: unknown, webhookUrl?: string): Promise<NextResponse> {
  if (!webhookUrl) {
    throw new Error("Webhook do n8n nao configurado para este usuario ou empresa.");
  }

  // Remove `history` from the payload — n8n manages its own session memory via sessionId.
  // Sending both causes the AI Agent to receive duplicate context and fail on turn 2+.
  // `historico` (últimas mensagens) é lido pelo chat do SIL_DATA_EXPORT, que não tem memória própria.
  const { history: _history, ...rest } = payload as Record<string, unknown>;
  const n8nPayload = {
    ...rest,
    historico: getPayloadHistory(payload as Record<string, unknown>).slice(-6),
  };

  const url = webhookUrl;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(n8nPayload),
    cache: "no-store",
  });

  const text = await response.text();

  // HTML response (e.g. nginx 504/502 error page) — return a friendly message instead of raw HTML
  if (text.trimStart().startsWith("<")) {
    const friendly =
      response.status === 504 || response.status === 524
        ? "O servidor está demorando para responder. Tente novamente em alguns instantes."
        : response.status === 502 || response.status === 503
          ? "O serviço está temporariamente indisponível. Tente novamente em breve."
          : `Erro ${response.status} ao conectar com o n8n.`;
    return NextResponse.json({ message: friendly }, { status: response.status });
  }

  let body: unknown = text;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (body && typeof body === "object" && "blocks" in body) {
    const normalized = normalizeN8nBlocks(body);
    if (!response.ok) {
      return NextResponse.json(normalized, { status: response.status });
    }

    return NextResponse.json(normalized);
  }

  // n8n returned a single block object directly (e.g. { type: "chart", ... })
  if (body && typeof body === "object" && "type" in body) {
    const wrapped = { blocks: [body] };
    const normalized = normalizeN8nBlocks(wrapped);
    return NextResponse.json(normalized, response.ok ? undefined : { status: response.status });
  }

  // n8n returned an array of blocks directly
  if (Array.isArray(body) && body.length > 0 && body[0] && typeof body[0] === "object" && "type" in body[0]) {
    const wrapped = { blocks: body };
    const normalized = normalizeN8nBlocks(wrapped);
    return NextResponse.json(normalized, response.ok ? undefined : { status: response.status });
  }

  const candidate = body as Record<string, unknown> | null;
  const rawText =
    (typeof candidate?.message === "string" && candidate.message) ||
    (typeof candidate?.output === "string" && candidate.output) ||
    (typeof candidate?.content === "string" && candidate.content) ||
    (typeof body === "string" && body) ||
    "Webhook respondeu sem campo de mensagem reconhecido.";

  let structured: unknown = null;

  try {
    structured = JSON.parse(rawText);
  } catch {
    structured = null;
  }

  if (structured && typeof structured === "object" && "blocks" in structured) {
    const normalized = normalizeN8nBlocks(structured);
    if (!response.ok) {
      return NextResponse.json(normalized, { status: response.status });
    }

    return NextResponse.json(normalized);
  }

  // structured is a single block (e.g. { type: "chart", ... }) embedded in message/output field
  if (structured && typeof structured === "object" && "type" in structured) {
    const wrapped = { blocks: [structured] };
    const normalized = normalizeN8nBlocks(wrapped);
    return NextResponse.json(normalized, response.ok ? undefined : { status: response.status });
  }

  const silResponse = { blocks: [{ type: "text", content: rawText }] };

  if (!response.ok) {
    return NextResponse.json(
      { ...silResponse, message: rawText },
      { status: response.status },
    );
  }

  return NextResponse.json({ ...silResponse, message: rawText });
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Payload invalido." }, { status: 400 });
  }

  // Webhook do payload (usuário ou empresa) tem prioridade absoluta — vai direto pro n8n
  const payloadWebhook = (payload.webhook_url as string | undefined)?.trim() || "";

  // Se não veio no payload, busca webhook da empresa no banco
  let effectiveWebhook = payloadWebhook;
  if (!effectiveWebhook) {
    const companyId = String(payload.company_id ?? "");
    if (companyId) {
      const creds = await getCompanyCredentials(companyId);
      effectiveWebhook = creds?.webhook_url?.trim() || "";
    }
  }

  // Fallback: variável de ambiente global
  if (!effectiveWebhook) {
    effectiveWebhook = process.env.N8N_WEBHOOK_URL?.trim() || "";
  }

  if (effectiveWebhook) {
    try {
      return await runN8n(payload, effectiveWebhook);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Erro de rede.";
      return NextResponse.json({ message: reason }, { status: 502 });
    }
  }

  // Sem webhook → tenta engine SIL (Power BI direto)
  try {
    return await runSilEngine(payload);
  } catch (silError) {
    console.error(
      "[/api/chat] SIL engine falhou:",
      silError instanceof Error ? silError.message : silError,
    );
    const reason = silError instanceof Error ? silError.message : "Erro interno.";
    return NextResponse.json({ message: reason }, { status: 500 });
  }
}
