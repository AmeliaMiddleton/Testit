import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  GameState,
  LevelData,
  Tile,
  HexDir,
  HEX_DIRS,
  hexKey,
  PlayerProfile
} from '../../shared/models';
import { ApiService } from './api.service';

/** Ordered cycle used by the hammer powerup. */
const DIR_CYCLE: HexDir[] = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

@Injectable({ providedIn: 'root' })
export class GameStateService {

  // ─── State subjects ───────────────────────────────────────────────────────

  private stateSubject = new BehaviorSubject<GameState | null>(null);
  readonly state$ = this.stateSubject.asObservable();

  private profileSubject = new BehaviorSubject<PlayerProfile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  // ─── Constructor ──────────────────────────────────────────────────────────

  constructor(private api: ApiService) {}

  // ─── Getters ──────────────────────────────────────────────────────────────

  get state(): GameState | null {
    return this.stateSubject.value;
  }

  get profile(): PlayerProfile | null {
    return this.profileSubject.value;
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  loadProfile(): void {
    this.api.get<PlayerProfile>('/api/player/profile').subscribe(p => {
      this.profileSubject.next(p);
    });
  }

  // ─── Level initialisation ─────────────────────────────────────────────────

  /**
   * Build a fresh GameState from the given LevelData and powerup counts.
   */
  initLevel(levelData: LevelData, bombs: number, hammers: number): void {
    // Build tile map keyed by "q,r"
    const tiles = new Map<string, Tile>();
    for (const tile of levelData.tiles) {
      tiles.set(hexKey(tile.q, tile.r), { ...tile });
    }

    // Build board cell set
    const boardCells = new Set<string>();
    for (const [q, r] of levelData.boardCells) {
      boardCells.add(hexKey(q, r));
    }

    const gs: GameState = {
      levelId:      levelData.id,
      tiles,
      boardCells,
      movesLeft:    levelData.maxMoves,
      totalMoves:   levelData.maxMoves,
      bombs,
      hammers,
      activePowerup: null,
      animating:    false
    };

    this.stateSubject.next(gs);
  }

  // ─── Movement ─────────────────────────────────────────────────────────────

  /**
   * Try to move the tile at (q, r) one step in its direction.
   *
   * Returns:
   *   'moved'   – tile slid to an adjacent empty board cell
   *   'exited'  – tile moved off the board (removed from play)
   *   'blocked' – the next cell is occupied by another tile
   *   'invalid' – no tile at (q,r), or tile is a blocker
   */
  moveTile(q: number, r: number): 'moved' | 'exited' | 'blocked' | 'invalid' {
    const gs = this.state;
    if (!gs) return 'invalid';

    const key  = hexKey(q, r);
    const tile = gs.tiles.get(key);

    // No tile or blocker tile — cannot be moved
    if (!tile || tile.isBlocker) return 'invalid';

    const { dq, dr } = HEX_DIRS[tile.dir];
    const nextQ = q + dq;
    const nextR = r + dr;
    const nextKey = hexKey(nextQ, nextR);

    if (!gs.boardCells.has(nextKey)) {
      // Tile slides off the board → remove it
      const newTiles = new Map(gs.tiles);
      newTiles.delete(key);

      this.stateSubject.next({
        ...gs,
        tiles:     newTiles,
        movesLeft: gs.movesLeft - 1
      });
      return 'exited';
    }

    if (gs.tiles.has(nextKey)) {
      // Adjacent cell is occupied
      return 'blocked';
    }

    // Move tile to the adjacent empty board cell
    const newTiles = new Map(gs.tiles);
    newTiles.delete(key);
    const movedTile: Tile = { ...tile, q: nextQ, r: nextR };
    newTiles.set(nextKey, movedTile);

    this.stateSubject.next({
      ...gs,
      tiles:     newTiles,
      movesLeft: gs.movesLeft - 1
    });
    return 'moved';
  }

  // ─── Powerups ─────────────────────────────────────────────────────────────

  /**
   * Remove the tile at (q, r) using a bomb.
   * Does not decrement movesLeft.
   * Returns true if successful.
   */
  useBomb(q: number, r: number): boolean {
    const gs = this.state;
    if (!gs || gs.bombs <= 0) return false;

    const key  = hexKey(q, r);
    const tile = gs.tiles.get(key);
    if (!tile) return false;

    const newTiles = new Map(gs.tiles);
    newTiles.delete(key);

    this.stateSubject.next({
      ...gs,
      tiles: newTiles,
      bombs: gs.bombs - 1,
      activePowerup: null
    });
    return true;
  }

  /**
   * Rotate the direction of the tile at (q, r) to the next step in the
   * cycle [N → NE → SE → S → SW → NW → N].
   * Does not decrement movesLeft.
   * Returns true if successful.
   */
  useHammer(q: number, r: number): boolean {
    const gs = this.state;
    if (!gs || gs.hammers <= 0) return false;

    const key  = hexKey(q, r);
    const tile = gs.tiles.get(key);
    if (!tile || tile.isBlocker) return false;

    const currentIndex = DIR_CYCLE.indexOf(tile.dir);
    const nextDir      = DIR_CYCLE[(currentIndex + 1) % DIR_CYCLE.length];

    const newTiles = new Map(gs.tiles);
    newTiles.set(key, { ...tile, dir: nextDir });

    this.stateSubject.next({
      ...gs,
      tiles:    newTiles,
      hammers:  gs.hammers - 1,
      activePowerup: null
    });
    return true;
  }

  // ─── Powerup mode toggle ──────────────────────────────────────────────────

  /**
   * Activate or deactivate a powerup mode.
   * Selecting the already-active powerup deactivates it.
   */
  setActivePowerup(powerup: 'bomb' | 'hammer' | null): void {
    const gs = this.state;
    if (!gs) return;
    const next = gs.activePowerup === powerup ? null : powerup;
    this.stateSubject.next({ ...gs, activePowerup: next });
  }

  // ─── Win / loss conditions ────────────────────────────────────────────────

  /**
   * Returns true when all non-blocker tiles have been removed from the board.
   */
  isWon(): boolean {
    const gs = this.state;
    if (!gs) return false;
    for (const tile of gs.tiles.values()) {
      if (!tile.isBlocker) return false;
    }
    return true;
  }

  /**
   * Returns true when there are no moves left and the level is not yet won.
   */
  isLost(): boolean {
    const gs = this.state;
    if (!gs) return false;
    return gs.movesLeft === 0 && !this.isWon();
  }

  // ─── Star rating ──────────────────────────────────────────────────────────

  /**
   * Compute a 1-3 star rating based on remaining moves.
   *   3 stars: > 66 % of moves remaining
   *   2 stars: > 33 % of moves remaining
   *   1 star:  completed (any moves used)
   */
  calcStars(): number {
    const gs = this.state;
    if (!gs) return 0;
    const ratio = gs.movesLeft / gs.totalMoves;
    if (ratio > 0.66) return 3;
    if (ratio > 0.33) return 2;
    return 1;
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  /**
   * Persist level progress to the backend.
   */
  saveProgress(
    levelId:   number,
    completed: boolean,
    stars:     number,
    movesUsed: number
  ): void {
    this.api
      .post('/api/progress', { levelId, completed, stars, movesUsed })
      .subscribe();
  }
}
