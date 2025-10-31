import express from 'express';
import { addSpace, listSpaces, getSpace, addShelf, listShelves, placeShelf } from '../data/layoutStore.js';
import { Espaco, Prateleira, validaPosicionamento } from '../services/layout.js';

const router = express.Router();

// Criar espaço do galpão
router.post('/layout/spaces', (req, res) => {
  try {
    const {
      nome,
      tipo,
      largura,
      comprimento,
      altura,
      corredorLarguraMin,
      recuoParedes,
      capacidadePisoKgM2,
      temperaturaOperacao,
      origem
    } = req.body || {};

    const esp = new Espaco({ nome, tipo, largura, comprimento, altura, corredorLarguraMin, recuoParedes, capacidadePisoKgM2, temperaturaOperacao, origem });

    const created = addSpace(esp);
    res.json({ success: true, space: created, areaUtil: esp.areaUtil() });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Listar espaços
router.get('/layout/spaces', (req, res) => {
  res.json({ success: true, spaces: listSpaces() });
});

// Detalhar espaço
router.get('/layout/spaces/:id', (req, res) => {
  const space = getSpace(req.params.id);
  if (!space) return res.status(404).json({ success: false, error: 'Espaço não encontrado' });
  res.json({ success: true, space });
});

// Criar prateleira
router.post('/layout/shelves', (req, res) => {
  try {
    const { nome, tipo, largura, comprimento, altura, niveis, cargaMaximaKg, refrigerada, temperaturaOperacao, profundidade, acessos } = req.body || {};
    const prat = new Prateleira({ nome, tipo, largura, comprimento, altura, niveis, cargaMaximaKg, refrigerada, temperaturaOperacao, profundidade, acessos });
    const created = addShelf(prat);
    res.json({ success: true, shelf: created });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Listar prateleiras
router.get('/layout/shelves', (req, res) => {
  res.json({ success: true, shelves: listShelves() });
});

// Posicionar prateleira em um espaço
router.post('/layout/spaces/:id/place', (req, res) => {
  try {
    const { shelfId, x, y, orientacao } = req.body || {};
    const space = getSpace(req.params.id);
    if (!space) return res.status(404).json({ success: false, error: 'Espaço não encontrado' });

    const shelves = listShelves();
    const shelf = shelves.find(s => s.id === shelfId);
    if (!shelf) return res.status(404).json({ success: false, error: 'Prateleira não encontrada' });

    const check = validaPosicionamento(space, shelf, { x, y, orientacao });
    if (!check.ok) return res.status(400).json({ success: false, error: check.motivo });

    const updatedSpace = placeShelf(space.id, { shelfId, x, y, orientacao });
    res.json({ success: true, space: updatedSpace });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

export default router;