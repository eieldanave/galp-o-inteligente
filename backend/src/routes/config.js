import { Router } from 'express';

const router = Router();

function getAIConfigSimple() {
  const rawGemini = process.env.GEMINI_MODEL || '';
  const effectiveGemini = (() => {
    const s = String(rawGemini).trim();
    if (!s) return 'gemini-flash-latest';
    if (s === 'gemini-1.5-flash' || s === 'gemini-1.5-flash-latest') return 'gemini-flash-latest';
    return s;
  })();
  return {
    IA_MODE: process.env.IA_MODE || 'mock',
    IA_PROVIDER: process.env.IA_PROVIDER || null,
    IA_URL: process.env.IA_URL || null,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || null,
    GEMINI_MODEL: rawGemini || null,
    EFFECTIVE_GEMINI_MODEL: effectiveGemini,
    CLARIFAI_MODEL: process.env.CLARIFAI_MODEL || null,
    AI_FALLBACK_ORDER: process.env.AI_FALLBACK_ORDER || 'openrouter,gemini,clarifai,internal',
    HAS_OPENROUTER_KEY: !!process.env.OPENROUTER_API_KEY,
    HAS_GEMINI_KEY: !!process.env.GEMINI_API_KEY,
    HAS_CLARIFAI_PAT: !!process.env.CLARIFAI_PAT,
  };
}

// Compatível com caminho aprimorado: /api/config/config/ia
router.get('/config/config/ia', (req, res) => {
  res.json({ ok: true, config: getAIConfigSimple() });
});

// Alias adicional simples
router.get('/config/ia', (req, res) => {
  res.json({ ok: true, config: getAIConfigSimple() });
});

export default router;