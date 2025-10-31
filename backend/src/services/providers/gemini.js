import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

export async function geminiSuggest(produto) {
  const key = process.env.GEMINI_API_KEY;
  const normalizeGeminiModel = (m) => {
    if (!m) return 'gemini-flash-latest';
    const s = String(m).trim();
    if (s === 'gemini-1.5-flash' || s === 'gemini-1.5-flash-latest') return 'gemini-flash-latest';
    return s;
  };
  const modelName = normalizeGeminiModel(process.env.GEMINI_MODEL);
  if (!key) throw new Error('GEMINI_API_KEY não configurado');

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `Você é um otimizador de armazenagem WMS.
Decida endereço conforme regras base:
- validade < 15 dias → expedição
- produto pesado (>=20kg) → níveis inferiores
- perecível → área refrigerada
- caso contrário → armazenagem padrão

Retorne JSON com campos: endereco (string), justificativa (string), status (ideal|atencao|risco).
Produto: ${JSON.stringify(produto)}.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  });

  const text = result?.response?.text?.() ?? result?.response?.text ?? '{}';
  let parsed;
  try {
    const raw = typeof text === 'string' ? text : String(text);
    // Tenta parse direto; se falhar e houver codefence, tenta extrair JSON dentro
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : JSON.parse(raw);
    }
  } catch (e) {
    throw new Error('Resposta da IA não é JSON válido');
  }
  return sanitizeOutput(parsed);
}