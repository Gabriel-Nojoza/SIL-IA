// SIL Chat — monta o prompt que transforma a pergunta em SQL (DuckDB)
// Fluxo exclusivo da JA: a empresa é fixa aqui, nunca vem do payload
const COMPANY_ID = '8b4798b9-0386-4f04-95b4-913d2d868322';

const body = $input.first().json.body || {};
const pergunta = String(body.chatInput || body.message || '').trim();
const historico = Array.isArray(body.historico) ? body.historico.slice(-6) : [];
const conversa = historico
  .map((h) => (h.role === 'user' ? 'Usuário: ' : 'SIL: ') + String(h.content || '').slice(0, 600))
  .join('\n');

const agora = $now.setZone('America/Fortaleza');
const hoje = agora.toFormat('dd/MM/yyyy');
const mesAtual = Number(agora.toFormat('yyyyMM'));

const ESQUEMA = `
Tabela base_comercial — uma linha por VENDEDOR × MÊS × FILIAL
  mesanonum BIGINT (ex.: 202508), mes_ano VARCHAR (ex.: 'ago/25'), filial VARCHAR (ex.: '1 - JA DISTRIBUIDORA LTDA'),
  codusur BIGINT (código do vendedor), nome VARCHAR (nome do vendedor), supervisor VARCHAR,
  vl_faturados DOUBLE (faturamento R$), vl_venda DOUBLE (venda R$), vl_lucro DOUBLE (lucro R$),
  margem_pct DOUBLE (fração: 0.19 = 19%), meta DOUBLE (R$, pode ser nula), pct_meta DOUBLE (fração),
  qtde_pedidos BIGINT, qtde_clientes BIGINT, ticket_medio DOUBLE,
  fat_anopassado DOUBLE, crescimento_pct DOUBLE (fração)

Tabela base_clientes — uma linha por CLIENTE × MÊS × FILIAL
  mesanonum, mes_ano, filial, codcli BIGINT, cliente VARCHAR, municcob VARCHAR (cidade), estcob VARCHAR (UF),
  ramo VARCHAR (ex.: 'REDES'), vl_faturados, vl_lucro, margem_pct, qtde_pedidos BIGINT, ticket_medio,
  fat_anopassado, crescimento_pct

Tabela base_produtos — uma linha por PRODUTO × MÊS × FILIAL
  mesanonum, mes_ano, filial, codprod BIGINT, descricao VARCHAR, marca VARCHAR (pode ser nula),
  departamento VARCHAR, fornecedor VARCHAR, vl_faturados, vl_lucro, margem_pct,
  qtde_vendas BIGINT (nº de vendas), soma_qtde DOUBLE (unidades vendidas), fat_anopassado, crescimento_pct
`;

const promptSql = `Você escreve UMA consulta SQL (dialeto DuckDB) para responder perguntas sobre os dados comerciais da JA Distribuidora.

Hoje é ${hoje}. O mês atual é ${mesAtual} e está em andamento (dados até hoje). Os dados cobrem os últimos 14 meses.
${ESQUEMA}
Regras obrigatórias:
- Use mesanonum para filtrar e ordenar períodos. Use mes_ano só para exibir.
- "Último mês fechado" = o maior mesanonum menor que ${mesAtual}. Sem período na pergunta, use o mês atual.
- Cada linha é por filial: para totais, SOME (SUM) e agrupe pela entidade, a menos que a pergunta peça por filial.
- Margem agregada = SUM(vl_lucro) / NULLIF(SUM(vl_faturados), 0). Nunca faça média de margem_pct.
- Ticket médio agregado = SUM(vl_faturados) / NULLIF(SUM(qtde_pedidos), 0).
- % de meta agregado = SUM(vl_faturados) / NULLIF(SUM(meta), 0).
- fat_anopassado e crescimento_pct só vêm preenchidos nas linhas do mês atual. Crescimento agregado = SUM(vl_faturados) / NULLIF(SUM(fat_anopassado), 0) - 1.
- Faturamento total da empresa: use base_comercial.
- Vendedor/supervisor/meta → base_comercial. Cliente/cidade/UF/ramo → base_clientes. Produto/marca/departamento/fornecedor → base_produtos.
- Textos estão em MAIÚSCULAS e podem não ter acento: busque com strip_accents(coluna) ILIKE strip_accents('%termo%').
- Rankings e listas: ORDER BY e LIMIT (no máximo 50). Nunca devolva linhas brutas sem agregar.
- Arredonde valores com ROUND(x, 2). Dê nomes claros às colunas (ex.: faturamento, margem, mes).
- Se a pergunta for uma continuação (ex.: "e em julho?", "gera um gráfico disso"), use a conversa anterior para entender o que refazer.
- Se a pergunta não precisar de dados (saudação, ajuda, conversa), responda exatamente: SEM_CONSULTA

Conversa anterior:
${conversa || '(nenhuma)'}

Pergunta: ${pergunta}

Responda APENAS com o SQL (ou SEM_CONSULTA), sem explicação e sem markdown.`;

return [{ json: { pergunta, company_id: COMPANY_ID, hoje, mesAtual, conversa, promptSql } }];
