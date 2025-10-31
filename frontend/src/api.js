const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function fetchWithRetry(url, options = {}, retries = 2, backoffMs = 400) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, backoffMs));
    return fetchWithRetry(url, options, retries - 1, backoffMs * 2);
  }
}

export async function sugerirEndereco(produto) {
  return fetchWithRetry(`${baseUrl}/api/sugerir-endereco`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(produto)
  });
}

export async function getHistorico() {
  try {
    const data = await fetchWithRetry(`${baseUrl}/api/historico`);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.value)) return data.value;
    return [];
  } catch {
    return [];
  }
}

export async function limparHistorico() {
  try {
    const res = await fetch(`${baseUrl}/api/historico`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

// Novas APIs integradas
export async function getRecursos() {
  try {
    return await fetchWithRetry(`${baseUrl}/api/resources/recursos`);
  } catch {
    return { veiculos: [], operadores: [] };
  }
}

export async function getResumoHistorico() {
  try {
    const r = await fetchWithRetry(`${baseUrl}/api/summary/resumo-historico`);
    return r?.resumo || '';
  } catch {
    return '';
  }
}

export async function getConfigIA() {
  try {
    const r = await fetchWithRetry(`${baseUrl}/api/config/ia`);
    return r?.config || {};
  } catch {
    return {};
  }
}

export async function classificarPerecivel(nome) {
  return fetchWithRetry(`${baseUrl}/api/classifier/classificar-perecivel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome })
  });
}

export async function assistenteCadastro(produto) {
  return fetchWithRetry(`${baseUrl}/api/assistente/assistente-cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(produto)
  });
}

export async function gerarRelatorioIA({ inicio = null, fim = null, provider = null, modo = null } = {}) {
  return fetchWithRetry(`${baseUrl}/api/reports/gerar-relatorio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inicio, fim, provider, modo })
  });
}

export async function sugerirProdutos({ q = '', field = '' } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (field) params.set('field', field);
  return fetchWithRetry(`${baseUrl}/api/products/sugerir?${params.toString()}`);
}

// Chatbot
export async function sendChatMessage(messages = []) {
  return fetchWithRetry(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
}

// OCR de etiquetas
export async function processarOCR(imagemFile) {
  const formData = new FormData();
  formData.append('imagem', imagemFile);
  
  try {
    const res = await fetch(`${baseUrl}/api/ocr/etiqueta`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    throw new Error(`Erro no OCR: ${error.message}`);
  }
}

export async function getStatusOCR() {
  return fetchWithRetry(`${baseUrl}/api/ocr/status`);
}

// Layout APIs
export async function listSpaces() {
  return fetchWithRetry(`${baseUrl}/api/layout/spaces`);
}

export async function getSpace(id) {
  return fetchWithRetry(`${baseUrl}/api/layout/spaces/${id}`);
}

export async function createSpace(space) {
  return fetchWithRetry(`${baseUrl}/api/layout/spaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(space)
  });
}

export async function listShelves() {
  return fetchWithRetry(`${baseUrl}/api/layout/shelves`);
}

export async function createShelf(shelf) {
  return fetchWithRetry(`${baseUrl}/api/layout/shelves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shelf)
  });
}

export async function placeShelf(spaceId, payload) {
  return fetchWithRetry(`${baseUrl}/api/layout/spaces/${spaceId}/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}