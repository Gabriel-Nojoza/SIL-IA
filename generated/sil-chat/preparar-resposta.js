// SIL Chat — prompt curto para a IA escrever só o resumo e dizer como formatar.
// A tabela e o gráfico são montados no "Montar Blocos" com os dados reais da consulta.
const p = $('Preparar Pergunta').first().json;
const sql = $('Extrair SQL').first().json.sql;
const r = $input.first().json;
const MAX_LINHAS_IA = 30;

let situacao;
if (sql.includes("'falha_ia'")) situacao = 'falha';
else if (sql.includes("'sem_consulta'")) situacao = 'conversa';
else if (!r.ok) situacao = 'erro';
else if (!r.rows || !r.rows.length) situacao = 'vazio';
else situacao = 'dados';

let promptResposta;
if (situacao === 'conversa') {
  promptResposta = `Você é a SIL, assistente comercial da JA Distribuidora. Você responde perguntas sobre faturamento, vendedores, supervisores, clientes, produtos, margem, metas e tendência do mês.

Conversa anterior:
${p.conversa || '(nenhuma)'}

Mensagem do usuário: ${p.pergunta}

Responda em português, em 1 a 3 frases, APENAS com JSON: {"resumo": "sua resposta"}`;
} else if (situacao === 'dados') {
  // Linhas como listas (sem repetir o nome da coluna em cada uma) para gastar menos tokens
  const linhas = r.rows.slice(0, MAX_LINHAS_IA).map((l) => r.colunas.map((c) => l[c]));
  const dados = JSON.stringify({ colunas: r.colunas, linhas, total_linhas: r.rows.length });

  promptResposta = `Você é a SIL, assistente comercial da JA Distribuidora. Hoje é ${p.hoje}; o mês atual (${p.mesAtual}) está em andamento.

Pergunta: ${p.pergunta}

SQL executado:
${sql}

Resultado (até ${MAX_LINHAS_IA} linhas):
${dados}

O sistema monta a tabela e o gráfico automaticamente com esses dados. NÃO repita a lista de valores.
Responda APENAS com JSON válido, sem markdown:
{
  "resumo": "1 a 3 frases respondendo a pergunta com os números principais (R$ 1.234.567,89; 19,0%)",
  "titulo": "título curto da tabela",
  "colunas": {"<coluna>": {"nome": "Nome amigável", "formato": "moeda|percentual|numero|texto"}},
  "grafico": null,
  "insight": null
}
- "percentual" = a coluna é fração (0.19 → 19,0%). Veja no SQL se houve multiplicação por 100; nesse caso use "numero".
- "grafico": só se o usuário pediu gráfico, ou para evolução mês a mês (line) ou ranking (horizontal-bar). Formato: {"tipo": "bar|horizontal-bar|line|pie", "titulo": "...", "rotulo": "<coluna das categorias>", "valores": ["<coluna numérica>"]}
- "insight": algo relevante (queda, destaque, concentração) ou null. Formato: {"severity": "info|success|warning|danger", "content": "..."}
- Use SOMENTE números do resultado. Nunca invente valores.`;
} else {
  // falha / erro / vazio: o "Montar Blocos" responde com uma mensagem fixa; a IA nem precisa pensar
  promptResposta = 'Responda apenas com: {"resumo": ""}';
}

return [{ json: { situacao, promptResposta } }];
