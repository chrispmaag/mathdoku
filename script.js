'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
let SIZE = 3;         // 3 or 4
let CELL_PX = 100;    // cell size in px

const CELL_PX_BY_SIZE = { 3: 100, 4: 85, 5: 88 };

function computeCellPx() {
  const maxFromViewport = Math.floor((window.innerWidth - 48) / SIZE);
  return Math.min(CELL_PX_BY_SIZE[SIZE], maxFromViewport);
}

// ── State ─────────────────────────────────────────────────────────────────────
let solution = [];
let userGrid = [];
let cages = [];
let cellToCage = [];
let selectedCell = null;
let violatingCells = new Set();
let isComplete = false;

const PALETTE = [
  '#fde68a', '#a7f3d0', '#bfdbfe', '#fecaca',
  '#ddd6fe', '#fed7aa', '#d1fae5', '#f5d0fe',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cellCount() { return SIZE * SIZE; }

function rowOf(cell) { return Math.floor(cell / SIZE); }
function colOf(cell) { return cell % SIZE; }

// ── Latin Square ──────────────────────────────────────────────────────────────
function isLatinValid(grid, r, c, n) {
  for (let col = 0; col < SIZE; col++) {
    if (col !== c && grid[r * SIZE + col] === n) return false;
  }
  for (let row = 0; row < SIZE; row++) {
    if (row !== r && grid[row * SIZE + c] === n) return false;
  }
  return true;
}

function generateLatinSquare() {
  const nums = Array.from({ length: SIZE }, (_, i) => i + 1);
  const grid = new Array(cellCount()).fill(0);
  function bt(idx) {
    if (idx === cellCount()) return true;
    const r = rowOf(idx), c = colOf(idx);
    for (const n of shuffle([...nums])) {
      if (isLatinValid(grid, r, c, n)) {
        grid[idx] = n;
        if (bt(idx + 1)) return true;
        grid[idx] = 0;
      }
    }
    return false;
  }
  bt(0);
  return grid;
}

// ── Cage Generation ───────────────────────────────────────────────────────────
function neighbors4(cell) {
  const r = rowOf(cell), c = colOf(cell);
  const result = [];
  if (r > 0)        result.push((r - 1) * SIZE + c);
  if (r < SIZE - 1) result.push((r + 1) * SIZE + c);
  if (c > 0)        result.push(r * SIZE + (c - 1));
  if (c < SIZE - 1) result.push(r * SIZE + (c + 1));
  return result;
}

function getUnassignedNeighbors(cell, assigned) {
  return neighbors4(cell).filter(n => !assigned.has(n));
}

function pickTargetSize() {
  // 3x3: max cage 3; 4x4: max cage 4
  const max = SIZE;
  const r = Math.random();
  if (r < 0.08) return 1;
  if (r < 0.40) return 2;
  if (r < 0.80) return 3;
  return Math.min(4, max);
}

function tryCageGeneration() {
  const assigned = new Set();
  const cageList = [];
  const order = shuffle(Array.from({ length: cellCount() }, (_, i) => i));

  for (const seed of order) {
    if (assigned.has(seed)) continue;
    const target = pickTargetSize();
    const cells = [seed];
    assigned.add(seed);

    while (cells.length < target) {
      const candidates = cells.flatMap(c => getUnassignedNeighbors(c, assigned));
      if (candidates.length === 0) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      cells.push(pick);
      assigned.add(pick);
    }

    cageList.push({ cells });
  }
  return cageList;
}

function generateCages() {
  const maxSingles = SIZE <= 3 ? 3 : SIZE;
  let result;
  do {
    result = tryCageGeneration();
  } while (result.filter(c => c.cells.length === 1).length > maxSingles);
  return result;
}

// ── Operation Assignment ──────────────────────────────────────────────────────
function findTopLeftCell(cells) {
  return cells.reduce((best, c) => {
    return rowOf(c) < rowOf(best) || (rowOf(c) === rowOf(best) && colOf(c) < colOf(best)) ? c : best;
  });
}

function assignOperation(cage) {
  const vals = cage.cells.map(c => solution[c]);

  if (cage.cells.length === 1) {
    cage.operation = '=';
    cage.target = vals[0];
    return;
  }

  if (cage.cells.length === 2) {
    const hi = Math.max(...vals), lo = Math.min(...vals);
    // Build candidate ops; include subtraction for 4×4 (more interesting)
    const ops = shuffle(SIZE >= 4 ? ['+', '×', '÷', '−', '−'] : ['+', '×', '÷']);
    for (const op of ops) {
      if (op === '+')  { cage.operation = '+'; cage.target = vals[0] + vals[1]; return; }
      if (op === '×')  { cage.operation = '×'; cage.target = vals[0] * vals[1]; return; }
      if (op === '−')  { cage.operation = '−'; cage.target = hi - lo; return; }
      if (op === '÷' && hi % lo === 0) { cage.operation = '÷'; cage.target = hi / lo; return; }
    }
    cage.operation = '+'; cage.target = vals[0] + vals[1];
    return;
  }

  // 3- or 4-cell cage
  const op = Math.random() < 0.55 ? '+' : '×';
  cage.operation = op;
  cage.target = op === '+' ? vals.reduce((a, b) => a + b, 0) : vals.reduce((a, b) => a * b, 1);
}

// ── Color Assignment ──────────────────────────────────────────────────────────
function buildCageAdjacency(cageList) {
  const adj = cageList.map(() => new Set());
  for (let i = 0; i < cageList.length; i++) {
    for (const cell of cageList[i].cells) {
      for (const nb of neighbors4(cell)) {
        const j = cellToCage[nb];
        if (j !== -1 && j !== i) { adj[i].add(j); adj[j].add(i); }
      }
    }
  }
  return adj;
}

function assignColors(cageList) {
  const adj = buildCageAdjacency(cageList);
  for (let i = 0; i < cageList.length; i++) {
    const usedColors = new Set([...adj[i]].map(j => cageList[j].color).filter(Boolean));
    cageList[i].color = PALETTE.find(p => !usedColors.has(p)) || PALETTE[0];
  }
}

// ── Board Rendering ───────────────────────────────────────────────────────────
function getBorderStyle(cell) {
  const r = rowOf(cell), c = colOf(cell);
  const thisCage = cellToCage[cell];
  const THICK = '3px solid #1e293b';
  const THIN  = '1px solid #94a3b8';
  const NONE  = 'none';

  const above = r > 0 ? cell - SIZE : -1;
  const left  = c > 0 ? cell - 1   : -1;

  return {
    borderTop:    above === -1 ? NONE : cellToCage[above] !== thisCage ? THICK : THIN,
    borderLeft:   left  === -1 ? NONE : cellToCage[left]  !== thisCage ? THICK : THIN,
    borderBottom: NONE,
    borderRight:  NONE,
  };
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  // Set grid dimensions dynamically
  const repeat = `repeat(${SIZE}, ${CELL_PX}px)`;
  board.style.gridTemplateColumns = repeat;
  board.style.gridTemplateRows    = repeat;

  for (let i = 0; i < cellCount(); i++) {
    const div = document.createElement('div');
    div.className = 'cell';
    div.dataset.idx = i;
    div.style.width  = CELL_PX + 'px';
    div.style.height = CELL_PX + 'px';

    const cageIdx = cellToCage[i];
    div.style.backgroundColor = cages[cageIdx].color;

    const b = getBorderStyle(i);
    div.style.borderTop    = b.borderTop;
    div.style.borderLeft   = b.borderLeft;
    div.style.borderBottom = b.borderBottom;
    div.style.borderRight  = b.borderRight;

    if (i === cages[cageIdx].topLeftCell) {
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = cages[cageIdx].operation + cages[cageIdx].target;
      div.appendChild(hint);
    }

    if (userGrid[i] !== 0) {
      const val = document.createElement('span');
      val.className = 'value';
      val.textContent = userGrid[i];
      div.appendChild(val);
    }

    if (selectedCell === i) div.classList.add('selected');
    if (violatingCells.has(i)) div.classList.add('error');

    board.appendChild(div);
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate() {
  violatingCells.clear();

  for (let r = 0; r < SIZE; r++) {
    const seen = {};
    for (let c = 0; c < SIZE; c++) {
      const idx = r * SIZE + c, v = userGrid[idx];
      if (v === 0) continue;
      if (seen[v] !== undefined) { violatingCells.add(idx); violatingCells.add(seen[v]); }
      else seen[v] = idx;
    }
  }

  for (let c = 0; c < SIZE; c++) {
    const seen = {};
    for (let r = 0; r < SIZE; r++) {
      const idx = r * SIZE + c, v = userGrid[idx];
      if (v === 0) continue;
      if (seen[v] !== undefined) { violatingCells.add(idx); violatingCells.add(seen[v]); }
      else seen[v] = idx;
    }
  }

  for (const cage of cages) {
    if (cage.cells.some(c => userGrid[c] === 0)) continue;
    const vals = cage.cells.map(c => userGrid[c]);
    let ok = false;
    switch (cage.operation) {
      case '=': ok = vals[0] === cage.target; break;
      case '+': ok = vals.reduce((a, b) => a + b, 0) === cage.target; break;
      case '×': ok = vals.reduce((a, b) => a * b, 1) === cage.target; break;
      case '−': { const hi = Math.max(...vals), lo = Math.min(...vals); ok = hi - lo === cage.target; break; }
      case '÷': { const hi = Math.max(...vals), lo = Math.min(...vals); ok = lo !== 0 && hi / lo === cage.target; break; }
    }
    if (!ok) cage.cells.forEach(c => violatingCells.add(c));
  }
}

// ── Win Detection ─────────────────────────────────────────────────────────────
function checkWin() {
  if (userGrid.every(v => v !== 0) && violatingCells.size === 0) {
    isComplete = true;
    document.getElementById('message').classList.remove('hidden');
  }
}

// ── Mobile Keypad ─────────────────────────────────────────────────────────────
const isTouchDevice = () => navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

function buildKeypad() {
  const container = document.getElementById('keypad-numbers');
  container.innerHTML = '';
  for (let n = 1; n <= SIZE; n++) {
    const btn = document.createElement('button');
    btn.className = 'keypad-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => keypadInput(n));
    container.appendChild(btn);
  }
  const clear = document.createElement('button');
  clear.className = 'keypad-btn clear-btn';
  clear.textContent = '⌫';
  clear.addEventListener('click', () => keypadInput(0));
  container.appendChild(clear);
}

function showKeypad() {
  document.getElementById('keypad').classList.add('open');
  document.getElementById('keypad-overlay').classList.add('open');
}

function hideKeypad() {
  document.getElementById('keypad').classList.remove('open');
  document.getElementById('keypad-overlay').classList.remove('open');
}

function keypadInput(n) {
  if (selectedCell === null) return;
  userGrid[selectedCell] = n;
  validate();
  checkWin();
  renderBoard();
  if (!isComplete) hideKeypad();
}

document.getElementById('keypad-close').addEventListener('click', hideKeypad);
document.getElementById('keypad-overlay').addEventListener('click', hideKeypad);

// ── Input Handling ────────────────────────────────────────────────────────────
document.getElementById('board').addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  selectedCell = parseInt(cell.dataset.idx, 10);
  renderBoard();
  if (isTouchDevice()) showKeypad();
});

document.addEventListener('keydown', (e) => {
  if (selectedCell === null) return;

  const maxKey = String(SIZE);
  if (e.key >= '1' && e.key <= maxKey) {
    userGrid[selectedCell] = parseInt(e.key, 10);
    validate(); checkWin(); renderBoard();
    return;
  }

  if (e.key === 'Backspace' || e.key === 'Delete') {
    userGrid[selectedCell] = 0;
    validate(); renderBoard();
    return;
  }

  const r = rowOf(selectedCell), c = colOf(selectedCell);
  if (e.key === 'ArrowUp'    && r > 0)        { e.preventDefault(); selectedCell -= SIZE; renderBoard(); }
  if (e.key === 'ArrowDown'  && r < SIZE - 1) { e.preventDefault(); selectedCell += SIZE; renderBoard(); }
  if (e.key === 'ArrowLeft'  && c > 0)        { e.preventDefault(); selectedCell -= 1;    renderBoard(); }
  if (e.key === 'ArrowRight' && c < SIZE - 1) { e.preventDefault(); selectedCell += 1;    renderBoard(); }
});

// ── Per-difficulty State ──────────────────────────────────────────────────────
const savedStates = {};

function saveState() {
  savedStates[SIZE] = {
    solution:      solution.slice(),
    userGrid:      userGrid.slice(),
    cages:         cages,
    cellToCage:    cellToCage.slice(),
    selectedCell,
    violatingCells: new Set(violatingCells),
    isComplete,
  };
}

function loadState(size) {
  SIZE   = size;
  CELL_PX = computeCellPx();
  updateSubtitle();
  if (savedStates[SIZE]) {
    const s = savedStates[SIZE];
    solution       = s.solution;
    userGrid       = s.userGrid;
    cages          = s.cages;
    cellToCage     = s.cellToCage;
    selectedCell   = s.selectedCell;
    violatingCells = new Set(s.violatingCells);
    isComplete     = s.isComplete;
    document.getElementById('message').classList.toggle('hidden', !isComplete);
    hideKeypad();
    buildKeypad();
    renderBoard();
  } else {
    newPuzzle();
  }
}

// ── Difficulty Picker ─────────────────────────────────────────────────────────
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const newSize = parseInt(btn.dataset.size, 10);
    if (newSize === SIZE) return;
    saveState();
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadState(newSize);
  });
});

