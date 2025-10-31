export function getRecursos() {
  return {
    veiculos: [
      { tipo: 'Carrinho manual', quantidade: 6, disponiveis: 4, observacoes: ['Uso geral', 'Adequado para cargas leves'] },
      { tipo: 'Transpaleteira', quantidade: 3, disponiveis: 2, observacoes: ['Ideal para pallets médios', 'Evitar rampas íngremes'] },
      { tipo: 'Empilhadeira', quantidade: 2, disponiveis: 1, observacoes: ['Operador habilitado', 'Checar bateria/GLP'] },
    ],
    operadores: [
      { nome: 'João Silva', habilitacoes: ['Empilhadeira', 'Transpaleteira'], turno: 'Manhã', status: 'Livre' },
      { nome: 'Maria Souza', habilitacoes: ['Transpaleteira'], turno: 'Tarde', status: 'Em tarefa' },
      { nome: 'Carlos Lima', habilitacoes: ['Carrinho manual'], turno: 'Noite', status: 'Livre' },
    ],
  };
}
