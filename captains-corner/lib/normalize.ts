import type { Review } from "./types";

/**
 * The model is told which fields are required, and usually obliges. But when
 * there is genuinely nothing to say (pre-season, no squad published yet) it can
 * legitimately return an empty or missing section. The UI must never crash
 * because of that, so every field gets a guaranteed shape here.
 */

const str = (v: unknown, fallback = "Not assessed"): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function normalizeReview(raw: unknown): Review {
  const r = obj(raw);
  const es = obj(r.executive_summary);
  const sa = obj(r.squad_assessment);
  const xi = obj(r.starting_xi);
  const cap = obj(r.captaincy);

  const pick = (v: unknown) => {
    const p = obj(v);
    return {
      player: str(p.player, "No recommendation"),
      reasoning: str(p.reasoning, "Not enough data to justify a pick."),
    };
  };

  return {
    executive_summary: {
      squad_health: num(es.squad_health),
      best_transfer: str(es.best_transfer, "No transfer recommended"),
      alternative_transfer: str(es.alternative_transfer, "None"),
      captain: str(es.captain, "Not assessed"),
      vice_captain: str(es.vice_captain, "Not assessed"),
      chip_advice: str(es.chip_advice, "Save all chips"),
      hit_advice: str(es.hit_advice, "No"),
      confidence: num(es.confidence),
    },
    squad_assessment: {
      strengths: strArray(sa.strengths),
      weaknesses: strArray(sa.weaknesses),
      immediate_problems: strArray(sa.immediate_problems),
      long_term_concerns: strArray(sa.long_term_concerns),
      behavioural_flags: strArray(sa.behavioural_flags),
    },
    transfers: arr(r.transfers).map((t) => {
      const x = obj(t);
      return {
        player_out: str(x.player_out, "—"),
        reason_out: str(x.reason_out, ""),
        player_in: str(x.player_in, "—"),
        reason_in: str(x.reason_in, ""),
        four_gw_projection: str(x.four_gw_projection, ""),
        risks: str(x.risks, ""),
        confidence: num(x.confidence),
      };
    }),
    starting_xi: {
      formation: str(xi.formation, "Not set"),
      starters: strArray(xi.starters),
      bench: strArray(xi.bench),
      notes: str(xi.notes, ""),
    },
    captaincy: {
      best: pick(cap.best),
      safe: pick(cap.safe),
      differential: pick(cap.differential),
    },
    chip_strategy: arr(r.chip_strategy).map((c) => {
      const x = obj(c);
      return {
        chip: str(x.chip, "—"),
        recommendation: str(x.recommendation, "—"),
        reasoning: str(x.reasoning, ""),
      };
    }),
    roadmap: arr(r.roadmap).map((g) => {
      const x = obj(g);
      return {
        gameweek: str(x.gameweek, "—"),
        planned_move: str(x.planned_move, ""),
        fixture_target: str(x.fixture_target, ""),
        risk: str(x.risk, ""),
      };
    }),
    league_strategy: str(r.league_strategy, "No mini-league data was available for this team."),
    uncertainties: strArray(r.uncertainties),
  };
}
