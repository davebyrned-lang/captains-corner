import type {
  FplBootstrap,
  FplFixture,
  FplEntry,
  FplPicksResponse,
  FplLeagueStandings,
  FplElement,
  SquadPlayer,
  AnalysisContext,
} from "./types";

const POS: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
const FIXTURE_HORIZON = 5;

/** Human-readable next fixtures for a team, e.g. "BOU(H,2) ars(A,4) EVE(H,2)". */
function fixtureString(
  teamId: number,
  fixtures: FplFixture[],
  teamNames: Map<number, string>,
  fromGw: number,
  horizon = FIXTURE_HORIZON
): { text: string; difficultySum: number } {
  const upcoming = fixtures
    .filter(
      (f) =>
        !f.finished &&
        f.event !== null &&
        f.event >= fromGw &&
        f.event < fromGw + horizon &&
        (f.team_h === teamId || f.team_a === teamId)
    )
    .sort((a, b) => (a.event ?? 0) - (b.event ?? 0));

  if (upcoming.length === 0) {
    return { text: "no fixtures scheduled (possible blank)", difficultySum: 0 };
  }

  let sum = 0;
  const parts = upcoming.map((f) => {
    const home = f.team_h === teamId;
    const opp = teamNames.get(home ? f.team_a : f.team_h) ?? "???";
    const diff = home ? f.team_h_difficulty : f.team_a_difficulty;
    sum += diff;
    return `${home ? opp.toUpperCase() : opp.toLowerCase()}(${home ? "H" : "A"},${diff})`;
  });

  return { text: parts.join(" "), difficultySum: sum };
}

function toSquadPlayer(
  el: FplElement,
  teamNames: Map<number, string>,
  fixtures: FplFixture[],
  gw: number,
  opts: { isCaptain?: boolean; isVice?: boolean; onBench?: boolean } = {}
): SquadPlayer {
  return {
    name: el.web_name,
    team: teamNames.get(el.team) ?? "???",
    position: POS[el.element_type],
    price: el.now_cost / 10,
    isCaptain: opts.isCaptain ?? false,
    isVice: opts.isVice ?? false,
    onBench: opts.onBench ?? false,
    form: el.form,
    totalPoints: el.total_points,
    ppg: el.points_per_game,
    minutes: el.minutes,
    starts: el.starts,
    xGI: el.expected_goal_involvements,
    xGIper90: el.expected_goal_involvements_per_90,
    xGCper90: el.expected_goals_conceded_per_90,
    ownership: el.selected_by_percent,
    status: el.status,
    news: el.news,
    chanceOfPlaying: el.chance_of_playing_next_round,
    nextFixtures: fixtureString(el.team, fixtures, teamNames, gw).text,
  };
}

/**
 * We cannot send 700 players to the model. This picks a shortlist of realistic
 * transfer targets per position, scored on underlying data and fixtures rather
 * than raw points, so the model sees value before the market does.
 */
function buildCandidates(
  bootstrap: FplBootstrap,
  fixtures: FplFixture[],
  teamNames: Map<number, string>,
  gw: number,
  ownedIds: Set<number>,
  isPreSeason: boolean
): Record<string, SquadPlayer[]> {
  const perPosition = { 1: 6, 2: 14, 3: 18, 4: 12 } as Record<number, number>;
  const out: Record<string, SquadPlayer[]> = { GKP: [], DEF: [], MID: [], FWD: [] };

  const fixtureScore = new Map<number, number>();
  for (const t of bootstrap.teams) {
    const { difficultySum } = fixtureString(t.id, fixtures, teamNames, gw);
    // Lower difficulty is better. Normalise to roughly 0-1.
    fixtureScore.set(t.id, (FIXTURE_HORIZON * 5 - difficultySum) / (FIXTURE_HORIZON * 4));
  }

  for (const typeId of [1, 2, 3, 4]) {
    const pool = bootstrap.elements
      .filter((el) => el.element_type === typeId)
      .filter((el) => !ownedIds.has(el.id))
      .filter((el) => el.status === "a" || el.status === "d")
      // Ignore fringe players who will never start. Skipped pre-season when
      // everyone has zero minutes.
      .filter((el) => isPreSeason || el.minutes >= 180);

    const scored = pool.map((el) => {
      const fix = fixtureScore.get(el.team) ?? 0.5;
      const form = parseFloat(el.form) || 0;
      const xgi90 = el.expected_goal_involvements_per_90 || 0;
      const ppg = parseFloat(el.points_per_game) || 0;
      const price = el.now_cost / 10;

      // Pre-season has no current-season data at all, so fall back to price and
      // ownership as a crude proxy for quality, weighted by fixtures.
      const score = isPreSeason
        ? price * 0.5 + (parseFloat(el.selected_by_percent) || 0) * 0.1 + fix * 4
        : ppg * 1.2 + form * 0.8 + xgi90 * 6 + fix * 3 + (typeId <= 2 ? (1 - (el.expected_goals_conceded_per_90 || 1.5) / 3) * 2 : 0);

      return { el, score };
    });

    scored.sort((a, b) => b.score - a.score);
    out[POS[typeId]] = scored
      .slice(0, perPosition[typeId])
      .map(({ el }) => toSquadPlayer(el, teamNames, fixtures, gw));
  }

  return out;
}

