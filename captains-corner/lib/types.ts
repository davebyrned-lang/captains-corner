// ---------- Raw FPL API shapes (only the fields we actually use) ----------

export interface FplElement {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number; // 1 GK, 2 DEF, 3 MID, 4 FWD
  now_cost: number; // tenths of a million
  total_points: number;
  form: string;
  points_per_game: string;
  selected_by_percent: string;
  minutes: number;
  starts: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  bps: number;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  expected_goal_involvements_per_90: number;
  expected_goals_conceded_per_90: number;
  starts_per_90: number;
  status: string; // a=available d=doubtful i=injured s=suspended u=unavailable n=not in squad
  news: string;
  chance_of_playing_next_round: number | null;
  cost_change_start: number;
  transfers_in_event: number;
  transfers_out_event: number;
}

export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  average_entry_score: number;
  most_captained: number | null;
  chip_plays: { chip_name: string; num_played: number }[];
}

export interface FplBootstrap {
  events: FplEvent[];
  teams: FplTeam[];
  elements: FplElement[];
  element_types: { id: number; singular_name_short: string }[];
}

export interface FplFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
  kickoff_time: string | null;
}

export interface FplEntry {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number;
  summary_overall_rank: number | null;
  summary_event_points: number;
  last_deadline_bank: number | null;
  last_deadline_value: number | null;
  leagues: {
    classic: {
      id: number;
      name: string;
      entry_rank: number | null;
      entry_last_rank: number | null;
      rank_count: number | null;
      league_type: string; // "s" = system/global, "x" = private
    }[];
  };
}

export interface FplPicksResponse {
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number | null;
    overall_rank: number | null;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: {
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }[];
}

export interface FplLeagueStandings {
  league: { id: number; name: string };
  standings: {
    results: {
      entry: number;
      entry_name: string;
      player_name: string;
      rank: number;
      last_rank: number;
      total: number;
      event_total: number;
    }[];
  };
}

// ---------- Our own shapes ----------

export interface SquadPlayer {
  name: string;
  team: string;
  position: string;
  price: number;
  isCaptain: boolean;
  isVice: boolean;
  onBench: boolean;
  form: string;
  totalPoints: number;
  ppg: string;
  minutes: number;
  starts: number;
  xGI: string;
  xGIper90: number;
  xGCper90: number;
  ownership: string;
  status: string;
  news: string;
  chanceOfPlaying: number | null;
  nextFixtures: string;
}

export interface AnalysisContext {
  managerName: string;
  teamName: string;
  overallPoints: number;
  overallRank: number | null;
  gameweek: number;
  gameweekLabel: string;
  deadline: string;
  isPreSeason: boolean;
  bank: number;
  squadValue: number;
  freeTransfers: number;
  activeChip: string | null;
  lastGwPoints: number | null;
  pointsOnBench: number | null;
  squad: SquadPlayer[];
  candidates: Record<string, SquadPlayer[]>;
  fixtureOutlook: { team: string; next: string; difficultySum: number }[];
  miniLeague: {
    name: string;
    userRank: number | null;
    size: number;
    gapToLeader: number | null;
    standings: { rank: number; manager: string; teamName: string; total: number; isUser: boolean }[];
  } | null;
  dataWarnings: string[];
}

// ---------- Structured review returned by Claude ----------

export interface Review {
  executive_summary: {
    squad_health: number;
    best_transfer: string;
    alternative_transfer: string;
    captain: string;
    vice_captain: string;
    chip_advice: string;
    hit_advice: string;
    confidence: number;
  };
  squad_assessment: {
    strengths: string[];
    weaknesses: string[];
    immediate_problems: string[];
    long_term_concerns: string[];
    behavioural_flags: string[];
  };
  transfers: {
    player_out: string;
    reason_out: string;
    player_in: string;
    reason_in: string;
    four_gw_projection: string;
    risks: string;
    confidence: number;
  }[];
  starting_xi: {
    formation: string;
    starters: string[];
    bench: string[];
    notes: string;
  };
  captaincy: {
    best: { player: string; reasoning: string };
    safe: { player: string; reasoning: string };
    differential: { player: string; reasoning: string };
  };
  chip_strategy: { chip: string; recommendation: string; reasoning: string }[];
  roadmap: { gameweek: string; planned_move: string; fixture_target: string; risk: string }[];
  league_strategy: string;
  uncertainties: string[];
}