function updateSubtitle() {
  document.getElementById('subtitle').textContent =
    `Fill in 1–${SIZE} once per row and column. Satisfy the cage hints.`;
}

// ── New Puzzle ────────────────────────────────────────────────────────────────
function newPuzzle() {
  solution   = generateLatinSquare();
  userGrid   = new Array(cellCount()).fill(0);
  cellToCage = new Array(cellCount()).fill(-1);
  selectedCell  = null;
  violatingCells = new Set();
  isComplete    = false;

  const rawCages = generateCages();
  cages = rawCages.map((rc, id) => {
    const cage = { id, cells: rc.cells, topLeftCell: findTopLeftCell(rc.cells) };
    for (const c of rc.cells) cellToCage[c] = id;
    assignOperation(cage);
    return cage;
  });

  assignColors(cages);
  document.getElementById('message').classList.add('hidden');
  hideKeypad();
  buildKeypad();
  renderBoard();
}

// ── Help Modal ────────────────────────────────────────────────────────────────
function openHelp() {
  document.getElementById('help-overlay').classList.add('open');
  document.getElementById('help-modal').classList.add('open');
}

function closeHelp() {
  document.getElementById('help-overlay').classList.remove('open');
  document.getElementById('help-modal').classList.remove('open');
}

document.getElementById('help-btn').addEventListener('click', openHelp);
document.getElementById('help-close').addEventListener('click', closeHelp);
document.getElementById('help-overlay').addEventListener('click', closeHelp);

// ── Init ──────────────────────────────────────────────────────────────────────
document.getElementById('new-puzzle').addEventListener('click', newPuzzle);

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    CELL_PX = computeCellPx();
    renderBoard();
  }, 100);
});

CELL_PX = computeCellPx();
updateSubtitle();
newPuzzle();
