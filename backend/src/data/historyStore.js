import fs from 'fs';
import path from 'path';

const historyPath = path.resolve('backend/data/history.json');

function ensureFile() {
  if (!fs.existsSync(path.dirname(historyPath))) {
    fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  }
  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, '[]', 'utf-8');
  }
}

export function readHistory() {
  ensureFile();
  try {
    const raw = fs.readFileSync(historyPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function appendHistory(entry) {
  ensureFile();
  const all = readHistory();
  all.unshift(entry);
  fs.writeFileSync(historyPath, JSON.stringify(all, null, 2));
  return all;
}

export function clearHistory() {
  ensureFile();
  fs.writeFileSync(historyPath, '[]', 'utf-8');
  return true;
}