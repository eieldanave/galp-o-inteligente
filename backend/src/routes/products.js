import { Router } from 'express';
import { readHistory } from '../data/historyStore.js';
import { getProdutos } from '../data/mock.js';

function normalize(str) {
  return String(str || '').toLowerCase();
}

function buildCatalog() {
  const map = new Map();
  const hist = readHistory();
  for (const item of hist) {
    const sku = String(item?.sku || '').trim();
    const nome = String(item?.nome || '').trim();
    if (!sku && !nome) continue;
    const key = `${sku}::${nome}`;
    const prev = map.get(key) || { sku, nome, hits: 0 };
    prev.hits += 1;
    map.set(key, prev);
  }

  // Enriquecer com catálogo mock (se existir)
  try {
    const base = getProdutos();
    if (Array.isArray(base)) {
      for (const p of base) {
        const sku = String(p?.sku || '').trim();
        const nome = String(p?.nome || '').trim();
        if (!sku && !nome) continue;
        const key = `${sku}::${nome}`;
        if (!map.has(key)) map.set(key, { sku, nome, hits: 0 });
      }
    }
  } catch {}

  return Array.from(map.values());
}

const router = Router();

// GET /api/products/sugerir?q=...&field=nome|sku
router.get('/products/sugerir', (req, res) => {
  try {
    const { q = '', field = '' } = req.query || {};
    const catalog = buildCatalog();
    const qn = normalize(q);

    let filtered = catalog;
    if (qn) {
      if (field === 'sku') {
        filtered = catalog.filter(it => normalize(it.sku).includes(qn));
      } else if (field === 'nome') {
        filtered = catalog.filter(it => normalize(it.nome).includes(qn));
      } else {
        filtered = catalog.filter(it => normalize(it.sku).includes(qn) || normalize(it.nome).includes(qn));
      }
    }

    filtered.sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return String(a.nome).localeCompare(String(b.nome));
    });

    res.json(filtered.slice(0, 10));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao sugerir produtos.' });
  }
});

// GET /api/products/catalogo - Lista completa com detalhes
router.get('/products/catalogo', (req, res) => {
  try {
    const produtos = getProdutos();
    res.json(produtos);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao obter catálogo de produtos.' });
  }
});

// Alias em PT
router.get('/produtos/sugerir', (req, res) => {
  req.url = '/products/sugerir';
  res.app._router.handle(req, res);
});

// Alias em PT para catálogo
router.get('/produtos/catalogo', (req, res) => {
  try {
    const produtos = getProdutos();
    res.json(produtos);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Falha ao obter catálogo de produtos.' });
  }
});

export default router;