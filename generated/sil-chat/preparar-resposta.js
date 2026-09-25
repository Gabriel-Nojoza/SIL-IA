// SIL Chat — monta o prompt que transforma o resultado da consulta em blocos da SIL
const p = $('Preparar Pergunta').first().json;
const sql = $('Extrair SQL').first().json.sql;
const r = $input.first().json;

let dados;
if (sql.includes("'falha_ia'")) {
  dados = 'A consulta não foi feita por uma falha temporária. Diga que não conseguiu responder agora e peça para tentar novamente em instantes.';
} else if (sql.includes("'sem_consulta'")) {
  dados = 'Nenhuma consulta foi necessária: é uma pergunta de conversa geral.';
} else if (!r.ok) {
  dados = 'A consulta falhou: ' + (r.message || 'erro desconhecido');
} else {
  dados = JSON.stringify({
    colunas: r.colunas,
    linhas: r.rows.slice(0, 150),
    total_linhas: r.total,
    truncado: r.truncado || r.rows.length > 150,
  });
}

const promptResposta = `Você é a SIL, assistente comercial da JA Distribuidora. Responda em português do Brasil, de forma direta e útil para um gestor.

Hoje é ${p.hoje}. O mês atual (${p.mesAtual}) está em andamento, então não o compare como se estivesse fechado.

Conversa anterior:
${p.conversa || '(nenhuma)'}

Pergunta: ${p.pergunta}

SQL executado:
${sql}

Resultado:
${dados}

Regras:
- Use SOMENTE os números do resultado. Nunca invente valores. Se o resultado vier vazio, diga que não encontrou dados para aquele filtro.
- Se a consulta falhou, diga que não conseguiu buscar essa informação e sugira reformular a pergunta. Não mostre o SQL nem o erro técnico.
- Valores em R$ no formato brasileiro (R$ 1.234.567,89). Colunas de fração (margem, pct_meta, crescimento) viram porcentagem: 0.19 → 19,0%.
- Para listas com mais de 3 itens, use um bloco "table".
- Use "chart" quando o usuário pedir gráfico, ou para evolução mês a mês (line) e rankings (horizontal-bar). Nos gráficos, values são números puros (sem R$).
- Termine com um "insight" curto quando houver algo relevante (queda, destaque, concentração).

Responda APENAS com JSON válido, sem markdown, neste formato:
{"blocks": [ ...blocos... ]}

Tipos de bloco permitidos:
{"type":"text","content":"texto"}
{"type":"insight","severity":"info|success|warning|danger","content":"texto"}
{"type":"table","title":"título","headers":["Col1","Col2"],"rows":[["a","R$ 1.000,00"]]}
{"type":"chart","chartType":"bar|horizontal-bar|line|pie","title":"título","data":{"labels":["a","b"],"datasets":[{"label":"Faturamento","values":[1000,2000]}]},"config":{"currency":true}}`;

return [{ json: { promptResposta } }];
