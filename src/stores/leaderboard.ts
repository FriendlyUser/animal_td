import type { DifficultyId } from '../game/data/difficulty'

export interface ScoreEntry {
  name: string
  score: number
  wave: number
  won: boolean
  lives: number
  date: string
  mapId: string
  difficultyId: DifficultyId
}

const KEY = 'wildguard.leaderboard.v1'
const NAME_KEY = 'wildguard.playerName'
const MAX = 10

function load(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(all: ScoreEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getScores(mapId?: string, difficultyId?: DifficultyId): ScoreEntry[] {
  return load()
    .filter((e) => (!mapId || e.mapId === mapId) && (!difficultyId || e.difficultyId === difficultyId))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX)
}

/** Adds a score and returns its 1-based rank on that board, or 0 if it didn't place. */
export function addScore(entry: ScoreEntry): number {
  const all = load()
  all.push(entry)
  // keep only top MAX per board
  const boards = new Map<string, ScoreEntry[]>()
  for (const e of all) {
    const k = `${e.mapId}:${e.difficultyId}`
    if (!boards.has(k)) boards.set(k, [])
    boards.get(k)!.push(e)
  }
  const kept: ScoreEntry[] = []
  for (const list of boards.values()) {
    list.sort((a, b) => b.score - a.score)
    kept.push(...list.slice(0, MAX))
  }
  save(kept)
  const board = getScores(entry.mapId, entry.difficultyId)
  const idx = board.indexOf(board.find((e) => e.date === entry.date && e.name === entry.name && e.score === entry.score)!)
  return idx + 1
}

export function wouldPlace(score: number, mapId: string, difficultyId: DifficultyId): boolean {
  const board = getScores(mapId, difficultyId)
  return board.length < MAX || score > board[board.length - 1].score
}

export function clearScores() {
  localStorage.removeItem(KEY)
}

export function getPlayerName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function setPlayerName(name: string) {
  localStorage.setItem(NAME_KEY, name)
}
