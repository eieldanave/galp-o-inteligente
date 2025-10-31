import { Router } from 'express';
import { readHistory } from '../data/historyStore.js';

function contains(str, token) {
  return String(str || '').toLowerCase().includes(String(token).toLowerCase());
}

function filtrarPorPeriodo(items, inicio, fim) {
  if (!inicio && !fim) return items;
  const start = inicio ? new Date(inicio).getTime() : null;
  const end = fim ? new Date(fim).getTime() : null;
  return items.filter(it => {
    const t = new Date(it.dataHora || Date.now()).getTime();
    if (start && t < start) return false;
    if (end && t > end) return false;
    return true;
  });
}

function gerarMetricas(items) {
  const total = items.length;
  let refrigerada = 0, expedicao = 0, inferior = 0, padrao = 0;
  items.forEach(it => {
    const end = it?.endereco || '';
    if (contains(end, 'refrigerada')) refrigerada++;
    else if (contains(end, 'expedi')) expedicao++;
    else if (contains(end, 'nível inferior') || contains(end, 'nivel inferior')) inferior++;
    else if (contains(end, 'armazenagem')) padrao++;
  });
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;
  return {
    total,
    distribuicao: {
      refrigerada: { qtd: refrigerada, pct: pct(refrigerada) },
      expedicao: { qtd: expedicao, pct: pct(expedicao) },
      niveisInferiores: { qtd: inferior, pct: pct(inferior) },
      padrao: { qtd: padrao, pct: pct(padrao) }
    }
  };
}

function gerarObservacoes(metricas) {
  const obs = [];
  const { total, distribuicao } = metricas;
  if (total === 0) return ['Sem registros no período selecionado.'];
  const { refrigerada, expedicao, niveisInferiores, padrao } = distribuicao;
  if (refrigerada.qtd > expedicao.qtd && refrigerada.qtd > niveisInferiores.qtd) obs.push('Predomínio de itens perecíveis na área refrigerada');
  if (expedicao.pct > 40) obs.push('Muitos itens direcionados à expedição (validade próxima)');
  if (niveisInferiores.pct > 30) obs.push('Alta proporção de itens pesados nos níveis inferiores');
  if (padrao.pct > 50) obs.push('Maioria sem restrições específicas (armazenagem padrão)');
  return obs;
}

function gerarRecomendacoes(metricas) {
  const rec = [];
  const { distribuicao } = metricas;
  if (distribuicao.expedicao.pct > 40) rec.push('Antecipar rotas de expedição e revisar prazos de validade');
  if (distribuicao.niveisInferiores.pct > 30) rec.push('Verificar ergonomia e disponibilidade de equipamentos para itens pesados');
  if (distribuicao.refrigerada.pct > 30) rec.push('Garantir capacidade e manutenção da área refrigerada');
  if (distribuicao.padrao.pct > 60) rec.push('Otimizar endereçamento padrão para reduzir deslocamentos');
  if (rec.length === 0) rec.push('Operação estável, sem recomendações críticas');
  return rec;
}

const router = Router();

// POST /api/reports/gerar-relatorio
router.post('/reports/gerar-relatorio', (req, res) => {
  try {
    const { inicio, fim } = req.body || {};
    const items = readHistory();
    const filtrados = filtrarPorPeriodo(items, inicio, fim);
    const metricas = gerarMetricas(filtrados);
    const observacoes = gerarObservacoes(metricas);
    const recomendacoes = gerarRecomendacoes(metricas);
    const periodo = {
      inicio: inicio || null,
      fim: fim || null,
    };
    const relatorio = {
      titulo: 'Relatório Operacional de Endereçamento (IA interna)',
      periodo,
      metricas,
      observacoes,
      recomendacoes,
      geradoEm: new Date().toISOString(),
      provider: 'internal'
    };
    res.json(relatorio);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao gerar relatório IA.' });
  }
});

export default router;