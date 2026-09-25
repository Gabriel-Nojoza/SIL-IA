// Tira cercas de markdown; perguntas sem dados viram uma consulta inofensiva
const entrada = $input.first().json;
const texto = String(entrada.text || '').trim();
let sql = texto.replace(/^```(?:sql)?\s*/i, '').replace(/```\s*$/, '').trim();
if (entrada.error) {
  // A IA falhou ao gerar o SQL: segue sem consultar, e o "Responder"/"Montar Blocos" avisam o usuário
  sql = "select 'falha_ia' as aviso";
} else if (!sql || /^SEM_CONSULTA/i.test(sql)) {
  sql = "select 'sem_consulta' as aviso";
}
return [{ json: { sql } }];
