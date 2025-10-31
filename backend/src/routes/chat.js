import { Router } from 'express';
import { chatRespond } from '../services/chat.js';

const router = Router();

// POST /api/chat
// body: { messages: [{ role: 'user'|'assistant'|'system', content: string }] }
router.post('/chat', async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const { reply, provider } = await chatRespond(messages);
    res.json({ reply, provider });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha no chat.' });
  }
});

export default router;