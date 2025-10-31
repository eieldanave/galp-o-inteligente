import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function callOpenRouter(messages = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelName = process.env.OPENROUTER_MODEL || 'openrouter/auto';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurado');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5173/',
      'X-Title': 'Smart Location Chat',
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: 0.3,
      max_tokens: 512,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Falha no chat (OpenRouter): ${res.status} ${err}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return content || 'Sem resposta.';
}

export async function callGemini(messages = []) {
  const key = process.env.GEMINI_API_KEY;
  const rawModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  // Normaliza modelos antigos/descontinuados para equivalentes atuais
  const normalizeGeminiModel = (m) => {
    if (!m) return 'gemini-flash-latest';
    const s = String(m).trim();
    if (s === 'gemini-1.5-flash' || s === 'gemini-1.5-flash-latest') return 'gemini-flash-latest';
    return s;
  };
  const modelName = normalizeGeminiModel(rawModel);
  if (!key) throw new Error('GEMINI_API_KEY não configurado');
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Usuário' : m.role === 'system' ? 'Sistema' : 'Assistente'}: ${m.content}`)
    .join('\n');
  const prompt = transcript;

  // Primeiro tenta via SDK oficial
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'text/plain' },
    });
    const text = result?.response?.text?.() ?? result?.response?.text ?? '';
    const out = String(text || '').trim();
    if (out) return out;
  } catch (e) {
    try { console.error('[chat][gemini] SDK call failed, trying REST:', e?.message || e); } catch {}
  }

  // Fallback via REST API direta (tenta v1 e v1beta, com e sem '-latest')
  const modelCandidates = [
    modelName,
    modelName.endsWith('-latest') ? modelName.slice(0, -7) : `${modelName}-latest`,
  ];
  const apiVersions = ['v1', 'v1beta'];
  const errors = [];

  for (const ver of apiVersions) {
    for (const m of modelCandidates) {
      const url = `https://generativelanguage.googleapis.com/${ver}/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(key)}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          errors.push(`[${ver}/${m}] ${res.status} ${errText}`);
          continue;
        }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const out = String(text || '').trim();
        if (out) return out;
      } catch (err) {
        errors.push(`[${ver}/${m}] ${err?.message || err}`);
        continue;
      }
    }
  }
  throw new Error(`Gemini REST falhou: ${errors.join(' | ')}`);
}

function callInternalSimple(messages = []) {
  const last = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const lower = String(last).toLowerCase();
  const plain = lower
    .replace(/[áàâãäå]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c');

  // logs removidos após depuração

  if (!plain.trim()) {
    return 'Olá! Sou o assistente do Smart Location. Posso sugerir endereços, gerar relatórios e explicar recursos.';
  }

  // Saudações e "o que você faz"
  if (
    plain.includes('ola') || lower.includes('olá') || plain.includes('oi') || lower.includes('oi') ||
    plain.includes('bom dia') || lower.includes('bom dia') || plain.includes('boa tarde') || lower.includes('boa tarde') || plain.includes('boa noite') || lower.includes('boa noite') ||
    plain.includes('o que voce faz') || lower.includes('o que você faz') || plain.includes('o que vc faz') ||
    plain.includes('quem e voce') || lower.includes('quem é você') || plain.includes('como funciona') || lower.includes('como funciona') ||
    plain.includes('para que serve') || lower.includes('para que serve')
  ) {
    return 'Sou o assistente IA do WMS. Eu ajudo a: 1) Sugerir endereço de armazenagem, 2) Gerar relatórios/ comparativos, 3) Explicar histórico e recursos. Diga, por exemplo: "Gerar relatório IA de 2024-10" ou "Como sugerir endereço?"';
  }

  // Endereçamento
  if (plain.includes('enderec') || lower.includes('endereç') || lower.includes('endereço')) {
    return 'Para sugerir endereço: preencha os campos do produto e clique em "Sugerir Endereço". Considero perecibilidade, validade, peso e volume para a recomendação.';
  }

  // Histórico
  if (plain.includes('histor') || lower.includes('histór') || lower.includes('histórico')) {
    return 'O histórico exibe SKU, produto, data/hora, endereço, LPN e motivo das últimas sugestões. Use "Limpar" para zerar a lista.';
  }

  // Recursos
  if (plain.includes('recurso') || lower.includes('recurso')) {
    return 'Em Recursos Operacionais você vê veículos e operadores disponíveis para planejamento de movimentação.';
  }

  // Relatórios e comparativos
  if (plain.includes('relat') || lower.includes('relat') || plain.includes('compar') || lower.includes('compar') || plain.includes('dashboard') || lower.includes('dashboard') || plain.includes('graf') || lower.includes('gráf')) {
    return 'Relatórios analisam o histórico por período e destacam distribuição por áreas, observações e recomendações. Você também pode gerar um comparativo entre dois intervalos.';
  }

  // Ajuda genérica
  if (plain.includes('ajuda') || lower.includes('ajuda') || plain.includes('help')) {
    return 'Posso orientar fluxos: sugerir endereço, classificar perecível, gerar relatório e entender recursos. Ex.: "Gerar comparativo IA entre 2024-09 e 2024-10".';
  }

  // Fallback mais informativo
  return 'Não tenho certeza se entendi. Exemplos: "Sugerir endereço para o produto", "Gerar relatório IA (início/fim)", ou "O que é o histórico?"';
}

export async function chatRespond(messages = []) {
  const modo = process.env.IA_MODE || 'mock';
  if (modo === 'mock') {
    return { reply: callInternalSimple(messages), provider: 'internal' };
  }
  const preferred = (process.env.IA_PROVIDER || 'internal').toLowerCase();
  const orderEnv = (process.env.AI_FALLBACK_ORDER || 'openrouter,gemini,internal')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const queue = [preferred, ...orderEnv.filter(p => p !== preferred)];

  try {
    console.log('[chat] mode=live provider=', preferred, 'queue=', queue, 'hasGeminiKey=', !!process.env.GEMINI_API_KEY, 'hasOpenRouterKey=', !!process.env.OPENROUTER_API_KEY);
  } catch {}

  const sysPrompt = {
    role: 'system',
    content:
      'Você é um assistente para operações de armazém (WMS). Responda de forma objetiva, curta e útil em PT-BR. Quando relevante, explique critérios como perecibilidade, validade, peso e volume. Evite inventar dados.',
  };
  const msgs = [sysPrompt, ...messages];

  for (const p of queue) {
    try {
      if (p === 'openrouter' && process.env.OPENROUTER_API_KEY) {
        const reply = await callOpenRouter(msgs);
        return { reply, provider: 'openrouter' };
      }
      if (p === 'gemini' && process.env.GEMINI_API_KEY) {
        const reply = await callGemini(msgs);
        return { reply, provider: 'gemini' };
      }
      if (p === 'internal') {
        const reply = callInternalSimple(messages);
        return { reply, provider: 'internal' };
      }
    } catch (e) {
      try {
        console.error(`[chat] provider ${p} failed:`, e?.message || e);
      } catch {}
      continue;
    }
  }
  return { reply: callInternalSimple(messages), provider: 'internal' };
}