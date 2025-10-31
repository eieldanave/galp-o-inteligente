// Regras base de otimização conforme especificação
export function decidirEndereco(produto, ocupacao) {
  // produto: { categoria, pesoKg, validade (yyyy-mm-dd), shelfLifeDias, volume }
  // ocupacao: objeto com indicadores mockados
  const hoje = new Date();
  const validadeDate = produto.validade ? new Date(produto.validade) : null;
  const diasParaValidade = validadeDate ? Math.ceil((validadeDate - hoje) / (1000 * 60 * 60 * 24)) : null;

  let endereco = 'Armazenagem Padrão';
  let justificativa = [];
  let status = 'ideal'; // ideal | atencao | risco

  if (diasParaValidade !== null && diasParaValidade < 15) {
    endereco = 'Zona de Expedição - Rua A03, Nível 1';
    justificativa.push('Validade inferior a 15 dias → expedição');
    status = 'ideal';
  }

  // Considera flag explícita de perecível
  if (produto.perecivel === true) {
    endereco = 'Área Refrigerada - Câmara R1, Nível 2';
    justificativa.push('Produto perecível → área refrigerada');
  }

  if ((produto.categoria || '').toLowerCase().includes('perec')) {
    endereco = 'Área Refrigerada - Câmara R1, Nível 2';
    justificativa.push('Produto perecível → área refrigerada');
  }

  if (produto.pesoKg && produto.pesoKg >= 20) {
    endereco = 'Nível Inferior - Rua B10, Nível 0';
    justificativa.push('Produto pesado → níveis inferiores');
  }

  // Influência do tipo de embalagem
  const tipo = (produto?.tipoEmbalagem || '').toLowerCase();
  if (tipo === 'caixa_fechada') {
    if (produto.pesoKg && produto.pesoKg >= 10) {
      endereco = 'Nível Inferior - Rua B10, Nível 0';
      justificativa.push('Caixa fechada pesada → níveis inferiores');
    } else {
      justificativa.push('Caixa fechada → facilitar picking e empilhamento');
    }
  } else if (tipo === 'palletizado' || tipo === 'pallet') {
    endereco = 'Nível Inferior - Rua B05, Nível 0';
    justificativa.push('Palletizado → posições de piso (níveis inferiores)');
  } else if (tipo === 'fracionado') {
    if (!endereco.includes('Expedição') && !endereco.includes('Refrigerada')) {
      endereco = 'Armazenagem Padrão - Rua C07, Nível 2';
    }
    justificativa.push('Fracionado → armazenagem de picking');
  } else if (tipo === 'meia_caixa') {
    justificativa.push('Meia caixa → picking intermediário');
  }

  if (!justificativa.length) {
    endereco = 'Armazenagem Padrão - Rua C07, Nível 3';
    justificativa.push('Sem restrições específicas → armazenagem padrão');
  }

  // Ajuste por ocupação mockada
  if (ocupacao?.expedicaoAlta && endereco.includes('Expedição')) {
    justificativa.push('Ocupação alta em expedição, considerar alternativa');
    status = 'atencao';
  }
  if (ocupacao?.refrigeradaLotada && endereco.includes('Refrigerada')) {
    justificativa.push('Área refrigerada lotada, risco de inconsistência');
    status = 'risco';
  }

  return {
    endereco,
    justificativa: justificativa.join('. '),
    status,
  };
}