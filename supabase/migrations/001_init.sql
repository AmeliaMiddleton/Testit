-- =============================================================================
-- 001_init.sql
-- Hexa Away game clone – initial schema + seed data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  difficulty  INT NOT NULL DEFAULT 1,
  max_moves   INT NOT NULL,
  board_cells JSONB NOT NULL,
  tiles       JSONB NOT NULL
);

-- Player profiles
CREATE TABLE IF NOT EXISTS player_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL DEFAULT 'Player',
  coins      INT NOT NULL DEFAULT 0,
  bombs      INT NOT NULL DEFAULT 3,
  hammers    INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Level progress
CREATE TABLE IF NOT EXISTS level_progress (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id    INT NOT NULL REFERENCES levels(id),
  completed   BOOL NOT NULL DEFAULT false,
  stars       INT NOT NULL DEFAULT 0,
  best_moves  INT,
  attempts    INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, level_id)
);

-- Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
  id            SERIAL PRIMARY KEY,
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL,
  avatar        TEXT DEFAULT 'bear',
  weekly_score  INT NOT NULL DEFAULT 0,
  total_score   INT NOT NULL DEFAULT 0,
  league        TEXT NOT NULL DEFAULT 'bronze',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- LEVEL SEED DATA
-- ---------------------------------------------------------------------------
-- Coordinate system: flat-top hexagons, axial (q, r)
-- Directions (NE/SE/SW/NW/N/S):
--   N  = dq  0, dr -1   (↑)
--   S  = dq  0, dr +1   (↓)
--   NE = dq +1, dr -1   (↗)
--   SE = dq +1, dr  0   (↘)
--   SW = dq -1, dr +1   (↙)
--   NW = dq -1, dr  0   (↖)
--
-- A tile slides one step per move in its direction.  When it reaches a cell
-- that is NOT in board_cells it exits the board and is cleared.
--
-- All levels below are fully solvable (every non-blocker tile can be slid
-- off at least one board edge within max_moves).
-- ---------------------------------------------------------------------------

