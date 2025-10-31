import fs from 'fs';
import path from 'path';
import { gerarLPN } from '../src/utils/lpn.js';

const historyPath = path.resolve('backend/data/history.json');

function ensureFile() {
  const dir = path.dirname(historyPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, '[]', 'utf-8');
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function randomDateWithinDays(daysBack = 120) {
  const now = Date.now();
  const past = now - randInt(0, daysBack) * 24 * 60 * 60 * 1000;
  const d = new Date(past);
  // small random hour/minute
  d.setHours(randInt(7, 19), randInt(0, 59), randInt(0, 59));
  return d.toISOString();
}

const produtosBase = [
  { sku: 'LTN-001', nome: 'Leite UHT', categoria: 'Perecível' },
  { sku: 'FEJ-200', nome: 'Feijão', categoria: 'Seco' },
  { sku: 'ARZ-110', nome: 'Arroz', categoria: 'Seco' },
  { sku: 'MAC-045', nome: 'Macarrão', categoria: 'Seco' },
  { sku: 'CAF-312', nome: 'Café Torrado', categoria: 'Seco' },
  { sku: 'AÇU-901', nome: 'Açúcar Refinado', categoria: 'Seco' },
  { sku: 'REF-018', nome: 'Refrigerante Cola 2L', categoria: 'Bebida' },
  { sku: 'SUC-021', nome: 'Suco de Laranja', categoria: 'Bebida' },
  { sku: 'YOG-005', nome: 'Iogurte', categoria: 'Perecível' },
  { sku: 'FRZ-777', nome: 'Carne Congelada', categoria: 'Perecível' },
  { sku: 'LSH-190', nome: 'Lasanha Congelada', categoria: 'Perecível' },
  { sku: 'FAR-032', nome: 'Farinha de Trigo', categoria: 'Seco' },
  { sku: 'OLV-210', nome: 'Óleo de Oliva', categoria: 'Bebida' },
  { sku: 'VIN-330', nome: 'Vinagre', categoria: 'Bebida' },
  { sku: 'DET-660', nome: 'Detergente', categoria: 'Limpeza' },
  { sku: 'SAB-420', nome: 'Sabão em pó', categoria: 'Limpeza' },
  { sku: 'BIS-108', nome: 'Biscoito', categoria: 'Seco' },
  { sku: 'CHC-555', nome: 'Chocolate', categoria: 'Seco' },
  { sku: 'CEN-801', nome: 'Cerveja Lata', categoria: 'Bebida' },
  { sku: 'AGU-002', nome: 'Água Mineral 500ml', categoria: 'Bebida' },
];

const enderecos = [
  { area: 'refrigerada', endereco: 'Área Refrigerada - Câmara R1, Nível 2', motivo: 'Perecível: validade próxima, manter área refrigerada' },
  { area: 'expedicao', endereco: 'Zona de Expedição - Rua A03, Nível 1', motivo: 'Saída prevista: otimizar fluxo de expedição' },
  { area: 'niveisInferiores', endereco: 'Nível Inferior - Rua B10, Nível 0', motivo: 'Peso elevado: garantir ergonomia nos níveis inferiores' },
  { area: 'padrao', endereco: 'Armazenagem Padrão - Rua C07, Nível 3', motivo: 'Sem restrições: endereçamento padrão' },
];

function pickEnderecoWeighted() {
  // Pesos: refrig 30%, exped 25%, inferiores 20%, padrao 25%
  const r = Math.random();
  if (r < 0.30) return enderecos[0];
  if (r < 0.55) return enderecos[1];
  if (r < 0.75) return enderecos[2];
  return enderecos[3];
}

function pickEmbalagemWeighted(area) {
  const r = Math.random();
  if (area === 'refrigerada') {
    if (r < 0.45) return 'fracionado';
    if (r < 0.75) return 'caixa_fechada';
    return 'unitario';
  }
  if (area === 'niveisInferiores') {
    if (r < 0.5) return 'palletizado';
    if (r < 0.8) return 'caixa_fechada';
    return 'meia_caixa';
  }
  if (area === 'expedicao') {
    if (r < 0.4) return 'caixa_fechada';
    if (r < 0.7) return 'palletizado';
    return 'fracionado';
  }
  // padrão
  if (r < 0.3) return 'caixa_fechada';
  if (r < 0.55) return 'meia_caixa';
  if (r < 0.8) return 'fracionado';
  return 'unitario';
}

function gerarHistorico(qtd = 200) {
  const registros = [];
  for (let i = 0; i < qtd; i++) {
    const p = pick(produtosBase);
    const e = pickEnderecoWeighted();
    const tipoEmbalagem = pickEmbalagemWeighted(e.area);
    const lpn = gerarLPN({ sku: p.sku });
    registros.push({
      sku: p.sku,
      nome: p.nome,
      dataHora: randomDateWithinDays(120),
      endereco: e.endereco,
      motivo: e.motivo,
      tipoEmbalagem,
      lpn,
    });
  }
  // Ordenar por dataHora desc para refletir UI
  registros.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  return registros;
}

function main() {
  ensureFile();
  const qtd = Number(process.env.SEED_QTD || 200);
  const registros = gerarHistorico(qtd);
  fs.writeFileSync(historyPath, JSON.stringify(registros, null, 2));
  console.log(`Seed concluído: ${registros.length} registros em ${historyPath}`);
}

main();