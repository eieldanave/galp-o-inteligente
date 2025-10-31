import dotenv from 'dotenv';
import { decidirEndereco } from './rules.js';
import { getOcupacaoDoArmazem } from '../data/mock.js';
import { geminiSuggest } from './providers/gemini.js';
import { openrouterSuggest } from './providers/openrouter.js';
import { clarifaiSuggest } from './providers/clarifai.js';
import fetch from 'node-fetch';

dotenv.config();

async function callInternalIA(produto) {
  const iaUrl = process.env.IA_URL;
  if (!iaUrl) throw new Error('IA_URL não configurado');
  const prompt = `Sugerir endereço de armazenagem com regras base (validade<15 expedição; pesado níveis inferiores; perecível refrigerada; caso contrário padrão) para o produto: ${JSON.stringify(produto)}. Retorne JSON com endereco, justificativa e status.`;
  const res = await fetch(iaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context: produto })
  });
  if (!res.ok) throw new Error('Falha ao chamar IA interna');
  const data = await res.json();
  return {
    endereco: data?.endereco || 'Armazenagem Padrão - Rua C07, Nível 3',
    justificativa: data?.justificativa || 'Sem justificativa da IA interna',
    status: ['ideal','atencao','risco'].includes(data?.status) ? data.status : 'ideal'
  };
}

export async function sugerirComIA(produto) {
  const modo = process.env.IA_MODE || 'mock';
  if (modo === 'mock') {
    const ocupacao = getOcupacaoDoArmazem();
    return decidirEndereco(produto, ocupacao);
  }

  const preferred = (process.env.IA_PROVIDER || 'internal').toLowerCase();
  const orderEnv = (process.env.AI_FALLBACK_ORDER || 'openrouter,gemini,clarifai,internal')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const queue = [preferred, ...orderEnv.filter(p => p !== preferred)];

  for (const p of queue) {
    try {
      if (p === 'openrouter' && process.env.OPENROUTER_API_KEY) {
        const r = await openrouterSuggest(produto);
        return { ...r, provider: 'openrouter' };
      }
      if (p === 'gemini' && process.env.GEMINI_API_KEY) {
        const r = await geminiSuggest(produto);
        return { ...r, provider: 'gemini' };
      }
      if (p === 'clarifai' && process.env.CLARIFAI_PAT) {
        const r = await clarifaiSuggest(produto);
        return { ...r, provider: 'clarifai' };
      }
      if (p === 'internal' && process.env.IA_URL) {
        const r = await callInternalIA(produto);
        return { ...r, provider: 'internal' };
      }
    } catch (e) {
      // tenta próximo provedor da fila
      continue;
    }
  }

  // nenhum provedor externo disponível; deixa rota aplicar fallback determinístico
  throw new Error('Todos provedores de IA falharam ou não estão configurados');
}