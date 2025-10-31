import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { decidirEndereco } from '../rules.js';
import { getOcupacaoDoArmazem } from '../../data/mock.js';
dotenv.config();

function sanitizeOutput(out, produto) {
  const status = ['ideal', 'atencao', 'risco'].includes(out?.status)
    ? out.status
    : 'ideal';
  let justificativa = out?.justificativa;
  if (!justificativa || !String(justificativa).trim()) {
    const ocupacao = getOcupacaoDoArmazem();
    const regras = decidirEndereco(produto, ocupacao);
    justificativa = regras.justificativa;
  }
  return {
    endereco: out?.endereco || 'Armazenagem Padrão - Rua C07, Nível 3',
    justificativa,
    status,
  };
}

export async function openrouterSuggest(produto) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelName = process.env.OPENROUTER_MODEL || 'openrouter/auto';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurado');

  const prompt = `Você é um otimizador de armazenagem WMS.
Decida endereço conforme regras base:
- validade < 15 dias → expedição
- produto pesado (>=20kg) → níveis inferiores
- perecível → área refrigerada
- caso contrário → armazenagem padrão

Responda SOMENTE um JSON válido (sem texto extra), preenchendo sempre 'justificativa' explicando quais regras foram aplicadas e por quê.
Campos obrigatórios: endereco (string), justificativa (string), status (ideal|atencao|risco).
Produto: ${JSON.stringify(produto)}.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5173/',
      'X-Title': 'Smart Location',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: 'Você é um otimizador de armazenagem WMS. Responda somente com JSON válido (sem texto extra). Sempre preencha o campo justificativa com as regras aplicadas.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Falha na IA (OpenRouter): ${res.status} ${err}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error('Resposta da IA não é JSON válido');
  }
  return sanitizeOutput(parsed, produto);
}