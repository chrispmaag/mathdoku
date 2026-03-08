# Mathdoku

A browser-based Mathdoku puzzle game (similar to KenKen) with three difficulty levels.

## How to Play

1. Select a difficulty level — Easy (3×3), Medium (4×4), or Hard (5×5)
2. Fill every cell with a number so that each number appears **exactly once** in every row and column
3. Each colored cage shows an arithmetic hint (e.g. `+6`, `×4`, `−2`). The numbers in the cage must satisfy that operation to equal the target
4. Red highlighting means a rule is currently violated
5. Fill the board correctly to win!

## Difficulty Levels

| Level  | Grid | Numbers |
|--------|------|---------|
| Easy   | 3×3  | 1–3     |
| Medium | 4×4  | 1–4     |
| Hard   | 5×5  | 1–5     |

## Controls

| Key | Action |
|-----|--------|
| `1`–`5` | Enter a number in the selected cell |
| `Backspace` / `Delete` | Clear the selected cell |
| Arrow keys | Move selection |
| Click | Select a cell |

## Cage Operations

| Symbol | Meaning |
|--------|---------|
| `=3` | Cell must equal 3 |
| `+6` | Cells must sum to 6 |
| `×4` | Cells must multiply to 4 |
| `−2` | Absolute difference must equal 2 |
| `÷2` | Larger divided by smaller must equal 2 |

## Running Locally

Just open `index.html` in any modern browser — no build step or server required.

## Live Demo

[Play on GitHub Pages](https://chrispmaag.github.io/mathdoku)
