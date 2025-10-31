// Dados mockados e funções preparadas para integração futura com APIs reais

export function getProdutos() {
  return [
    { sku: 'LTN-001', nome: 'Leite UHT', categoria: 'Perecível', pesoKg: 12, validade: '2025-11-20', shelfLifeDias: 30, volume: 0.08 },
    { sku: 'FEJ-200', nome: 'Feijão', categoria: 'Seco', pesoKg: 18, validade: '2026-03-15', shelfLifeDias: 180, volume: 0.05 },
  ];
}

export function getEnderecos() {
  return [
    { codigo: 'A03-1', descricao: 'Zona de Expedição - Rua A03, Nível 1' },
    { codigo: 'R1-2', descricao: 'Área Refrigerada - Câmara R1, Nível 2' },
    { codigo: 'B10-0', descricao: 'Nível Inferior - Rua B10, Nível 0' },
    { codigo: 'C07-3', descricao: 'Armazenagem Padrão - Rua C07, Nível 3' },
  ];
}

export function getOcupacaoDoArmazem() {
  // Mock simples de ocupação
  return {
    expedicaoAlta: false,
    refrigeradaLotada: false,
    nivelInferiorCheio: false,
  };
}