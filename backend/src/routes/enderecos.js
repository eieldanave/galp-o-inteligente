import { Router } from 'express';
import { getEnderecos } from '../data/mock.js';

const router = Router();

// GET /api/enderecos/listar - Lista todos os endereços disponíveis
router.get('/enderecos/listar', (req, res) => {
  try {
    const enderecos = getEnderecos();
    res.json(enderecos);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao obter endereços.' });
  }
});

// Alias em inglês
router.get('/addresses/list', (req, res) => {
  try {
    const enderecos = getEnderecos();
    res.json(enderecos);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao obter endereços.' });
  }
});

export default router;