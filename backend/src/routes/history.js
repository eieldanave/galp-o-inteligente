import { Router } from 'express';
import { readHistory, clearHistory } from '../data/historyStore.js';

const router = Router();

// Rota original
router.get('/historico', (req, res) => {
  const all = readHistory();
  res.json(all);
});

router.delete('/historico', (req, res) => {
  clearHistory();
  res.json({ ok: true });
});

// Alias compatível com melhorias anteriores
router.get('/history', (req, res) => {
  const all = readHistory();
  res.json(all);
});

router.delete('/history', (req, res) => {
  clearHistory();
  res.json({ ok: true });
});

export default router;