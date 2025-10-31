import { Router } from 'express';
import { callGemini } from '../services/chat.js';

const router = Router();

// GET /api/debug/gemini?prompt=...
router.get('/debug/gemini', async (req, res) => {
  try {
    const prompt = req.query?.prompt || 'Responda apenas: OK';
    const reply = await callGemini([{ role: 'user', content: String(prompt) }]);
    res.json({ ok: true, reply });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;