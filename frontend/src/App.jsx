import React, { useMemo, useState, useRef } from 'react';
import Chart from 'chart.js/auto';
import { sugerirEndereco, getHistorico, limparHistorico, getRecursos, getResumoHistorico, gerarRelatorioIA, sugerirProdutos, sendChatMessage, processarOCR } from './api.js';
import LayoutPlanner from './pages/LayoutPlanner.jsx';

const initialProduct = {
  nome: '',
  sku: '',
  perecivel: null,
  pesoKg: '',
  validade: '', // yyyy-mm-dd
  shelfLifeDias: '',
  volume: '',
  areaAtual: '',
  tipoEmbalagem: ''
};

function StatusBadge({ status }) {
  const map = {
    ideal: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/40',
    atencao: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40',
    risco: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
  };
  const label = status === 'ideal' ? 'Sugestão ideal' : status === 'atencao' ? 'Atenção' : 'Risco';
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[status] || ''}`}>{label}</span>
  );
}

function HeaderIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={`icon ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
    </svg>
  );
}

function useViewportAnimation() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('animate-fade-in', 'animate-slide-up');
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function App() {
  const [view, setView] = useState('produto');
  const [produto, setProduto] = useState(initialProduct);
  const [sugestao, setSugestao] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [relInicio, setRelInicio] = useState('');
  const [relFim, setRelFim] = useState('');
  const [loadingRel, setLoadingRel] = useState(false);
  const [iaProvider, setIaProvider] = useState('interno');
  const [iaModo, setIaModo] = useState('rapida');
  const [historico, setHistorico] = useState([]);
  const [sugestoesNome, setSugestoesNome] = useState([]);
  const [sugestoesSku, setSugestoesSku] = useState([]);
  const [openSugNome, setOpenSugNome] = useState(false);
  const [openSugSku, setOpenSugSku] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recursos, setRecursos] = useState({ veiculos: [], operadores: [] });
  const [resumo, setResumo] = useState('');
  const chartCanvasRef = React.useRef(null);
  const chartInstanceRef = React.useRef(null);
  const cmpChartRef = React.useRef(null);
  const cmpChartInstanceRef = React.useRef(null);

  const [cmpInicioA, setCmpInicioA] = useState('');
  const [cmpFimA, setCmpFimA] = useState('');
  const [cmpInicioB, setCmpInicioB] = useState('');
  const [cmpFimB, setCmpFimB] = useState('');
  const [loadingCmp, setLoadingCmp] = useState(false);
  const [comparativo, setComparativo] = useState(null);
  const [showComparativoModal, setShowComparativoModal] = useState(false);

  // Chatbot IA
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Olá! Posso ajudar com sugestões, relatórios e dúvidas do WMS.' }
  ]);
  const [chatSending, setChatSending] = useState(false);
  const [chatProvider, setChatProvider] = useState('internal');

  // OCR Estados
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const fileInputRef = useRef(null);

  const refCadastro = useViewportAnimation();
  const refHistorico = useViewportAnimation();
  const refResumo = useViewportAnimation();
  const refSugestaoCard = useViewportAnimation();
  const refRelatorioCard = useViewportAnimation();
  const refRecursosCard = useViewportAnimation();

  const canSubmit = useMemo(() => {
    return produto.nome && produto.sku && produto.pesoKg && produto.validade && produto.shelfLifeDias && produto.volume && produto.areaAtual && produto.perecivel !== null && produto.tipoEmbalagem;
  }, [produto]);

  React.useEffect(() => {
    (async () => {
      try {
        const h = await getHistorico();
        if (Array.isArray(h)) setHistorico(h);
        const r = await getRecursos();
        if (r && r.veiculos && r.operadores) setRecursos(r);
        const s = await getResumoHistorico();
        if (typeof s === 'string') setResumo(s);
      } catch (e) {
        // sem bloqueio se backend ainda não está configurado
      }
    })();
  }, []);

  // Sugestões por Nome (debounced)
  React.useEffect(() => {
    let active = true;
    const q = (produto.nome || '').trim();
    if (!q) {
      setSugestoesNome([]);
      return () => { active = false; };
    }
    const t = setTimeout(async () => {
      try {
        const r = await sugerirProdutos({ q, field: 'nome' });
        if (active) setSugestoesNome(Array.isArray(r) ? r : []);
      } catch {
        if (active) setSugestoesNome([]);
      }
    }, 220);
    return () => { active = false; clearTimeout(t); };
  }, [produto.nome]);

  // Sugestões por SKU (debounced)
  React.useEffect(() => {
    let active = true;
    const q = (produto.sku || '').trim();
    if (!q) {
      setSugestoesSku([]);
      return () => { active = false; };
    }
    const t = setTimeout(async () => {
      try {
        const r = await sugerirProdutos({ q, field: 'sku' });
        if (active) setSugestoesSku(Array.isArray(r) ? r : []);
      } catch {
        if (active) setSugestoesSku([]);
      }
    }, 220);
    return () => { active = false; clearTimeout(t); };
  }, [produto.sku]);

  function updateField(field, value) {
    setProduto(prev => ({ ...prev, [field]: value }));
  }

  async function processarImagemOCR(file) {
    setOcrLoading(true);
    setOcrError('');
    
    try {
      const result = await processarOCR(file);
      
      if (result.success && result.data) {
        // Preencher os campos automaticamente com os dados extraídos
        if (result.data.nome) {
          updateField('nome', result.data.nome);
        }
        if (result.data.sku) {
          updateField('sku', result.data.sku);
        }
        if (result.data.peso) {
          updateField('pesoKg', result.data.peso.toString());
        }
        if (result.data.validade) {
          updateField('validade', result.data.validade);
        }
        if (result.data.volume) {
          updateField('volume', result.data.volume.toString());
        }
        if (result.data.tipoEmbalagem) {
          updateField('tipoEmbalagem', result.data.tipoEmbalagem);
        }
        
        // Mostrar mensagem de sucesso
        setError('✅ Dados extraídos com sucesso da etiqueta!');
        setTimeout(() => setError(''), 3000);
      } else {
        setOcrError(result.error || 'Erro ao processar a imagem');
      }
    } catch (error) {
      setOcrError('Erro ao processar OCR: ' + error.message);
    } finally {
      setOcrLoading(false);
    }
  }

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        setOcrError('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setOcrError('Arquivo muito grande. Máximo 10MB');
        return;
      }
      
      processarImagemOCR(file);
    }
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  async function onSugerir() {
    setLoading(true);
    setError('');
    try {
      const result = await sugerirEndereco({
        nome: produto.nome,
        sku: produto.sku,
        perecivel: produto.perecivel,
        pesoKg: parseFloat(produto.pesoKg),
        validade: produto.validade,
        shelfLifeDias: parseInt(produto.shelfLifeDias, 10),
        volume: parseFloat(produto.volume),
        areaAtual: produto.areaAtual,
        tipoEmbalagem: produto.tipoEmbalagem
      });
      setSugestao(result);
      setShowModal(true);
      setHistorico(prev => [
        {
          sku: produto.sku,
          nome: produto.nome,
          dataHora: new Date().toISOString(),
          endereco: result?.endereco || '-',
          motivo: result?.justificativa || '-',
          lpn: result?.lpn || '-',
          tipoEmbalagem: produto?.tipoEmbalagem || '-'
        },
        ...prev
      ]);
    } catch (e) {
      setError('Falha ao obter sugestão. Verifique o backend.');
    } finally {
      setLoading(false);
    }
  }

  async function onLimparHistorico() {
    try {
      const ok = await limparHistorico();
      if (ok) setHistorico([]);
    } catch (e) {
      setHistorico([]);
    }
  }

  async function onGerarRelatorio() {
    setLoadingRel(true);
    try {
      const r = await gerarRelatorioIA({ inicio: relInicio || null, fim: relFim || null, provider: iaProvider, modo: iaModo });
      setRelatorio(r);
      setShowRelatorioModal(true);
    } catch (e) {
      // opção: exibir toast/erro
    } finally {
      setLoadingRel(false);
    }
  }

  async function onGerarComparativo() {
    setLoadingCmp(true);
    try {
      const [A, B] = await Promise.all([
        gerarRelatorioIA({ inicio: cmpInicioA || null, fim: cmpFimA || null, provider: iaProvider, modo: iaModo }),
        gerarRelatorioIA({ inicio: cmpInicioB || null, fim: cmpFimB || null, provider: iaProvider, modo: iaModo })
      ]);
      setComparativo({ A, B });
      setShowComparativoModal(true);
    } catch (e) {
      // exibir erro simples
    } finally {
      setLoadingCmp(false);
    }
  }

  async function onChatSend(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const text = (chatInput || '').trim();
    if (!text || chatSending) return;
    const userMsg = { role: 'user', content: text };
    const history = [...chatMessages, userMsg];
    setChatMessages(history);
    setChatInput('');
    setChatSending(true);
    try {
      const resp = await sendChatMessage(history);
      const reply = resp?.reply || 'Sem resposta.';
      const provider = resp?.provider || 'internal';
      setChatProvider(provider);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Falha ao obter resposta do chat.' }]);
    } finally {
      setChatSending(false);
    }
  }

  function exportarCSVRelatorio() {
    if (!relatorio?.metricas?.distribuicao) return;
    const dist = relatorio.metricas.distribuicao;
    const rows = [
      ['Area', 'Quantidade', 'Percentual'],
      ['Refrigerada', dist.refrigerada?.qtd ?? 0, dist.refrigerada?.pct ?? 0],
      ['Expedição', dist.expedicao?.qtd ?? 0, dist.expedicao?.pct ?? 0],
      ['Níveis Inferiores', dist.niveisInferiores?.qtd ?? 0, dist.niveisInferiores?.pct ?? 0],
      ['Padrão', dist.padrao?.qtd ?? 0, dist.padrao?.pct ?? 0]
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-ia-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  React.useEffect(() => {
    const hasData = !!(relatorio && relatorio.metricas && relatorio.metricas.distribuicao);
    if (showRelatorioModal && hasData) {
      const dist = relatorio.metricas.distribuicao || {};
      const labels = ['Refrigerada', 'Expedição', 'Níveis Inferiores', 'Padrão'];
      const dataValues = [
        dist.refrigerada?.qtd ?? 0,
        dist.expedicao?.qtd ?? 0,
        dist.niveisInferiores?.qtd ?? 0,
        dist.padrao?.qtd ?? 0
      ];
      const ctx = chartCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      chartInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: dataValues,
            backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#64748b'],
            borderColor: '#1f2937',
            borderWidth: 1
          }]
        },
        options: {
          plugins: {
            legend: { position: 'bottom', labels: { color: '#e5e7eb' } }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [showRelatorioModal, relatorio]);

  React.useEffect(() => {
    if (showComparativoModal && comparativo?.A?.metricas && comparativo?.B?.metricas) {
      const distA = comparativo.A.metricas.distribuicao || {};
      const distB = comparativo.B.metricas.distribuicao || {};
      const labels = ['Refrigerada', 'Expedição', 'Níveis Inferiores', 'Padrão'];
      const dataA = [
        distA.refrigerada?.qtd ?? 0,
        distA.expedicao?.qtd ?? 0,
        distA.niveisInferiores?.qtd ?? 0,
        distA.padrao?.qtd ?? 0
      ];
      const dataB = [
        distB.refrigerada?.qtd ?? 0,
        distB.expedicao?.qtd ?? 0,
        distB.niveisInferiores?.qtd ?? 0,
        distB.padrao?.qtd ?? 0
      ];
      const ctx = cmpChartRef.current?.getContext('2d');
      if (!ctx) return;
      if (cmpChartInstanceRef.current) cmpChartInstanceRef.current.destroy();
      cmpChartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Período A', data: dataA, backgroundColor: '#3b82f6' },
            { label: 'Período B', data: dataB, backgroundColor: '#22c55e' }
          ]
        },
        options: {
          plugins: { legend: { position: 'bottom', labels: { color: '#e5e7eb' } } },
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { ticks: { color: '#e5e7eb' } }, y: { ticks: { color: '#e5e7eb' } } }
        }
      });
    }
    return () => {
      if (cmpChartInstanceRef.current) {
        cmpChartInstanceRef.current.destroy();
        cmpChartInstanceRef.current = null;
      }
    };
  }, [showComparativoModal, comparativo]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Smart Location</h1>
            <span className="text-sm text-gray-400">Selecione a operação</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('produto')}
              className={`px-3 py-2 rounded text-sm ${view === 'produto' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              Buscar Produto
            </button>
            <button
              type="button"
              onClick={() => setView('layout')}
              className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${view === 'layout' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              Planejar Galpão
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30">Novo</span>
            </button>
          </div>
        </div>
      </header>

      {view === 'layout' ? (
        <LayoutPlanner />
      ) : (
      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Modal de Sugestão */}
        {showModal && sugestao && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sugestao-title"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-gray-800/90 border border-gray-700 shadow-xl rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl p-3 sm:p-4 max-h-[85vh] overflow-y-auto animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeaderIcon className="text-gray-300" />
                  <h3 id="sugestao-title" className="font-medium">Sugestão de Endereço</h3>
                </div>
                <StatusBadge status={sugestao?.status || 'ideal'} />
              </div>
              <p className="mt-3 text-xl md:text-2xl font-semibold text-green-300">{sugestao.endereco}</p>
              <p className="mt-2 text-sm text-gray-300">{sugestao.justificativa}</p>
              {(sugestao?.confianca ?? sugestao?.confidence) && (
                <p className="mt-2 text-sm text-gray-400">Confiança: {sugestao?.confianca ?? sugestao?.confidence}</p>
              )}
              {(sugestao?.provider ?? sugestao?.contextInfo?.provider) && (
                <p className="mt-1 text-xs text-gray-500">Provider: {sugestao?.provider ?? sugestao?.contextInfo?.provider}</p>
              )}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <p className="text-gray-200">LPN: <span className="text-gray-300">{sugestao?.lpn || '-'}</span></p>
                <p className="text-gray-200">Embalagem: <span className="text-gray-300">{({unitario:'Unitário',fracionado:'Fracionado',meia_caixa:'Meia caixa',caixa_fechada:'Caixa fechada',palletizado:'Palletizado'}[sugestao?.tipoEmbalagem || produto?.tipoEmbalagem]) || '-'}</span></p>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-300">Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Relatório IA */}
        {showRelatorioModal && relatorio && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="relatorio-title"
            onClick={() => setShowRelatorioModal(false)}
          >
            <div
              className="bg-gray-800/90 border border-gray-700 shadow-xl rounded-lg w-full max-w-xl sm:max-w-2xl md:max-w-3xl p-3 sm:p-4 md:p-6 max-h-[85vh] overflow-y-auto animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeaderIcon className="text-gray-300" />
                  <h3 id="relatorio-title" className="font-medium">{relatorio.titulo || 'Relatório IA'}</h3>
                </div>
                <span className="text-xs text-gray-400">Provider: {relatorio.provider || 'internal'}</span>
              </div>
              <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-300">Período</p>
                  <p className="text-gray-400">Início: {relatorio?.periodo?.inicio || '-'}</p>
                  <p className="text-gray-400">Fim: {relatorio?.periodo?.fim || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-300">Gerado em</p>
                  <p className="text-gray-400">{relatorio?.geradoEm || '-'}</p>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-200">Métricas</h4>
                <div className="mt-2 grid md:grid-cols-2 gap-3 text-sm">
                  <div className="border border-gray-700 rounded p-3">
                    <p className="text-gray-400">Total de sugestões: {relatorio?.metricas?.total ?? 0}</p>
                    <ul className="mt-2 space-y-1 text-gray-300">
                      <li>Refrigerada: {relatorio?.metricas?.distribuicao?.refrigerada?.qtd ?? 0} ({relatorio?.metricas?.distribuicao?.refrigerada?.pct ?? 0}%)</li>
                      <li>Expedição: {relatorio?.metricas?.distribuicao?.expedicao?.qtd ?? 0} ({relatorio?.metricas?.distribuicao?.expedicao?.pct ?? 0}%)</li>
                      <li>Níveis Inferiores: {relatorio?.metricas?.distribuicao?.niveisInferiores?.qtd ?? 0} ({relatorio?.metricas?.distribuicao?.niveisInferiores?.pct ?? 0}%)</li>
                      <li>Armazenagem Padrão: {relatorio?.metricas?.distribuicao?.padrao?.qtd ?? 0} ({relatorio?.metricas?.distribuicao?.padrao?.pct ?? 0}%)</li>
                    </ul>
                  </div>
                  <div className="border border-gray-700 rounded p-3">
                    <p className="text-gray-400">Observações</p>
                    <ul className="mt-2 space-y-1 text-gray-300">
                      {(Array.isArray(relatorio?.observacoes) && relatorio.observacoes.length > 0) ? relatorio.observacoes.map((o, i) => (
                        <li key={i}>• {o}</li>
                      )) : <li>Sem observações.</li>}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-200">Distribuição por área</h4>
                <div className="mt-2 bg-gray-900/40 border border-gray-700 rounded p-3 sm:p-4 relative h-40 md:h-56">
                  <canvas ref={chartCanvasRef} />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-200">Recomendações</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-300">
                  {(Array.isArray(relatorio?.recomendacoes) && relatorio.recomendacoes.length > 0) ? relatorio.recomendacoes.map((r, i) => (
                    <li key={i}>• {r}</li>
                  )) : <li>Sem recomendações.</li>}
                </ul>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowRelatorioModal(false)} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-300">Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Comparativo IA */}
        {showComparativoModal && comparativo && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comparativo-title"
            onClick={() => setShowComparativoModal(false)}
          >
            <div
              className="bg-gray-800/90 border border-gray-700 shadow-xl rounded-lg w-full max-w-3xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeaderIcon className="text-gray-300" />
                  <h3 id="comparativo-title" className="font-medium">Comparativo IA</h3>
                </div>
                <span className="text-xs text-gray-400">Provider: {iaProvider} · Modo: {iaModo}</span>
              </div>
              <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm">
                <div className="border border-gray-700 rounded p-3">
                  <p className="text-gray-300 font-medium">Período A</p>
                  <p className="text-gray-400">Total: {comparativo?.A?.metricas?.total ?? 0}</p>
                  <ul className="mt-2 space-y-1 text-gray-300">
                    <li>Ref.: {comparativo?.A?.metricas?.distribuicao?.refrigerada?.qtd ?? 0}</li>
                    <li>Exp.: {comparativo?.A?.metricas?.distribuicao?.expedicao?.qtd ?? 0}</li>
                    <li>Inf.: {comparativo?.A?.metricas?.distribuicao?.niveisInferiores?.qtd ?? 0}</li>
                    <li>Pad.: {comparativo?.A?.metricas?.distribuicao?.padrao?.qtd ?? 0}</li>
                  </ul>
                </div>
                <div className="border border-gray-700 rounded p-3">
                  <p className="text-gray-300 font-medium">Período B</p>
                  <p className="text-gray-400">Total: {comparativo?.B?.metricas?.total ?? 0}</p>
                  <ul className="mt-2 space-y-1 text-gray-300">
                    <li>Ref.: {comparativo?.B?.metricas?.distribuicao?.refrigerada?.qtd ?? 0}</li>
                    <li>Exp.: {comparativo?.B?.metricas?.distribuicao?.expedicao?.qtd ?? 0}</li>
                    <li>Inf.: {comparativo?.B?.metricas?.distribuicao?.niveisInferiores?.qtd ?? 0}</li>
                    <li>Pad.: {comparativo?.B?.metricas?.distribuicao?.padrao?.qtd ?? 0}</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-200">Gráfico comparativo</h4>
                <div className="mt-2 bg-gray-900/40 border border-gray-700 rounded p-3 relative h-48">
                  <canvas ref={cmpChartRef} />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowComparativoModal(false)} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-300">Fechar</button>
              </div>
            </div>
          </div>
        )}
        <section className="md:col-span-2">
          <div ref={refCadastro} className="bg-gray-800/60 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <HeaderIcon className="text-gray-300" />
              <h2 className="font-medium">Cadastro e Simulação de Produto</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <label className="text-sm text-gray-300">Nome</label>
                <input
                  className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2"
                  value={produto.nome}
                  onChange={e => { updateField('nome', e.target.value); setOpenSugNome(true); }}
                  onFocus={() => setOpenSugNome(true)}
                  onBlur={() => setTimeout(() => setOpenSugNome(false), 100)}
                  placeholder="Ex: Leite UHT"
                />
                {openSugNome && sugestoesNome.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded border border-gray-700 bg-gray-900 shadow-lg max-h-60 overflow-auto">
                    <ul className="divide-y divide-gray-800">
                      {sugestoesNome.map((s, i) => (
                        <li key={`sn-${i}`}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-800"
                            onClick={() => {
                              setProduto(prev => ({ ...prev, nome: s.nome || '', sku: s.sku || prev.sku }));
                              setOpenSugNome(false);
                            }}
                          >
                            <span className="block text-gray-200">{s.nome}</span>
                            <span className="block text-xs text-gray-400">SKU: {s.sku || '-'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="text-sm text-gray-300">SKU</label>
                <input
                  className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2"
                  value={produto.sku}
                  onChange={e => { updateField('sku', e.target.value); setOpenSugSku(true); }}
                  onFocus={() => setOpenSugSku(true)}
                  onBlur={() => setTimeout(() => setOpenSugSku(false), 100)}
                  placeholder="Ex: LTN-001"
                />
                {openSugSku && sugestoesSku.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded border border-gray-700 bg-gray-900 shadow-lg max-h-60 overflow-auto">
                    <ul className="divide-y divide-gray-800">
                      {sugestoesSku.map((s, i) => (
                        <li key={`ss-${i}`}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-800"
                            onClick={() => {
                              setProduto(prev => ({ ...prev, sku: s.sku || '', nome: s.nome || prev.nome }));
                              setOpenSugSku(false);
                            }}
                          >
                            <span className="block text-gray-200">{s.sku}</span>
                            <span className="block text-xs text-gray-400">{s.nome || '-'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Botão OCR para Etiquetas */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-300">📷 Leitura Automática de Etiqueta</label>
                  {ocrError && (
                    <span className="text-xs text-red-400">{ocrError}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={ocrLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {ocrLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        📸 Capturar Etiqueta
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tire uma foto da etiqueta do produto para preenchimento automático dos campos
                </p>
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Perecível</label>
                <div className="mt-1 flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-700"
                      checked={produto.perecivel === true}
                      onChange={() => updateField('perecivel', true)}
                    />
                    <span className="text-xs">PERECÍVEL</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-700"
                      checked={produto.perecivel === false}
                      onChange={() => updateField('perecivel', false)}
                    />
                    <span className="text-xs">NÃO PERECÍVEL</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300">Peso (kg)</label>
                <input type="number" step="0.01" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={produto.pesoKg} onChange={e => updateField('pesoKg', e.target.value)} placeholder="Ex: 12" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Validade</label>
                <input type="date" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={produto.validade} onChange={e => updateField('validade', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Shelf Life (dias)</label>
                <input type="number" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={produto.shelfLifeDias} onChange={e => updateField('shelfLifeDias', e.target.value)} placeholder="Ex: 30" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Volume (m³)</label>
                <input type="number" step="0.001" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={produto.volume} onChange={e => updateField('volume', e.target.value)} placeholder="Ex: 0.08" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Tipo de Embalagem</label>
                <select className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={produto.tipoEmbalagem} onChange={e => updateField('tipoEmbalagem', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="unitario">Unitário</option>
                  <option value="fracionado">Fracionado</option>
                  <option value="meia_caixa">Meia caixa</option>
                  <option value="caixa_fechada">Caixa fechada</option>
                  <option value="palletizado">Palletizado</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Área atual do estoque (mock)</label>
                <select className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={produto.areaAtual} onChange={e => updateField('areaAtual', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="expedicao">Zona de Expedição</option>
                  <option value="refrigerada">Área Refrigerada</option>
                  <option value="inferior">Níveis Inferiores</option>
                  <option value="padrao">Armazenagem Padrão</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button disabled={!canSubmit || loading} onClick={onSugerir} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-300">{loading ? 'Processando...' : 'Sugerir Endereço'}</button>
              {error && <span className="text-sm text-red-400">{error}</span>}
            </div>
          </div>

          {/* Card de sugestão movido para largura total abaixo */}
        </section>

        <aside>
          <div ref={refHistorico} className="bg-gray-800/60 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeaderIcon className="text-gray-300" />
                <h2 className="font-medium">Histórico de Sugestões</h2>
              </div>
              <button onClick={onLimparHistorico} className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-300">Limpar</button>
            </div>
            <div className="mt-3 overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="text-gray-300">
                  <tr>
                    <th className="text-left py-2 pr-2">SKU</th>
                    <th className="text-left py-2 pr-2">Produto</th>
                    <th className="text-left py-2 pr-2">Data/hora</th>
                    <th className="text-left py-2 pr-2">Endereço</th>
                    <th className="text-left py-2 pr-2">LPN</th>
                    <th className="text-left py-2 pr-2">Embalagem</th>
                    <th className="text-left py-2 pr-2">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-3 text-gray-400">Sem registros</td>
                    </tr>
                  )}
                  {historico.map((h, idx) => (
                    <tr key={idx} className="border-t border-gray-700">
                      <td className="py-2 pr-2">{h.sku}</td>
                      <td className="py-2 pr-2">{h.nome}</td>
                      <td className="py-2 pr-2 text-gray-400">{new Date(h.dataHora).toLocaleString()}</td>
                      <td className="py-2 pr-2">{h.endereco}</td>
                      <td className="py-2 pr-2">{h.lpn || '-'}</td>
                      <td className="py-2 pr-2">{({unitario:'Unitário',fracionado:'Fracionado',meia_caixa:'Meia caixa',caixa_fechada:'Caixa fechada',palletizado:'Palletizado'}[h.tipoEmbalagem]) || '-'}</td>
                      <td className="py-2 pr-2 text-gray-300">{h.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card de Recursos movido para a linha inferior em meia largura */}

          <div ref={refResumo} className="mt-6 bg-gray-800/60 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="flex items-center gap-2">
              <HeaderIcon className="text-gray-300" />
              <h2 className="font-medium">Resumo do Histórico</h2>
            </div>
            <p className="mt-2 text-sm text-gray-300 whitespace-pre-line">{resumo || 'Sem resumo disponível.'}</p>
          </div>

          {/* Card de Relatório IA movido para a linha inferior em meia largura */}
        </aside>

        {/* Sugestão em largura total (abaixo do topo) */}
        {sugestao && (
          <div ref={refSugestaoCard} className="md:col-span-3 bg-gray-800/60 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeaderIcon className="text-gray-300" />
                <h3 className="font-medium">Sugestão de Endereço</h3>
              </div>
              <StatusBadge status={sugestao?.status || 'ideal'} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-green-300">{sugestao.endereco}</p>
            <p className="mt-2 text-sm text-gray-300">{sugestao.justificativa}</p>
            {(sugestao?.confianca ?? sugestao?.confidence) && (
              <p className="mt-2 text-sm text-gray-400">Confiança: {sugestao?.confianca ?? sugestao?.confidence}</p>
            )}
            {(sugestao?.provider ?? sugestao?.contextInfo?.provider) && (
              <p className="mt-1 text-xs text-gray-500">Provider: {sugestao?.provider ?? sugestao?.contextInfo?.provider}</p>
            )}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <p className="text-gray-200">LPN: <span className="text-gray-300">{sugestao?.lpn || '-'}</span></p>
              <p className="text-gray-200">SKU: <span className="text-gray-300">{produto?.sku || '-'}</span></p>
              <p className="text-gray-200">Embalagem: <span className="text-gray-300">{({unitario:'Unitário',fracionado:'Fracionado',meia_caixa:'Meia caixa',caixa_fechada:'Caixa fechada',palletizado:'Palletizado'}[sugestao?.tipoEmbalagem || produto?.tipoEmbalagem]) || '-'}</span></p>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setShowModal(true)} className="text-sm px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-300">Abrir modal</button>
            </div>
          </div>
        )}

        {/* Linha inferior com dois cards em meia largura */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Relatório IA */}
          <div ref={refRelatorioCard} className="bg-gray-800/60 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeaderIcon className="text-gray-300" />
                <h2 className="font-medium">Relatório IA</h2>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300">Início</label>
                <input type="date" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={relInicio} onChange={e => setRelInicio(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Fim</label>
                <input type="date" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={relFim} onChange={e => setRelFim(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300">Provider</label>
                <select className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={iaProvider} onChange={e => setIaProvider(e.target.value)}>
                  <option value="interno">Interno</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Modo de análise</label>
                <select className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={iaModo} onChange={e => setIaModo(e.target.value)}>
                  <option value="rapida">Rápida</option>
                  <option value="detalhada">Detalhada</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={onGerarRelatorio} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-300" disabled={loadingRel}>{loadingRel ? 'Gerando...' : 'Gerar Relatório com IA'}</button>
              {relatorio && <button onClick={() => setShowRelatorioModal(true)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-300">Abrir último relatório</button>}
              {relatorio && <button onClick={exportarCSVRelatorio} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-300">Exportar CSV</button>}
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2">
                <HeaderIcon className="text-gray-400" />
                <h3 className="font-medium">Comparar períodos</h3>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300">Início A</label>
                  <input type="date" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={cmpInicioA} onChange={e => setCmpInicioA(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Fim A</label>
                  <input type="date" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={cmpFimA} onChange={e => setCmpFimA(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Início B</label>
                  <input type="date" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={cmpInicioB} onChange={e => setCmpInicioB(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Fim B</label>
                  <input type="date" className="mt-1 w-full rounded bg-gray-900 border border-gray-700 px-3 py-2" value={cmpFimB} onChange={e => setCmpFimB(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <button onClick={onGerarComparativo} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-300" disabled={loadingCmp}>{loadingCmp ? 'Comparando...' : 'Gerar Comparativo IA'}</button>
                {comparativo && <button onClick={() => setShowComparativoModal(true)} className="ml-3 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-300">Abrir último comparativo</button>}
              </div>
            </div>
          </div>

          {/* Recursos Operacionais */}
          <div ref={refRecursosCard} className="bg-gray-800/60 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="flex items-center gap-2">
              <HeaderIcon className="text-gray-300" />
              <h2 className="font-medium">Recursos Operacionais</h2>
            </div>
            <div className="mt-3">
              <h3 className="text-sm text-gray-300">Veículos</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {recursos.veiculos.length === 0 && <li className="text-gray-400">Sem dados</li>}
                {recursos.veiculos.map((v, i) => (
                  <li key={i} className="border border-gray-700 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.tipo}</span>
                      <span className="text-xs text-gray-400">Qtd: {v.quantidade} · Disp.: {v.disponiveis}</span>
                    </div>
                    {Array.isArray(v.observacoes) && v.observacoes.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">{v.observacoes.join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h3 className="text-sm text-gray-300">Operadores</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {recursos.operadores.length === 0 && <li className="text-gray-400">Sem dados</li>}
                {recursos.operadores.map((o, i) => (
                  <li key={i} className="border border-gray-700 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{o.nome}</span>
                      <span className="text-xs text-gray-400">Turno: {o.turno} · {o.status}</span>
                    </div>
                    {Array.isArray(o.habilitacoes) && o.habilitacoes.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">Habilitações: {o.habilitacoes.join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
      )}

      {/* Chatbot flutuante */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg px-4 py-3"
          aria-label="Abrir chat IA"
        >
          Chat IA
        </button>
      )}

      {chatOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[22rem] sm:w-[24rem] bg-gray-800/90 border border-gray-700 rounded-lg shadow-xl flex flex-col max-h-[70vh]">
          <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium">Assistente IA</span>
            <span className="text-[10px] text-gray-400">Provider: {chatProvider}</span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-200"
              aria-label="Fechar chat"
            >
              Fechar
            </button>
          </div>
          <div className="p-3 overflow-y-auto space-y-2" style={{ minHeight: '200px' }}>
            {chatMessages.map((m, idx) => (
              <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-3 py-2 rounded text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={onChatSend} className="p-3 border-t border-gray-700 flex gap-2">
            <input
              type="text"
              className="flex-1 rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
              placeholder="Digite sua mensagem..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={chatSending}
            />
            <button
              type="submit"
              className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm"
              disabled={chatSending}
            >
              {chatSending ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      <footer className="max-w-6xl mx-auto px-4 py-6 text-xs text-gray-500">
        Pronto para integração com WMS e IA (mock por enquanto).
      </footer>
    </div>
  );
}