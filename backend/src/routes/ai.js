import { Router } from 'express';
import { sugerirComIA } from '../services/ai.js';
import { appendHistory } from '../data/historyStore.js';
import { decidirEndereco } from '../services/rules.js';
import { gerarLPN } from '../utils/lpn.js';
import { getOcupacaoDoArmazem } from '../data/mock.js';

const router = Router();

// Rota original
router.post('/sugerir-endereco', async (req, res) => {
  try {
    const produto = req.body;
    const result = await sugerirComIA(produto);
    const lpn = gerarLPN({ sku: produto?.sku });
    appendHistory({
      sku: produto?.sku,
      nome: produto?.nome,
      dataHora: new Date().toISOString(),
      endereco: result?.endereco,
      motivo: result?.justificativa,
      lpn,
      tipoEmbalagem: produto?.tipoEmbalagem || null,
    });
    res.json({ ...result, lpn, tipoEmbalagem: produto?.tipoEmbalagem || null });
  } catch (e) {
    console.error('Erro em /api/sugerir-endereco (IA externa falhou):', e);
    // Fallback determinístico para evitar quebra no frontend
    try {
      const ocupacao = getOcupacaoDoArmazem();
      const fallback = decidirEndereco(req.body || {}, ocupacao);
      const resposta = {
        ...fallback,
        justificativa: `${fallback.justificativa}. Fallback aplicado: IA indisponível.`,
        status: fallback.status === 'ideal' ? 'atencao' : fallback.status
      };
      const lpn = gerarLPN({ sku: req.body?.sku });
      appendHistory({
        sku: req.body?.sku,
        nome: req.body?.nome,
        dataHora: new Date().toISOString(),
        endereco: resposta?.endereco,
        motivo: resposta?.justificativa,
        lpn,
        tipoEmbalagem: req.body?.tipoEmbalagem || null,
      });
      res.json({ ...resposta, lpn, tipoEmbalagem: req.body?.tipoEmbalagem || null });
    } catch (inner) {
      console.error('Falha também no fallback determinístico:', inner);
      res.status(500).json({ error: e.message || 'Erro ao sugerir endereço' });
    }
  }
});

// Alias compatível com melhorias anteriores
router.post('/ai/sugerir-endereco', async (req, res) => {
  try {
    const produto = req.body;
    const result = await sugerirComIA(produto);
    const lpn = gerarLPN({ sku: produto?.sku });
    appendHistory({
      sku: produto?.sku,
      nome: produto?.nome,
      dataHora: new Date().toISOString(),
      endereco: result?.endereco,
      motivo: result?.justificativa,
      lpn,
      tipoEmbalagem: produto?.tipoEmbalagem || null,
    });
    res.json({ ...result, lpn, tipoEmbalagem: produto?.tipoEmbalagem || null });
  } catch (e) {
    console.error('Erro em /api/ai/sugerir-endereco (IA externa falhou):', e);
    try {
      const ocupacao = getOcupacaoDoArmazem();
      const fallback = decidirEndereco(req.body || {}, ocupacao);
      const resposta = {
        ...fallback,
        justificativa: `${fallback.justificativa}. Fallback aplicado: IA indisponível.`,
        status: fallback.status === 'ideal' ? 'atencao' : fallback.status
      };
      const lpn = gerarLPN({ sku: req.body?.sku });
      appendHistory({
        sku: req.body?.sku,
        nome: req.body?.nome,
        dataHora: new Date().toISOString(),
        endereco: resposta?.endereco,
        motivo: resposta?.justificativa,
        lpn,
        tipoEmbalagem: req.body?.tipoEmbalagem || null,
      });
      res.json({ ...resposta, lpn, tipoEmbalagem: req.body?.tipoEmbalagem || null });
    } catch (inner) {
      console.error('Falha também no fallback determinístico:', inner);
      res.status(500).json({ error: e.message || 'Erro ao sugerir endereço' });
    }
  }
});

export default router;