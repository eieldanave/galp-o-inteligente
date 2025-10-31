import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

function sanitizeOutput(out) {
  const status = ['ideal', 'atencao', 'risco'].includes(out?.status)
    ? out.status
    : 'ideal';
  return {
    endereco: out?.endereco || 'Armazenagem Padrão - Rua C07, Nível 3',
    justificativa: out?.justificativa || 'Sem justificativa fornecida pela IA.',
    status,
  };
}

export async function clarifaiSuggest(produto) {
  const pat = process.env.CLARIFAI_PAT;
  const modelUrl = process.env.CLARIFAI_MODEL || 'https://clarifai.com/openai/chat-completion/models/gpt-oss-120b';
  if (!pat) throw new Error('CLARIFAI_PAT não configurado');

  const prompt = `Você é um otimizador de armazenagem WMS.
Decida endereço conforme regras base:
- validade < 15 dias → expedição
- produto pesado (>=20kg) → níveis inferiores
- perecível → área refrigerada
- caso contrário → armazenagem padrão

Responda SOMENTE um JSON válido (sem texto extra), preenchendo sempre 'justificativa' explicando quais regras foram aplicadas e por quê.
Campos obrigatórios: endereco (string), justificativa (string), status (ideal|atencao|risco).
Produto: ${JSON.stringify(produto)}.`;

  const res = await fetch('https://api.clarifai.com/v2/ext/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pat}`,
    },
    body: JSON.stringify({
      model: modelUrl,
      messages: [
        { role: 'system', content: 'Você é um otimizador de armazenagem WMS. Responda somente com JSON válido (sem texto extra). Sempre preencha o campo justificativa com as regras aplicadas.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_completion_tokens: 512,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Clarifai API falhou: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : JSON.parse(String(content));
  } catch (e) {
    throw new Error('Resposta da Clarifai não é JSON válido');
  }
  return sanitizeOutput(parsed);
}