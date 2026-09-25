// SIL Chat — monta a resposta final. Tabela e gráfico saem dos dados reais da consulta;
// da IA vem só o resumo, os nomes/formatos das colunas e o insight.
const { situacao } = $('Preparar Resposta').first().json;
const consulta = $('Consultar Base').first().json;
const entrada = $input.first().json;

const MENSAGENS = {
  falha: { type: 'insight', severity: 'warning', content: 'Não consegui responder agora. Tente novamente em alguns instantes.' },
  erro: { type: 'insight', severity: 'warning', content: 'Não consegui buscar essa informação. Tente reformular, indicando o período ou o nome do vendedor, cliente ou produto.' },
  vazio: { type: 'insight', severity: 'info', content: 'Não encontrei dados para esse filtro. Confira o período ou o nome pesquisado.' },
};

function responder(blocks) {
  const primeiro = blocks.find((b) => b.type === 'text' || b.type === 'insight');
  return [{ json: { blocks, message: primeiro ? primeiro.content : 'Resposta da SIL' } }];
}

// JSON da IA: tenta puro, depois só o trecho entre { e }, depois com reparos comuns
function lerJson(texto) {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  const trecho = inicio !== -1 && fim > inicio ? texto.slice(inicio, fim + 1) : texto;
  const reparado = trecho.replace(/[\x00-\x1f]+/g, ' ').replace(/,\s*([}\]])/g, '$1');
  for (const candidato of [texto, trecho, reparado]) {
    try {
      const j = JSON.parse(candidato);
      if (j && typeof j === 'object') return j;
    } catch (e) {}
  }
  return null;
}

const ia = entrada.error ? null : lerJson(String(entrada.text || '').trim());

if (MENSAGENS[situacao]) return responder([MENSAGENS[situacao]]);

if (situacao === 'conversa') {
  const resumo = (ia && ia.resumo) || 'Olá! Sou a SIL. Pergunte sobre faturamento, vendedores, clientes, produtos, margem ou metas.';
  return responder([{ type: 'text', content: resumo }]);
}

// ---- situacao === 'dados' ----
const colunas = consulta.colunas;
const linhas = consulta.rows.slice(0, 100);
const infoIa = (ia && ia.colunas) || {};

function formatoPadrao(coluna) {
  const nome = coluna.toLowerCase();
  const valores = linhas.map((l) => l[coluna]).filter((v) => v !== null && v !== undefined);
  if (!valores.length || !valores.every((v) => typeof v === 'number')) return 'texto';
  if (/(margem|pct|percent|cresc|particip|%)/.test(nome)) return 'percentual';
  if (/(fat|lucro|venda|meta|ticket|valor|receita|custo|tendencia|projec)/.test(nome)) return 'moeda';
  return 'numero';
}

const formato = {};
const nomeColuna = {};
for (const c of colunas) {
  const info = infoIa[c] || {};
  formato[c] = ['moeda', 'percentual', 'numero', 'texto'].includes(info.formato) ? info.formato : formatoPadrao(c);
  nomeColuna[c] = info.nome || c.replace(/_/g, ' ').replace(/^\w/, (l) => l.toUpperCase());
}

function dec(v, casas) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function fmt(v, f) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v !== 'number') return String(v);
  if (f === 'moeda') return 'R$ ' + dec(v, 2);
  if (f === 'percentual') return dec(v * 100, 1) + '%';
  if (f === 'numero') return Number.isInteger(v) ? v.toLocaleString('pt-BR') : dec(v, 2);
  return String(v);
}

const blocks = [];
const resumo = ia && ia.resumo;
blocks.push({ type: 'text', content: resumo || 'Aqui estão os dados encontrados:' });

const g = ia && ia.grafico;
const tiposGrafico = ['bar', 'horizontal-bar', 'line', 'pie'];
if (g && tiposGrafico.includes(g.tipo) && colunas.includes(g.rotulo) && Array.isArray(g.valores)) {
  const valores = g.valores.filter((c) => colunas.includes(c) && formato[c] !== 'texto');
  if (valores.length) {
    const pontos = linhas.slice(0, 30);
    const emPercentual = formato[valores[0]] === 'percentual';
    blocks.push({
      type: 'chart',
      chartType: g.tipo,
      title: g.titulo || (ia && ia.titulo) || '',
      data: {
        labels: pontos.map((l) => String(l[g.rotulo])),
        datasets: valores.map((c) => ({
          // Percentuais vão em pontos percentuais (19,0) com "(%)" no nome da série
          label: nomeColuna[c] + (formato[c] === 'percentual' ? ' (%)' : ''),
          values: pontos.map((l) => {
            const v = Number(l[c]) || 0;
            return formato[c] === 'percentual' ? Math.round(v * 1000) / 10 : v;
          }),
        })),
      },
      config: { currency: formato[valores[0]] === 'moeda', percentage: false, showLegend: valores.length > 1 && !emPercentual },
    });
  }
}

// Um único valor (ex.: "qual o faturamento de hoje?") já está no resumo; tabela só quando ajuda
if (!(resumo && linhas.length === 1 && colunas.length <= 2)) {
  blocks.push({
    type: 'table',
    title: (ia && ia.titulo) || '',
    headers: colunas.map((c) => nomeColuna[c]),
    rows: linhas.map((l) => colunas.map((c) => fmt(l[c], formato[c]))),
  });
}

const insight = ia && ia.insight;
if (insight && insight.content) {
  const severidades = ['info', 'success', 'warning', 'danger'];
  blocks.push({
    type: 'insight',
    severity: severidades.includes(insight.severity) ? insight.severity : 'info',
    content: String(insight.content),
  });
}

return responder(blocks);
