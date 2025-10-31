import { Router } from 'express';
import { getRecursos } from '../data/resources.js';

const router = Router();

// Compatível com caminho aprimorado: /api/resources/recursos
router.get('/resources/recursos', (req, res) => {
  try {
    const data = getRecursos();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao obter recursos.' });
  }
});

export default router;