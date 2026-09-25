// SIL Chat — monta o prompt que transforma a pergunta em SQL (DuckDB)
// Fluxo exclusivo da JA: a empresa é fixa aqui, nunca vem do payload
const COMPANY_ID = '8b4798b9-0386-4f04-95b4-913d2d868322';

const body = $input.first().json.body || {};
const pergunta = String(body.chatInput || body.message || '').trim();
// Histórico curto: cada token conta no limite por minuto da IA
const historico = Array.isArray(body.historico) ? body.historico.slice(-4) : [];
const conversa = historico
  .map((h) => (h.role === 'user' ? 'Usuário: ' : 'SIL: ') + String(h.content || '').slice(0, 300))
  .join('\n');

const agora = $now.setZone('America/Fortaleza');
const hoje = agora.toFormat('dd/MM/yyyy');
const mesAtual = Number(agora.toFormat('yyyyMM'));
const diasNoMes = agora.daysInMonth;
// A base é carregada às 06h com o faturamento até o dia anterior
const diasDecorridos = Math.max(agora.day - 1, 1);

const ESQUEMA = `
Tabela base_comercial — uma linha por VENDEDOR × MÊS × FILIAL
  mesanonum BIGINT (ex.: 202508), mes_ano VARCHAR (ex.: 'ago/25'), filial VARCHAR (ex.: '1 - JA DISTRIBUIDORA LTDA'),
  codusur BIGINT, nome VARCHAR (vendedor), supervisor VARCHAR,
  vl_faturados DOUBLE (faturamento R$), vl_venda DOUBLE, vl_lucro DOUBLE,
  margem_pct DOUBLE (fração), meta DOUBLE (R$, pode ser nula), pct_meta DOUBLE (fração),
  qtde_pedidos BIGINT, qtde_clientes BIGINT, ticket_medio DOUBLE, fat_anopassado DOUBLE, crescimento_pct DOUBLE (fração)

Tabela base_clientes — uma linha por CLIENTE × MÊS × FILIAL
  mesanonum, mes_ano, filial, codcli BIGINT, cliente VARCHAR, municcob VARCHAR (cidade), estcob VARCHAR (UF),
  ramo VARCHAR, vl_faturados, vl_lucro, margem_pct, qtde_pedidos, ticket_medio, fat_anopassado, crescimento_pct

Tabela base_produtos — uma linha por PRODUTO × MÊS × FILIAL
  mesanonum, mes_ano, filial, codprod BIGINT, descricao VARCHAR, marca VARCHAR, departamento VARCHAR, fornecedor VARCHAR,
  vl_faturados, vl_lucro, margem_pct, qtde_vendas BIGINT, soma_qtde DOUBLE (unidades), fat_anopassado, crescimento_pct
`;

const promptSql = `Você escreve UMA consulta SQL (dialeto DuckDB) sobre os dados comerciais da JA Distribuidora.

Hoje é ${hoje}. Mês atual: ${mesAtual}, em andamento (${diasDecorridos} de ${diasNoMes} dias corridos já faturados). Os dados cobrem os últimos 14 meses.
${ESQUEMA}
Regras:
- Filtre e ordene períodos por mesanonum; mes_ano só para exibir. "Mês passado" = maior mesanonum < ${mesAtual}. Sem período, use o mês atual.
- Cada linha é por filial: SOME (SUM) e agrupe pela entidade, a menos que peçam por filial.
- Margem = SUM(vl_lucro) / NULLIF(SUM(vl_faturados), 0). Ticket médio = SUM(vl_faturados) / NULLIF(SUM(qtde_pedidos), 0). % meta = SUM(vl_faturados) / NULLIF(SUM(meta), 0). Nunca faça média de colunas _pct.
- Percentuais sempre como FRAÇÃO (0.19 = 19%). Nunca multiplique por 100.
- Tendência (projeção de fechamento) do mês atual = SUM(vl_faturados) / ${diasDecorridos} * ${diasNoMes}. % de tendência = tendência / NULLIF(SUM(meta), 0). Nunca compare o mês atual parcial com um mês fechado sem projetar.
- Crescimento vs ano passado (só existe no mês atual) = SUM(vl_faturados) / NULLIF(SUM(fat_anopassado), 0) - 1.
- Faturamento total da empresa: base_comercial. Vendedor/supervisor/meta → base_comercial. Cliente/cidade/UF/ramo → base_clientes. Produto/marca/departamento/fornecedor → base_produtos.
- Textos em MAIÚSCULAS, às vezes sem acento: strip_accents(coluna) ILIKE strip_accents('%termo%').
- Rankings/listas: ORDER BY e LIMIT (máx. 50). Nunca devolva linhas brutas sem agregar. ROUND(x, 2) nos valores. Nomes de coluna curtos e claros, sem acento nem espaço (ex.: vendedor, faturamento, margem, tendencia).
- Continuação ("e em julho?", "gera um gráfico disso", "monte uma planilha"): refaça a consulta anterior com o ajuste pedido.
- Se não precisar de dados (saudação, ajuda), responda exatamente: SEM_CONSULTA

Conversa anterior:
${conversa || '(nenhuma)'}

Pergunta: ${pergunta}

Responda APENAS com o SQL (ou SEM_CONSULTA), sem explicação e sem markdown.`;

return [{ json: { pergunta, company_id: COMPANY_ID, hoje, mesAtual, diasNoMes, diasDecorridos, conversa, promptSql } }];
