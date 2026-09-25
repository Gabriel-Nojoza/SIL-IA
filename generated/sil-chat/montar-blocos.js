// Valida o JSON da IA; se vier quebrado, devolve o texto puro para o chat não ficar sem resposta
const entrada = $input.first().json;
const TIPOS = ['text', 'insight', 'table', 'chart', 'action'];

// A IA falhou (limite de uso, fora do ar): o nó "Responder" segue com { error }
if (entrada.error || !entrada.text) {
  const content = 'Não consegui responder agora. Tente novamente em alguns instantes.';
  return [{ json: { blocks: [{ type: 'insight', severity: 'warning', content }], message: content } }];
}

const texto = String(entrada.text).trim();

function lerBlocos(candidato) {
  try {
    const j = JSON.parse(candidato);
    return (Array.isArray(j) ? j : j.blocks || []).filter((b) => b && TIPOS.includes(b.type));
  } catch (e) {
    return [];
  }
}

// Tenta o texto puro; depois só o trecho entre o primeiro "{" e o último "}"
// (a IA às vezes escreve algo antes/depois ou usa ```json); por fim, repara quebras
// de linha dentro dos textos e vírgulas sobrando antes de "]" ou "}"
const inicio = texto.indexOf('{');
const fim = texto.lastIndexOf('}');
const trecho = inicio !== -1 && fim > inicio ? texto.slice(inicio, fim + 1) : texto;
const reparado = trecho.replace(/[\x00-\x1f]+/g, ' ').replace(/,\s*([}\]])/g, '$1');

let blocks = [];
for (const candidato of [texto, trecho, reparado]) {
  blocks = lerBlocos(candidato);
  if (blocks.length) break;
}

if (!blocks.length) {
  blocks = [{ type: 'text', content: texto }];
}

const primeiro = blocks.find((b) => b.type === 'text' || b.type === 'insight');
return [{ json: { blocks, message: primeiro ? primeiro.content : 'Resposta da SIL' } }];