-- =========================================================================
-- LEVEL 1  –  Tutorial  (difficulty 1, max_moves 10)
-- Board: 19-cell radius-2 hex (flat-top axial)
-- 4 tiles, no blockers, each pointing straight toward the nearest edge.
--
-- Solution sketch (one valid sequence):
--   tap red   (0,-1) → off N edge  [1 move]
--   tap blue  (0, 1) → off S edge  [1 move]
--   tap green (1, 0) → off SE edge [1 move]
--   tap orange(-1,0) → off NW edge [1 move]   total: 4 moves
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Tutorial',
  1,
  10,
  '[[-2,0],[-2,1],[-2,2],[-1,-1],[-1,0],[-1,1],[-1,2],[0,-2],[0,-1],[0,0],[0,1],[0,2],[1,-2],[1,-1],[1,0],[1,1],[2,-2],[2,-1],[2,0]]',
  '[
    {"q":  0, "r": -1, "color": "red",    "dir": "N",  "isBlocker": false},
    {"q":  0, "r":  1, "color": "blue",   "dir": "S",  "isBlocker": false},
    {"q":  1, "r":  0, "color": "green",  "dir": "SE", "isBlocker": false},
    {"q": -1, "r":  0, "color": "orange", "dir": "NW", "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 2  –  First Steps  (difficulty 1, max_moves 12)
-- Board: same 19-cell radius-2 hex
-- 7 tiles, no blockers.
--
-- Tile layout (all non-center cells, each pointing toward closest edge):
--   (0,-2)  yellow  N   → exits N  (already on row r=-2, next step r=-3 = off)
--   (0, 2)  purple  S   → exits S
--   (2,-1)  green   NE  → exits NE
--   (2, 0)  green   SE  → exits SE
--   (-2, 1) orange  SW  → exits SW
--   (-2, 0) cyan    NW  → exits NW
--   (0, 0)  red     N   → slides to (0,-1) → (0,-2) → exits N  [3 moves]
--
-- All 7 tiles can be cleared well within 12 moves.
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'First Steps',
  1,
  12,
  '[[-2,0],[-2,1],[-2,2],[-1,-1],[-1,0],[-1,1],[-1,2],[0,-2],[0,-1],[0,0],[0,1],[0,2],[1,-2],[1,-1],[1,0],[1,1],[2,-2],[2,-1],[2,0]]',
  '[
    {"q":  0, "r": -2, "color": "yellow", "dir": "N",  "isBlocker": false},
    {"q":  0, "r":  2, "color": "purple", "dir": "S",  "isBlocker": false},
    {"q":  2, "r": -1, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  2, "r":  0, "color": "green",  "dir": "SE", "isBlocker": false},
    {"q": -2, "r":  1, "color": "orange", "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  0, "color": "cyan",   "dir": "NW", "isBlocker": false},
    {"q":  0, "r":  0, "color": "red",    "dir": "N",  "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 3  –  Getting Warmer  (difficulty 2, max_moves 15)
-- Board: 19-cell radius-2 hex
-- 10 tiles, no blockers.
-- Tiles sit at various positions and must be slid off in sequence.
--
-- Solution sketch (one valid sequence, ~13 moves):
--   (1,-2) red  NE → off  (1,-2) NE → (2,-3) off [1]
--   (0,-2) yellow N → off [1]
--   (-1,-1) cyan NW → (-2,-1) off [1]  (-2,-1 not in board → exits immediately)
--   (-2,1) orange SW → (-3,2) off [1]
--   (2,-1) green NE → off [1]
--   (0,2) purple S → off [1]
--   (1,1) blue SE → (2,1) off [1]
--   (-1,2) red SW → (-2,3) off [1]
--   (1,0) yellow SE → (2,0) → off [2]
--   (-1,1) orange SW → (-2,2) → off [2]   total ≈ 13 moves
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Getting Warmer',
  2,
  15,
  '[[-2,0],[-2,1],[-2,2],[-1,-1],[-1,0],[-1,1],[-1,2],[0,-2],[0,-1],[0,0],[0,1],[0,2],[1,-2],[1,-1],[1,0],[1,1],[2,-2],[2,-1],[2,0]]',
  '[
    {"q":  1, "r": -2, "color": "red",    "dir": "NE", "isBlocker": false},
    {"q":  0, "r": -2, "color": "yellow", "dir": "N",  "isBlocker": false},
    {"q": -1, "r": -1, "color": "cyan",   "dir": "NW", "isBlocker": false},
    {"q": -2, "r":  1, "color": "orange", "dir": "SW", "isBlocker": false},
    {"q":  2, "r": -1, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  0, "r":  2, "color": "purple", "dir": "S",  "isBlocker": false},
    {"q":  1, "r":  1, "color": "blue",   "dir": "SE", "isBlocker": false},
    {"q": -1, "r":  2, "color": "red",    "dir": "SW", "isBlocker": false},
    {"q":  1, "r":  0, "color": "yellow", "dir": "SE", "isBlocker": false},
    {"q": -1, "r":  1, "color": "orange", "dir": "SW", "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 4  –  Obstacle Course  (difficulty 2, max_moves 18)
-- Board: 19-cell radius-2 hex
-- 10 tiles including 2 dark blockers.
-- Blockers at (0,0) and (1,-1) are immovable – other tiles must route around.
--
-- Non-blocker tiles each have a clear path off the board that avoids
-- the blocker cells.
--
-- Solution sketch (~14 moves):
--   (0,-2) yellow N  → off [1]
--   (0,-1) red    N  → off [1]  (blocker at (0,0) irrelevant – tile goes N)
--   (2,-2) green  NE → off [1]
--   (2,-1) green  NE → (3,-2) off [1]
--   (2,0)  blue   SE → (3,0) off [1]
--   (-2,1) orange SW → off [1]
--   (-2,2) purple S  → (-2,3) off [1]
--   (0,2)  cyan   S  → off [1]
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Obstacle Course',
  2,
  18,
  '[[-2,0],[-2,1],[-2,2],[-1,-1],[-1,0],[-1,1],[-1,2],[0,-2],[0,-1],[0,0],[0,1],[0,2],[1,-2],[1,-1],[1,0],[1,1],[2,-2],[2,-1],[2,0]]',
  '[
    {"q":  0, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  1, "r": -1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -2, "color": "yellow", "dir": "N",  "isBlocker": false},
    {"q":  0, "r": -1, "color": "red",    "dir": "N",  "isBlocker": false},
    {"q":  2, "r": -2, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  2, "r": -1, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  2, "r":  0, "color": "blue",   "dir": "SE", "isBlocker": false},
    {"q": -2, "r":  1, "color": "orange", "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  2, "color": "purple", "dir": "S",  "isBlocker": false},
    {"q":  0, "r":  2, "color": "cyan",   "dir": "S",  "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 5  –  Crossroads  (difficulty 3, max_moves 20)
-- Board: 37-cell radius-3 hex
-- 14 tiles, 2 dark blockers.
--
-- Radius-3 board_cells (all (q,r) with max(|q|,|r|,|q+r|) <= 3):
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Crossroads',
  3,
  20,
  '[
    [-3,0],[-3,1],[-3,2],[-3,3],
    [-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],
    [-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,3],
    [0,-3],[0,-2],[0,-1],[0,0],[0,1],[0,2],[0,3],
    [1,-3],[1,-2],[1,-1],[1,0],[1,1],[1,2],
    [2,-3],[2,-2],[2,-1],[2,0],[2,1],
    [3,-3],[3,-2],[3,-1],[3,0]
  ]',
  '[
    {"q":  0, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  1, "r": -1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -3, "color": "yellow", "dir": "N",  "isBlocker": false},
    {"q":  1, "r": -3, "color": "red",    "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -3, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  3, "r":  0, "color": "blue",   "dir": "SE", "isBlocker": false},
    {"q":  2, "r":  1, "color": "cyan",   "dir": "SE", "isBlocker": false},
    {"q":  0, "r":  3, "color": "purple", "dir": "S",  "isBlocker": false},
    {"q": -1, "r":  3, "color": "orange", "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  3, "color": "red",    "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  0, "color": "yellow", "dir": "NW", "isBlocker": false},
    {"q": -2, "r": -1, "color": "green",  "dir": "NW", "isBlocker": false},
    {"q":  1, "r":  2, "color": "blue",   "dir": "S",  "isBlocker": false},
    {"q": -1, "r": -2, "color": "cyan",   "dir": "N",  "isBlocker": false},
    {"q":  2, "r": -2, "color": "purple", "dir": "NE", "isBlocker": false},
    {"q": -2, "r":  2, "color": "orange", "dir": "SW", "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 6  –  Pinwheel  (difficulty 3, max_moves 22)
-- Board: 37-cell radius-3 hex
-- 16 tiles, 2 dark blockers.
-- Tiles arranged in a pinwheel / rotational pattern.
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Pinwheel',
  3,
  22,
  '[
    [-3,0],[-3,1],[-3,2],[-3,3],
    [-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],
    [-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,3],
    [0,-3],[0,-2],[0,-1],[0,0],[0,1],[0,2],[0,3],
    [1,-3],[1,-2],[1,-1],[1,0],[1,1],[1,2],
    [2,-3],[2,-2],[2,-1],[2,0],[2,1],
    [3,-3],[3,-2],[3,-1],[3,0]
  ]',
  '[
    {"q":  0, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q": -1, "r":  1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -3, "color": "red",    "dir": "N",  "isBlocker": false},
    {"q":  1, "r": -3, "color": "orange", "dir": "NE", "isBlocker": false},
    {"q":  2, "r": -3, "color": "yellow", "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -2, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -1, "color": "blue",   "dir": "SE", "isBlocker": false},
    {"q":  3, "r":  0, "color": "cyan",   "dir": "SE", "isBlocker": false},
    {"q":  2, "r":  1, "color": "purple", "dir": "SE", "isBlocker": false},
    {"q":  1, "r":  2, "color": "red",    "dir": "S",  "isBlocker": false},
    {"q":  0, "r":  3, "color": "orange", "dir": "S",  "isBlocker": false},
    {"q": -1, "r":  3, "color": "yellow", "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  3, "color": "green",  "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  2, "color": "blue",   "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  1, "color": "cyan",   "dir": "NW", "isBlocker": false},
    {"q": -3, "r":  0, "color": "purple", "dir": "NW", "isBlocker": false},
    {"q": -2, "r": -1, "color": "red",    "dir": "NW", "isBlocker": false},
    {"q": -1, "r": -2, "color": "orange", "dir": "N",  "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 7  –  Bottleneck  (difficulty 4, max_moves 25)
-- Board: 37-cell radius-3 hex
-- 18 tiles, 3 dark blockers forming a central corridor.
-- Players must slide tiles through the gaps around blockers.
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Bottleneck',
  4,
  25,
  '[
    [-3,0],[-3,1],[-3,2],[-3,3],
    [-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],
    [-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,3],
    [0,-3],[0,-2],[0,-1],[0,0],[0,1],[0,2],[0,3],
    [1,-3],[1,-2],[1,-1],[1,0],[1,1],[1,2],
    [2,-3],[2,-2],[2,-1],[2,0],[2,1],
    [3,-3],[3,-2],[3,-1],[3,0]
  ]',
  '[
    {"q":  0, "r": -1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  1, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q": -1, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -3, "color": "yellow", "dir": "N",  "isBlocker": false},
    {"q": -1, "r": -2, "color": "red",    "dir": "N",  "isBlocker": false},
    {"q": -2, "r": -1, "color": "orange", "dir": "NW", "isBlocker": false},
    {"q": -3, "r":  0, "color": "cyan",   "dir": "NW", "isBlocker": false},
    {"q": -3, "r":  1, "color": "blue",   "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  2, "color": "purple", "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  3, "color": "green",  "dir": "SW", "isBlocker": false},
    {"q": -1, "r":  3, "color": "yellow", "dir": "S",  "isBlocker": false},
    {"q":  0, "r":  3, "color": "red",    "dir": "S",  "isBlocker": false},
    {"q":  1, "r":  2, "color": "orange", "dir": "S",  "isBlocker": false},
    {"q":  2, "r":  1, "color": "cyan",   "dir": "SE", "isBlocker": false},
    {"q":  3, "r":  0, "color": "blue",   "dir": "SE", "isBlocker": false},
    {"q":  3, "r": -1, "color": "purple", "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -2, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  2, "r": -3, "color": "yellow", "dir": "NE", "isBlocker": false},
    {"q":  1, "r": -3, "color": "red",    "dir": "NE", "isBlocker": false},
    {"q":  0, "r": -2, "color": "blue",   "dir": "N",  "isBlocker": false},
    {"q": -1, "r":  2, "color": "purple", "dir": "SW", "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 8  –  Vortex  (difficulty 4, max_moves 28)
-- Board: 37-cell radius-3 hex
-- 20 tiles, 3 dark blockers.
-- Tiles spiral inward; must be unwound in reverse spiral order.
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Vortex',
  4,
  28,
  '[
    [-3,0],[-3,1],[-3,2],[-3,3],
    [-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],
    [-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,3],
    [0,-3],[0,-2],[0,-1],[0,0],[0,1],[0,2],[0,3],
    [1,-3],[1,-2],[1,-1],[1,0],[1,1],[1,2],
    [2,-3],[2,-2],[2,-1],[2,0],[2,1],
    [3,-3],[3,-2],[3,-1],[3,0]
  ]',
  '[
    {"q":  0, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  1, "r": -1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q": -1, "r":  1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -1, "color": "red",    "dir": "N",  "isBlocker": false},
    {"q":  1, "r": -2, "color": "orange", "dir": "NE", "isBlocker": false},
    {"q":  2, "r": -2, "color": "yellow", "dir": "NE", "isBlocker": false},
    {"q":  2, "r": -1, "color": "green",  "dir": "SE", "isBlocker": false},
    {"q":  2, "r":  0, "color": "blue",   "dir": "SE", "isBlocker": false},
    {"q":  1, "r":  1, "color": "cyan",   "dir": "S",  "isBlocker": false},
    {"q":  0, "r":  2, "color": "purple", "dir": "S",  "isBlocker": false},
    {"q": -1, "r":  2, "color": "red",    "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  2, "color": "orange", "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  1, "color": "yellow", "dir": "NW", "isBlocker": false},
    {"q": -2, "r":  0, "color": "green",  "dir": "NW", "isBlocker": false},
    {"q": -1, "r": -1, "color": "blue",   "dir": "N",  "isBlocker": false},
    {"q":  0, "r": -3, "color": "cyan",   "dir": "N",  "isBlocker": false},
    {"q":  3, "r": -3, "color": "purple", "dir": "NE", "isBlocker": false},
    {"q":  3, "r":  0, "color": "red",    "dir": "SE", "isBlocker": false},
    {"q":  0, "r":  3, "color": "orange", "dir": "S",  "isBlocker": false},
    {"q": -3, "r":  3, "color": "yellow", "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  0, "color": "green",  "dir": "NW", "isBlocker": false},
    {"q":  2, "r": -3, "color": "blue",   "dir": "NE", "isBlocker": false},
    {"q": -2, "r":  3, "color": "cyan",   "dir": "SW", "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 9  –  Labyrinth  (difficulty 5, max_moves 32)
-- Board: 37-cell radius-3 hex
-- 24 tiles, 4 dark blockers.
-- Dense board requiring careful sequencing to avoid collisions.
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Labyrinth',
  5,
  32,
  '[
    [-3,0],[-3,1],[-3,2],[-3,3],
    [-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],
    [-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,3],
    [0,-3],[0,-2],[0,-1],[0,0],[0,1],[0,2],[0,3],
    [1,-3],[1,-2],[1,-1],[1,0],[1,1],[1,2],
    [2,-3],[2,-2],[2,-1],[2,0],[2,1],
    [3,-3],[3,-2],[3,-1],[3,0]
  ]',
  '[
    {"q":  0, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  2, "r": -2, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q": -2, "r":  2, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -2, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -3, "color": "red",    "dir": "N",  "isBlocker": false},
    {"q":  1, "r": -3, "color": "orange", "dir": "NE", "isBlocker": false},
    {"q":  2, "r": -3, "color": "yellow", "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -3, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -2, "color": "blue",   "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -1, "color": "cyan",   "dir": "SE", "isBlocker": false},
    {"q":  3, "r":  0, "color": "purple", "dir": "SE", "isBlocker": false},
    {"q":  2, "r":  1, "color": "red",    "dir": "SE", "isBlocker": false},
    {"q":  1, "r":  2, "color": "orange", "dir": "S",  "isBlocker": false},
    {"q":  0, "r":  3, "color": "yellow", "dir": "S",  "isBlocker": false},
    {"q": -1, "r":  3, "color": "green",  "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  3, "color": "blue",   "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  3, "color": "cyan",   "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  2, "color": "purple", "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  1, "color": "red",    "dir": "NW", "isBlocker": false},
    {"q": -3, "r":  0, "color": "orange", "dir": "NW", "isBlocker": false},
    {"q": -2, "r": -1, "color": "yellow", "dir": "NW", "isBlocker": false},
    {"q": -1, "r": -2, "color": "green",  "dir": "N",  "isBlocker": false},
    {"q":  1, "r": -2, "color": "blue",   "dir": "N",  "isBlocker": false},
    {"q":  1, "r":  1, "color": "cyan",   "dir": "S",  "isBlocker": false},
    {"q": -1, "r":  1, "color": "purple", "dir": "SW", "isBlocker": false},
    {"q":  1, "r": -1, "color": "red",    "dir": "NE", "isBlocker": false},
    {"q": -1, "r":  2, "color": "orange", "dir": "SW", "isBlocker": false},
    {"q":  2, "r":  0, "color": "yellow", "dir": "SE", "isBlocker": false}
  ]'
);

-- =========================================================================
-- LEVEL 10  –  Grandmaster  (difficulty 5, max_moves 40)
-- Board: 37-cell radius-3 hex
-- 30 tiles, 5 dark blockers.  Maximum density – the ultimate challenge.
-- Every non-blocker tile has an unobstructed exit path when cleared in
-- the correct order.
-- =========================================================================
INSERT INTO levels (name, difficulty, max_moves, board_cells, tiles)
VALUES (
  'Grandmaster',
  5,
  40,
  '[
    [-3,0],[-3,1],[-3,2],[-3,3],
    [-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],
    [-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,3],
    [0,-3],[0,-2],[0,-1],[0,0],[0,1],[0,2],[0,3],
    [1,-3],[1,-2],[1,-1],[1,0],[1,1],[1,2],
    [2,-3],[2,-2],[2,-1],[2,0],[2,1],
    [3,-3],[3,-2],[3,-1],[3,0]
  ]',
  '[
    {"q":  0, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  1, "r": -1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q": -1, "r":  0, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r":  1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q": -1, "r":  1, "color": "dark",   "dir": "N",  "isBlocker": true},
    {"q":  0, "r": -3, "color": "red",    "dir": "N",  "isBlocker": false},
    {"q": -1, "r": -2, "color": "orange", "dir": "N",  "isBlocker": false},
    {"q":  1, "r": -3, "color": "yellow", "dir": "NE", "isBlocker": false},
    {"q":  2, "r": -3, "color": "green",  "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -3, "color": "blue",   "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -2, "color": "cyan",   "dir": "NE", "isBlocker": false},
    {"q":  3, "r": -1, "color": "purple", "dir": "SE", "isBlocker": false},
    {"q":  3, "r":  0, "color": "red",    "dir": "SE", "isBlocker": false},
    {"q":  2, "r":  1, "color": "orange", "dir": "SE", "isBlocker": false},
    {"q":  1, "r":  2, "color": "yellow", "dir": "S",  "isBlocker": false},
    {"q":  0, "r":  3, "color": "green",  "dir": "S",  "isBlocker": false},
    {"q": -1, "r":  3, "color": "blue",   "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  3, "color": "cyan",   "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  3, "color": "purple", "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  2, "color": "red",    "dir": "SW", "isBlocker": false},
    {"q": -3, "r":  1, "color": "orange", "dir": "NW", "isBlocker": false},
    {"q": -3, "r":  0, "color": "yellow", "dir": "NW", "isBlocker": false},
    {"q": -2, "r": -1, "color": "green",  "dir": "NW", "isBlocker": false},
    {"q": -1, "r": -2, "color": "blue",   "dir": "NW", "isBlocker": false},
    {"q":  1, "r": -2, "color": "cyan",   "dir": "N",  "isBlocker": false},
    {"q":  2, "r": -2, "color": "purple", "dir": "NE", "isBlocker": false},
    {"q":  2, "r":  0, "color": "red",    "dir": "SE", "isBlocker": false},
    {"q":  1, "r":  1, "color": "orange", "dir": "S",  "isBlocker": false},
    {"q": -1, "r":  2, "color": "yellow", "dir": "SW", "isBlocker": false},
    {"q": -2, "r":  1, "color": "green",  "dir": "NW", "isBlocker": false},
    {"q": -2, "r":  0, "color": "blue",   "dir": "NW", "isBlocker": false},
    {"q":  0, "r": -2, "color": "cyan",   "dir": "N",  "isBlocker": false},
    {"q":  0, "r":  2, "color": "purple", "dir": "S",  "isBlocker": false},
    {"q": -2, "r":  2, "color": "red",    "dir": "SW", "isBlocker": false},
    {"q":  2, "r": -1, "color": "orange", "dir": "NE", "isBlocker": false}
  ]'
);

-- ---------------------------------------------------------------------------
-- LEADERBOARD SEED DATA  (30 mock entries)
-- We insert directly into leaderboard.  These rows reference fake auth.users
-- UUIDs that would exist in a real deployment; adjust if seeding auth too.
-- ---------------------------------------------------------------------------

-- NOTE: leaderboard.user_id references auth.users(id).  In a local dev /
-- CI environment seed auth users first, or temporarily drop/defer the FK.
-- The UUIDs below are static so they can be referenced consistently.

INSERT INTO leaderboard (user_id, username, avatar, weekly_score, total_score, league) VALUES
  ('00000001-0000-0000-0000-000000000001', 'GageRay',     'fox',      9800, 142500, 'gold'),
  ('00000001-0000-0000-0000-000000000002', 'AceRay',      'wolf',     9200, 138700, 'gold'),
  ('00000001-0000-0000-0000-000000000003', 'RuneVale',    'owl',      8750, 131200, 'gold'),
  ('00000001-0000-0000-0000-000000000004', 'NovaStar',    'bear',     8400, 125800, 'gold'),
  ('00000001-0000-0000-0000-000000000005', 'ZephyrX',     'tiger',    8100, 119600, 'gold'),
  ('00000001-0000-0000-0000-000000000006', 'LunaBlaze',   'fox',      7800, 114300, 'gold'),
  ('00000001-0000-0000-0000-000000000007', 'TorqStorm',   'dragon',   7500, 108900, 'gold'),
  ('00000001-0000-0000-0000-000000000008', 'IronMaze',    'bear',     7200, 102400, 'gold'),
  ('00000001-0000-0000-0000-000000000009', 'CrystalFox',  'fox',      6900,  97100, 'gold'),
  ('00000001-0000-0000-0000-000000000010', 'VexKnight',   'wolf',     6500,  91800, 'gold'),
  ('00000001-0000-0000-0000-000000000011', 'Player187',   'bear',     5900,  84200, 'silver'),
  ('00000001-0000-0000-0000-000000000012', 'StrikeOwl',   'owl',      5700,  79600, 'silver'),
  ('00000001-0000-0000-0000-000000000013', 'HexMaster',   'dragon',   5400,  75100, 'silver'),
  ('00000001-0000-0000-0000-000000000014', 'PrismWave',   'tiger',    5100,  70800, 'silver'),
  ('00000001-0000-0000-0000-000000000015', 'DuskRider',   'wolf',     4900,  66300, 'silver'),
  ('00000001-0000-0000-0000-000000000016', 'CometRush',   'fox',      4600,  62500, 'silver'),
  ('00000001-0000-0000-0000-000000000017', 'BlazeQuill',  'bear',     4300,  58900, 'silver'),
  ('00000001-0000-0000-0000-000000000018', 'GridBreaker', 'owl',      4100,  55200, 'silver'),
  ('00000001-0000-0000-0000-000000000019', 'SkyForge',    'dragon',   3800,  51400, 'silver'),
  ('00000001-0000-0000-0000-000000000020', 'TileKing',    'tiger',    3500,  47800, 'silver'),
  ('00000001-0000-0000-0000-000000000021', 'PixelDuke',   'bear',     2900,  39600, 'bronze'),
  ('00000001-0000-0000-0000-000000000022', 'RunnerUp99',  'wolf',     2700,  35100, 'bronze'),
  ('00000001-0000-0000-0000-000000000023', 'StarNovice',  'fox',      2500,  31800, 'bronze'),
  ('00000001-0000-0000-0000-000000000024', 'HexNinja',    'owl',      2300,  28400, 'bronze'),
  ('00000001-0000-0000-0000-000000000025', 'CubeTapper',  'bear',     2100,  25200, 'bronze'),
  ('00000001-0000-0000-0000-000000000026', 'TileSurfer',  'tiger',    1900,  22100, 'bronze'),
  ('00000001-0000-0000-0000-000000000027', 'GridWalker',  'wolf',     1600,  18700, 'bronze'),
  ('00000001-0000-0000-0000-000000000028', 'MazeRunner7', 'fox',      1400,  15400, 'bronze'),
  ('00000001-0000-0000-0000-000000000029', 'HexPupil',    'bear',     1100,  11900, 'bronze'),
  ('00000001-0000-0000-0000-000000000030', 'NewPlayer01', 'owl',       800,   8200, 'bronze');
