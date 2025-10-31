// Definições de classes de Layout do Galpão

export class Espaco {
  constructor({ nome, tipo, largura, comprimento, altura, corredorLarguraMin, recuoParedes, capacidadePisoKgM2, temperaturaOperacao, origem = { x: 0, y: 0 } }) {
    this.nome = nome; // Ex: "Área Padrão A"
    this.tipo = tipo; // Ex: "padrao", "refrigerada", "expedicao"
    this.largura = largura; // m
    this.comprimento = comprimento; // m
    this.altura = altura; // m
    this.corredorLarguraMin = corredorLarguraMin; // m
    this.recuoParedes = recuoParedes; // m
    this.capacidadePisoKgM2 = capacidadePisoKgM2; // kg/m2
    this.temperaturaOperacao = temperaturaOperacao; // °C (se aplicável)
    this.origem = origem; // coordenada de referência
  }

  areaUtil() {
    // Área útil considerando recuo nas paredes para circulação
    const larguraUtil = Math.max(0, this.largura - 2 * (this.recuoParedes || 0));
    const compUtil = Math.max(0, this.comprimento - 2 * (this.recuoParedes || 0));
    return larguraUtil * compUtil;
  }
}

export class Prateleira {
  constructor({ nome, tipo, largura, comprimento, altura, niveis, cargaMaximaKg, refrigerada = false, temperaturaOperacao = null, profundidade = null, acessos = 'frontal' }) {
    this.nome = nome; // Ex: "Prateleira Gaveta Pequena"
    this.tipo = tipo; // Ex: "gaveta_pequena", "gaveta_grande", "refrigerada", "padrao"
    this.largura = largura; // m
    this.comprimento = comprimento; // m
    this.altura = altura; // m
    this.niveis = niveis; // nº de níveis
    this.cargaMaximaKg = cargaMaximaKg; // capacidade total
    this.refrigerada = refrigerada;
    this.temperaturaOperacao = temperaturaOperacao;
    this.profundidade = profundidade; // se aplicável
    this.acessos = acessos; // frontal/lateral/ambos
  }
}

export function validaPosicionamento(espaco, prateleira, pos) {
  // Validação simplificada de encaixe no retângulo disponível
  const { x, y, orientacao = 'horizontal' } = pos; // orientacao: horizontal usa comprimento no X
  const recuo = espaco.recuoParedes || 0;

  const comp = orientacao === 'horizontal' ? prateleira.comprimento : prateleira.largura;
  const larg = orientacao === 'horizontal' ? prateleira.largura : prateleira.comprimento;

  const xMin = espaco.origem.x + recuo;
  const yMin = espaco.origem.y + recuo;
  const xMax = espaco.origem.x + (espaco.comprimento - recuo);
  const yMax = espaco.origem.y + (espaco.largura - recuo);

  const dentro = (x >= xMin) && (y >= yMin) && (x + comp <= xMax) && (y + larg <= yMax);
  if (!dentro) return { ok: false, motivo: 'Fora dos limites do espaço útil' };

  if (espaco.tipo === 'refrigerada' && !prateleira.refrigerada) {
    return { ok: false, motivo: 'Espaço refrigerado requer prateleira adequada' };
  }

  // TODO: colisão com prateleiras existentes (pode ser adicionado posteriormente)
  return { ok: true };
}