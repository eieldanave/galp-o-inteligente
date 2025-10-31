import { Router } from 'express';

function classificarPorRegras(nome = '') {
  const n = String(nome || '').toLowerCase();
  const hitsP = [
    'leite','latic','queijo','iogurte','carne','frango','peixe','friog','frio','gelad','hortifruti','verdura','fruta','fresco','manteiga','margarina','nata'
  ];
  const hitsNP = [
    'arroz','feij','farinha','açucar','acucar','sal','café','cafe','macarr','biscoito','enlat','conserva','detergente','sabão','sabao','higien','limpeza'
  ];
  const isP = hitsP.some(k => n.includes(k));
  const isNP = hitsNP.some(k => n.includes(k));
  if (isP && !isNP) return { perecivel: true, confianca: 0.8, motivo: 'Padrões do nome indicam perecível', fonte: 'regras' };
  if (isNP && !isP) return { perecivel: false, confianca: 0.8, motivo: 'Padrões do nome indicam não perecível', fonte: 'regras' };
  return { perecivel: false, confianca: 0.5, motivo: 'Indeterminado, assumindo não perecível por segurança', fonte: 'regras' };
}

const router = Router();

// Compatível com caminho aprimorado: /api/classifier/classificar-perecivel
router.post('/classifier/classificar-perecivel', (req, res) => {
  try {
    const nome = req.body?.nome || '';
    if (!nome.trim()) return res.status(400).json({ error: 'Informe o nome do produto' });
    const fb = classificarPorRegras(nome);
    return res.json(fb);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao classificar.' });
  }
});

export default router;