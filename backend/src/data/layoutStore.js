import fs from 'fs';
import path from 'path';

const layoutPath = path.resolve('backend/data/layout.json');

function ensureFile() {
  if (!fs.existsSync(path.dirname(layoutPath))) {
    fs.mkdirSync(path.dirname(layoutPath), { recursive: true });
  }
  if (!fs.existsSync(layoutPath)) {
    const initial = { spaces: [], shelves: [] };
    fs.writeFileSync(layoutPath, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

export function readLayout() {
  ensureFile();
  try {
    const raw = fs.readFileSync(layoutPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { spaces: [], shelves: [] };
  }
}

export function writeLayout(data) {
  ensureFile();
  fs.writeFileSync(layoutPath, JSON.stringify(data, null, 2));
}

export function addSpace(space) {
  const data = readLayout();
  const id = 'esp_' + Date.now();
  const newSpace = { id, shelvesPlaced: [], ...space };
  data.spaces.push(newSpace);
  writeLayout(data);
  return newSpace;
}

export function listSpaces() {
  return readLayout().spaces;
}

export function getSpace(id) {
  const data = readLayout();
  return data.spaces.find(s => s.id === id) || null;
}

export function addShelf(shelf) {
  const data = readLayout();
  const id = 'prat_' + Date.now();
  const newShelf = { id, ...shelf };
  data.shelves.push(newShelf);
  writeLayout(data);
  return newShelf;
}

export function listShelves() {
  return readLayout().shelves;
}

export function placeShelf(spaceId, placement) {
  const data = readLayout();
  const space = data.spaces.find(s => s.id === spaceId);
  if (!space) throw new Error('Espaço não encontrado');
  space.shelvesPlaced.push(placement);
  writeLayout(data);
  return space;
}