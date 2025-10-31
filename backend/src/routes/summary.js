import { Router } from 'express';
import { readHistory } from '../data/historyStore.js';

function summarizeWithRules(items = []) {
  const total = items.length;
  if (total === 0) return 'Sem registros para resumo.';

  const contains = (str, token) => String(str || '').toLowerCase().includes(String(token).toLowerCase());

  let refrigerada = 0, expedicao = 0, inferior = 0, padrao = 0;
  items.forEach(it => {
    const end = it?.endereco || '';
    if (contains(end, 'refrigerada')) refrigerada++;
    else if (contains(end, 'expedi')) expedicao++;
    else if (contains(end, 'nível inferior') || contains(end, 'nivel inferior')) inferior++;
    else if (contains(end, 'armazenagem')) padrao++;
  });

  const pct = n => Math.round((n / total) * 100);
  const maisUsadas = [
    refrigerada ? `Refrigerada ${pct(refrigerada)}%` : null,
    expedicao ? `Expedição ${pct(expedicao)}%` : null,
    inferior ? `Níveis Inferiores ${pct(inferior)}%` : null,
    padrao ? `Armazenagem Padrão ${pct(padrao)}%` : null,
  ].filter(Boolean).join('; ');

  const observacoes = [];
  if (refrigerada > expedicao && refrigerada > inferior) observacoes.push('Predomínio de itens perecíveis na área refrigerada');
  if (expedicao > total * 0.4) observacoes.push('Muitos itens direcionados à expedição (validade próxima)');
  if (inferior > total * 0.3) observacoes.push('Alta proporção de itens pesados nos níveis inferiores');
  if (padrao > total * 0.5) observacoes.push('Maioria sem restrições específicas (armazenagem padrão)');

  const recomendacoes = [];
  if (refrigerada > total * 0.3) recomendacoes.push('Revisar capacidade da câmara refrigerada (R1)');
  if (expedicao > total * 0.3) recomendacoes.push('Aprimorar fluxo de expedição e lead time');
  if (inferior > total * 0.3) recomendacoes.push('Avaliar disponibilidade de posições em níveis inferiores');
  if (!refrigerada && !expedicao && !inferior) recomendacoes.push('Manter critérios atuais; acompanhar ocupação por área');

  return [
    `Itens analisados: ${total}.`,
    maisUsadas ? `Áreas mais usadas: ${maisUsadas}.` : null,
    observacoes.length ? `Observações: ${observacoes.join('; ')}.` : null,
    recomendacoes.length ? `Recomendações: ${recomendacoes.join('; ')}.` : null,
  ].filter(Boolean).join(' ');
}

const router = Router();

// Compatível com caminho aprimorado: /api/summary/resumo-historico
router.get('/summary/resumo-historico', (req, res) => {
  try {
    const items = readHistory();
    const resumo = summarizeWithRules(items);
    res.json({ resumo });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao gerar resumo.' });
  }
});

export default router;