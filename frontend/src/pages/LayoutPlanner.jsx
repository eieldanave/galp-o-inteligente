import React from 'react';
import { listSpaces, createSpace, listShelves, createShelf, placeShelf } from '../api.js';

export default function LayoutPlanner() {
  const [spaces, setSpaces] = React.useState([]);
  const [shelves, setShelves] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const [newSpace, setNewSpace] = React.useState({
    nome: '', tipo: 'padrao', largura: 10, comprimento: 20, altura: 6,
    corredorLarguraMin: 3, recuoParedes: 0.5, capacidadePaletes: 50,
    temperatura: 'ambiente', restricoes: []
  });

  const [newShelf, setNewShelf] = React.useState({
    nome: '', tipo: 'gaveta_pequena', largura: 1.2, comprimento: 2.4, altura: 2.2,
    niveis: 4, cargaMaximaKg: 600, refrigerada: false, temperaturaOperacao: null,
    profundidade: 0.5, acessos: 'frontal'
  });

  const [place, setPlace] = React.useState({ spaceId: '', shelfId: '', x: 1, y: 1, orientacao: 'horizontal' });

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [sp, sh] = await Promise.all([listSpaces(), listShelves()]);
        setSpaces(sp?.spaces || []);
        setShelves(sh?.shelves || []);
        setPlace(p => ({ ...p, spaceId: sp?.spaces?.[0]?.id || '', shelfId: sh?.shelves?.[0]?.id || '' }));
      } catch (e) {
        setMsg('Falha ao carregar layout. Verifique o backend.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreateSpace(e) {
    e?.preventDefault();
    try {
      setLoading(true);
      setMsg('');
      const r = await createSpace(newSpace);
      setSpaces(prev => [...prev, r.space]);
      setMsg('Espaço criado com sucesso.');
      setNewSpace({ nome: '', tipo: 'padrao', largura: 10, comprimento: 20, altura: 6, corredorLarguraMin: 3, recuoParedes: 0.5, capacidadePaletes: 50, temperatura: 'ambiente', restricoes: [] });
    } catch (e) {
      setMsg('Erro ao criar espaço.');
    } finally {
      setLoading(false);
    }
  }

  async function onCreateShelf(e) {
    e?.preventDefault();
    try {
      setLoading(true);
      setMsg('');
      const r = await createShelf(newShelf);
      setShelves(prev => [...prev, r.shelf]);
      setMsg('Prateleira criada com sucesso.');
      setNewShelf({ nome: '', tipo: 'gaveta_pequena', largura: 1.2, comprimento: 2.4, altura: 2.2, niveis: 4, cargaMaximaKg: 600, refrigerada: false, temperaturaOperacao: null, profundidade: 0.5, acessos: 'frontal' });
    } catch (e) {
      setMsg('Erro ao criar prateleira.');
    } finally {
      setLoading(false);
    }
  }

  async function onPlaceShelf(e) {
    e?.preventDefault();
    if (!place.spaceId || !place.shelfId) { setMsg('Selecione espaço e prateleira.'); return; }
    try {
      setLoading(true);
      setMsg('');
      const r = await placeShelf(place.spaceId, { shelfId: place.shelfId, x: Number(place.x), y: Number(place.y), orientacao: place.orientacao });
      // Atualiza o espaço na lista
      setSpaces(prev => prev.map(s => (s.id === r.space.id ? r.space : s)));
      setMsg('Prateleira posicionada com sucesso.');
    } catch (e) {
      setMsg('Erro ao posicionar prateleira.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Planejar Galpão <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30">Novo</span></h2>
        {loading && <span className="text-xs text-gray-400">Carregando...</span>}
      </div>

      {msg && <div className="mb-4 text-sm text-gray-300">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Espaços */}
        <div className="lg:col-span-2 bg-gray-800/60 rounded-lg p-4 border border-gray-700">
          <h3 className="font-medium mb-3">Espaços</h3>
          <div className="space-y-3">
            {spaces.length === 0 && <p className="text-sm text-gray-400">Nenhum espaço cadastrado.</p>}
            {spaces.map(s => (
              <div key={s.id} className="border border-gray-700 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-200">{s.nome} <span className="text-xs text-gray-400">({s.tipo})</span></p>
                    <p className="text-xs text-gray-400">{s.largura}m x {s.comprimento}m x {s.altura}m · Cap.: {s.capacidadePaletes}</p>
                  </div>
                  <button className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={() => setPlace(p => ({ ...p, spaceId: s.id }))}>Usar para posicionar</button>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Prateleiras posicionadas: {Array.isArray(s.shelvesPlaced) ? s.shelvesPlaced.length : 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Criar espaço */}
        <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
          <h3 className="font-medium mb-3">Criar Espaço</h3>
          <form className="space-y-2" onSubmit={onCreateSpace}>
            <input className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Nome" value={newSpace.nome} onChange={e => setNewSpace({ ...newSpace, nome: e.target.value })} />
            <select className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" value={newSpace.tipo} onChange={e => setNewSpace({ ...newSpace, tipo: e.target.value })}>
              <option value="padrao">Padrão</option>
              <option value="refrigerada">Refrigerada</option>
              <option value="expedicao">Expedição</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Largura" value={newSpace.largura} onChange={e => setNewSpace({ ...newSpace, largura: e.target.value })} />
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Comprimento" value={newSpace.comprimento} onChange={e => setNewSpace({ ...newSpace, comprimento: e.target.value })} />
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Altura" value={newSpace.altura} onChange={e => setNewSpace({ ...newSpace, altura: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Corredor mínimo" value={newSpace.corredorLarguraMin} onChange={e => setNewSpace({ ...newSpace, corredorLarguraMin: e.target.value })} />
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Recuo paredes" value={newSpace.recuoParedes} onChange={e => setNewSpace({ ...newSpace, recuoParedes: e.target.value })} />
            </div>
            <input type="number" className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Capacidade paletes" value={newSpace.capacidadePaletes} onChange={e => setNewSpace({ ...newSpace, capacidadePaletes: e.target.value })} />
            <select className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" value={newSpace.temperatura} onChange={e => setNewSpace({ ...newSpace, temperatura: e.target.value })}>
              <option value="ambiente">Ambiente</option>
              <option value="controlada">Controlada</option>
              <option value="refrigerada">Refrigerada</option>
            </select>
            <button type="submit" className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Salvar Espaço</button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Prateleiras */}
        <div className="lg:col-span-2 bg-gray-800/60 rounded-lg p-4 border border-gray-700">
          <h3 className="font-medium mb-3">Prateleiras</h3>
          <div className="space-y-3">
            {shelves.length === 0 && <p className="text-sm text-gray-400">Nenhuma prateleira cadastrada.</p>}
            {shelves.map(s => (
              <div key={s.id} className="border border-gray-700 rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-200">{s.nome} <span className="text-xs text-gray-400">({s.tipo})</span></p>
                  <p className="text-xs text-gray-400">{s.largura}m x {s.comprimento}m x {s.altura}m · Níveis: {s.niveis}</p>
                </div>
                <button className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={() => setPlace(p => ({ ...p, shelfId: s.id }))}>Usar para posicionar</button>
              </div>
            ))}
          </div>
        </div>

        {/* Criar prateleira */}
        <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
          <h3 className="font-medium mb-3">Criar Prateleira</h3>
          <form className="space-y-2" onSubmit={onCreateShelf}>
            <input className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Nome" value={newShelf.nome} onChange={e => setNewShelf({ ...newShelf, nome: e.target.value })} />
            <select className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" value={newShelf.tipo} onChange={e => setNewShelf({ ...newShelf, tipo: e.target.value })}>
              <option value="gaveta_pequena">Gaveta pequena</option>
              <option value="pallet">Pallet</option>
              <option value="refrigerada">Refrigerada</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Largura" value={newShelf.largura} onChange={e => setNewShelf({ ...newShelf, largura: e.target.value })} />
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Comprimento" value={newShelf.comprimento} onChange={e => setNewShelf({ ...newShelf, comprimento: e.target.value })} />
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Altura" value={newShelf.altura} onChange={e => setNewShelf({ ...newShelf, altura: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Níveis" value={newShelf.niveis} onChange={e => setNewShelf({ ...newShelf, niveis: e.target.value })} />
              <input type="number" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Carga Máx. (kg)" value={newShelf.cargaMaximaKg} onChange={e => setNewShelf({ ...newShelf, cargaMaximaKg: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-300 flex items-center gap-2"><input type="checkbox" checked={newShelf.refrigerada} onChange={e => setNewShelf({ ...newShelf, refrigerada: e.target.checked })} /> Refrigerada</label>
              <input className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Temp. operação" value={newShelf.temperaturaOperacao || ''} onChange={e => setNewShelf({ ...newShelf, temperaturaOperacao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Profundidade" value={newShelf.profundidade} onChange={e => setNewShelf({ ...newShelf, profundidade: e.target.value })} />
              <input className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="Acessos" value={newShelf.acessos} onChange={e => setNewShelf({ ...newShelf, acessos: e.target.value })} />
            </div>
            <button type="submit" className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Salvar Prateleira</button>
          </form>
        </div>
      </div>

      {/* Posicionamento */}
      <div className="mt-6 bg-gray-800/60 rounded-lg p-4 border border-gray-700">
        <h3 className="font-medium mb-3">Posicionar Prateleira</h3>
        <form className="grid grid-cols-1 md:grid-cols-5 gap-2" onSubmit={onPlaceShelf}>
          <select className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" value={place.spaceId} onChange={e => setPlace({ ...place, spaceId: e.target.value })}>
            <option value="">Selecione o espaço...</option>
            {spaces.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <select className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" value={place.shelfId} onChange={e => setPlace({ ...place, shelfId: e.target.value })}>
            <option value="">Selecione a prateleira...</option>
            {shelves.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="x" value={place.x} onChange={e => setPlace({ ...place, x: e.target.value })} />
          <input type="number" step="0.1" className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" placeholder="y" value={place.y} onChange={e => setPlace({ ...place, y: e.target.value })} />
          <select className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" value={place.orientacao} onChange={e => setPlace({ ...place, orientacao: e.target.value })}>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
          <div className="md:col-span-5 mt-2">
            <button type="submit" className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Posicionar</button>
          </div>
        </form>
      </div>
    </div>
  );
}