import type {
  FplBootstrap,
  FplFixture,
  FplEntry,
  FplPicksResponse,
  FplLeagueStandings,
} from "./types";

const BASE = "https://fantasy.premierleague.com/api";

// The FPL API rejects requests without a browser-like User-Agent.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

export class FplError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

async function get<T>(path: string, revalidateSeconds: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: HEADERS,
      next: { revalidate: revalidateSeconds },
    });
  } catch {
    throw new FplError(
      "Could not reach the Fantasy Premier League servers. They are often down for maintenance around gameweek deadlines. Try again in a few minutes.",
      503
    );
  }

  if (res.status === 404) {
    throw new FplError("Not found", 404);
  }
  if (res.status === 429) {
    throw new FplError(
      "The FPL API is rate limiting us right now. Please try again in a minute.",
      429
    );
  }
  if (!res.ok) {
    throw new FplError(`FPL API returned ${res.status}`, 502);
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // FPL serves an HTML maintenance page instead of JSON when they are updating.
    throw new FplError(
      "The FPL API is currently in maintenance mode (it does this while scores are being finalised). Try again shortly.",
      503
    );
  }
}

// Big payload (~1MB) but only changes on price changes and team news. Cache 30 min.
export const getBootstrap = () => get<FplBootstrap>("/bootstrap-static/", 1800);

// Full season fixture list. Changes rarely. Cache 1 hour.
export const getFixtures = () => get<FplFixture[]>("/fixtures/", 3600);

export async function getEntry(teamId: number): Promise<FplEntry> {
  try {
    return await get<FplEntry>(`/entry/${teamId}/`, 300);
  } catch (e) {
    if (e instanceof FplError && e.status === 404) {
      throw new FplError(
        `No FPL team found with ID ${teamId}. Check the number in your team's URL: fantasy.premierleague.com/entry/YOUR-ID/event/1`,
        404
      );
    }
    throw e;
  }
}

// Returns null rather than throwing: picks legitimately do not exist before a
// manager's first deadline, or pre-season.
export async function getPicks(
  teamId: number,
  gameweek: number
): Promise<FplPicksResponse | null> {
  try {
    return await get<FplPicksResponse>(`/entry/${teamId}/event/${gameweek}/picks/`, 300);
  } catch (e) {
    if (e instanceof FplError && e.status === 404) return null;
    throw e;
  }
}

export async function getLeagueStandings(
  leagueId: number
): Promise<FplLeagueStandings | null> {
  try {
    return await get<FplLeagueStandings>(
      `/leagues-classic/${leagueId}/standings/`,
      600
    );
  } catch {
    return null;
  }
}

/**
 * Picks the mini-league that actually matters to the manager.
 * Skips FPL's automatic global/regional leagues (league_type "s") and prefers
 * the smallest private league, since that is where rivalries are real.
 */
export function pickPrimaryLeague(entry: FplEntry): number | null {
  const priv = entry.leagues.classic.filter(
    (l) => l.league_type === "x" && (l.rank_count ?? 0) > 1
  );
  if (priv.length === 0) return null;
  priv.sort((a, b) => (a.rank_count ?? 0) - (b.rank_count ?? 0));
  return priv[0].id;
}

/** Current gameweek if one is live, otherwise the next upcoming one. */
export function resolveGameweek(bootstrap: FplBootstrap): {
  gameweek: number;
  label: string;
  deadline: string;
  isPreSeason: boolean;
  lastFinished: number | null;
} {
  const current = bootstrap.events.find((e) => e.is_current);
  const next = bootstrap.events.find((e) => e.is_next);
  const finished = bootstrap.events.filter((e) => e.finished);
  const lastFinished = finished.length ? finished[finished.length - 1].id : null;

  const target = next ?? current ?? bootstrap.events[0];
  return {
    gameweek: target.id,
    label: target.name,
    deadline: target.deadline_time,
    isPreSeason: lastFinished === null,
    lastFinished,
  };
}
