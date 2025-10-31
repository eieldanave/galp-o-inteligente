import { Router } from 'express';
import { decidirEndereco } from '../services/rules.js';
import { getOcupacaoDoArmazem } from '../data/mock.js';

const router = Router();

// Endpoint interno de IA: recebe { prompt, context } e responde JSON
router.post('/prompt-ia', async (req, res) => {
  try {
    const { context = {} } = req.body || {};
    const ocupacao = getOcupacaoDoArmazem();
    const result = decidirEndereco(context, ocupacao);
    // Resposta no formato esperado pelo serviço de IA interno
    res.json({
      endereco: result.endereco,
      justificativa: result.justificativa,
      status: result.status
    });
  } catch (e) {
    console.error('Falha na IA interna /api/prompt-ia:', e);
    res.status(500).json({ error: e.message || 'Erro na IA interna' });
  }
});

export default router;