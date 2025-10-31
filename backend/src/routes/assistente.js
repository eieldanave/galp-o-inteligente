import { Router } from 'express';

function sugestoesCadastroPorRegras(produto = {}) {
  const { pesoKg = 0, volumeLitros = 0, validadeDias = null, categoria = '', nome = '' } = produto;
  const out = [];
  const lowerCat = String(categoria || '').toLowerCase();
  const lowerNome = String(nome || '').toLowerCase();

  const isPerecivelNome = ['leite','latic','iogurte','carne','frango','peixe','friog','gelad','hortifruti','verdura','fruta'].some(k => lowerNome.includes(k));
  const isPerecivelCat = ['perecível','perecivel','frios','hortifruti'].some(k => lowerCat.includes(k));
  const perecivel = isPerecivelNome || isPerecivelCat || (validadeDias !== null && validadeDias <= 30);

  if (perecivel) {
    out.push('Endereçar em área refrigerada ou climatizada');
    out.push('Priorizar giro e monitorar validade');
  } else {
    out.push('Endereçar em área de armazenagem padrão');
  }

  if (pesoKg >= 20) out.push('Preferir níveis inferiores por peso');
  if (volumeLitros >= 50) out.push('Avaliar área de volumosos/espessos');
  if (validadeDias !== null && validadeDias <= 7) out.push('Colocar em área de expedição rápida');

  if (!out.length) out.push('Sem recomendações específicas; usar critérios padrão');
  return { perecivel, sugestoes: out };
}

const router = Router();

// Compatível com caminho aprimorado: /api/assistente/assistente-cadastro
router.post('/assistente/assistente-cadastro', (req, res) => {
  try {
    const produto = req.body || {};
    const r = sugestoesCadastroPorRegras(produto);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao sugerir cadastro.' });
  }
});

export default router;