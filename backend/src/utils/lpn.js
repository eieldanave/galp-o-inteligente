export function gerarLPN({ sku = '', facility = 'SL', prefix = 'LPN' } = {}) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const date = `${yyyy}${mm}${dd}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const skuPart = String(sku).replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase();
  return `${prefix}-${facility}-${date}-${skuPart || 'ITEM'}-${rand}`;
}