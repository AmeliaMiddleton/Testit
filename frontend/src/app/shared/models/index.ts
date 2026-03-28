export interface Tile {
  q: number;
  r: number;
  color: TileColor;
  dir: HexDir;
  isBlocker: boolean;
}

export type TileColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan' | 'dark';
export type HexDir = 'N' | 'S' | 'NE' | 'SE' | 'SW' | 'NW';

export interface LevelData {
  id: number;
  name: string;
  difficulty: number;
  maxMoves: number;
  boardCells: [number, number][];
  tiles: Tile[];
}

export interface LevelSummary {
  id: number;
  name: string;
  difficulty: number;
  maxMoves: number;
}

export interface LevelProgress {
  id: number;
  userId: string;
  levelId: number;
  completed: boolean;
  stars: number;
  bestMoves: number | null;
  attempts: number;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  username: string;
  coins: number;
  bombs: number;
  hammers: number;
}

export interface LeaderboardEntry {
  id: number;
  userId: string;
  username: string;
  avatar: string;
  weeklyScore: number;
  totalScore: number;
  league: string;
  rank: number;
}

export interface GameState {
  levelId: number;
  tiles: Map<string, Tile>;
  boardCells: Set<string>;
  movesLeft: number;
  totalMoves: number;
  bombs: number;
  hammers: number;
  activePowerup: 'bomb' | 'hammer' | null;
  animating: boolean;
}

export const HEX_DIRS: Record<HexDir, { dq: number; dr: number; angle: number }> = {
  N:  { dq:  0, dr: -1, angle: 270 },
  S:  { dq:  0, dr:  1, angle:  90 },
  NE: { dq: +1, dr: -1, angle: 330 },
  SE: { dq: +1, dr:  0, angle:  30 },
  SW: { dq: -1, dr: +1, angle: 150 },
  NW: { dq: -1, dr:  0, angle: 210 }
};

export const TILE_COLORS: Record<TileColor, string> = {
  red:    '#e84040',
  orange: '#f07830',
  yellow: '#f0c830',
  green:  '#40b840',
  blue:   '#4080e8',
  purple: '#a040e8',
  cyan:   '#40c8e8',
  dark:   '#404040'
};

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function hexToPixel(q: number, r: number, size: number, offsetX: number, offsetY: number): { x: number; y: number } {
  return {
    x: size * (3 / 2 * q) + offsetX,
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) + offsetY
  };
}

export function pixelToHex(px: number, py: number, size: number, offsetX: number, offsetY: number): { q: number; r: number } {
  const x = (px - offsetX) / size;
  const y = (py - offsetY) / size;
  const q = (2 / 3) * x;
  const r = (-1 / 3) * x + (Math.sqrt(3) / 3) * y;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}