export function buildContext(params: {
  bootstrap: FplBootstrap;
  fixtures: FplFixture[];
  entry: FplEntry;
  picks: FplPicksResponse | null;
  league: FplLeagueStandings | null;
  gameweek: number;
  gameweekLabel: string;
  deadline: string;
  isPreSeason: boolean;
  teamId: number;
}): AnalysisContext {
  const {
    bootstrap,
    fixtures,
    entry,
    picks,
    league,
    gameweek,
    gameweekLabel,
    deadline,
    isPreSeason,
    teamId,
  } = params;

  const teamNames = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));
  const elementsById = new Map(bootstrap.elements.map((e) => [e.id, e]));
  const dataWarnings: string[] = [];

  // ---- Squad ----
  const squad: SquadPlayer[] = [];
  if (picks) {
    for (const p of picks.picks) {
      const el = elementsById.get(p.element);
      if (!el) continue;
      squad.push(
        toSquadPlayer(el, teamNames, fixtures, gameweek, {
          isCaptain: p.is_captain,
          isVice: p.is_vice_captain,
          onBench: p.position > 11,
        })
      );
    }
  } else {
    dataWarnings.push(
      "No squad could be loaded. FPL only exposes a manager's picks after their first deadline has passed, so this is normal pre-season or for a brand new team. Analysis below is general rather than squad-specific."
    );
  }

  if (isPreSeason) {
    dataWarnings.push(
      "The season has not started, so every player's xG, xA, form and minutes are reset to zero. Recommendations lean on fixtures, price and squad structure rather than current-season underlying data. Confidence scores are capped accordingly."
    );
  }

  const ownedIds = new Set(picks ? picks.picks.map((p) => p.element) : []);

  // ---- Candidates ----
  const candidates = buildCandidates(
    bootstrap,
    fixtures,
    teamNames,
    gameweek,
    ownedIds,
    isPreSeason
  );

  // ---- Fixture outlook, best runs first ----
  const fixtureOutlook = bootstrap.teams
    .map((t) => {
      const { text, difficultySum } = fixtureString(t.id, fixtures, teamNames, gameweek);
      return { team: t.short_name, next: text, difficultySum };
    })
    .sort((a, b) => a.difficultySum - b.difficultySum);

  // ---- Mini-league ----
  let miniLeague: AnalysisContext["miniLeague"] = null;
  if (league) {
    const rows = league.standings.results.slice(0, 12);
    const userRow = league.standings.results.find((r) => r.entry === teamId);
    const leader = league.standings.results[0];
    miniLeague = {
      name: league.league.name,
      userRank: userRow?.rank ?? null,
      size: league.standings.results.length,
      gapToLeader: userRow && leader ? leader.total - userRow.total : null,
      standings: rows.map((r) => ({
        rank: r.rank,
        manager: r.player_name,
        teamName: r.entry_name,
        total: r.total,
        isUser: r.entry === teamId,
      })),
    };
  } else {
    dataWarnings.push(
      "No private mini-league found on this team, so rival analysis is unavailable. Join a private league and it will appear here automatically."
    );
  }

  // Free transfers are not exposed by the API. Infer conservatively.
  const freeTransfers = picks
    ? Math.max(1, Math.min(5, 1 + (picks.entry_history.event_transfers === 0 ? 1 : 0)))
    : 1;

  return {
    managerName: `${entry.player_first_name} ${entry.player_last_name}`,
    teamName: entry.name,
    overallPoints: entry.summary_overall_points,
    overallRank: entry.summary_overall_rank,
    gameweek,
    gameweekLabel,
    deadline,
    isPreSeason,
    bank: picks ? picks.entry_history.bank / 10 : (entry.last_deadline_bank ?? 0) / 10,
    squadValue: picks
      ? picks.entry_history.value / 10
      : (entry.last_deadline_value ?? 1000) / 10,
    freeTransfers,
    activeChip: picks?.active_chip ?? null,
    lastGwPoints: picks?.entry_history.points ?? null,
    pointsOnBench: picks?.entry_history.points_on_bench ?? null,
    squad,
    candidates,
    fixtureOutlook,
    miniLeague,
    dataWarnings,
  };
}
