import type { FplBootstrap } from "./types";

/**
 * Screenshots give us names, not IDs. This matches what was read off the image
 * back to real FPL players so the analysis still runs on proper data (prices,
 * fixtures, xGI) rather than on the text in the picture.
 */

const normalise = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: Coufal, Munoz, Odegaard
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface MatchedPlayer {
  id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  readAs: string;
  confidence: "exact" | "likely" | "uncertain";
}

export interface MatchResult {
  matched: MatchedPlayer[];
  unmatched: string[];
}

const POS: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

export function matchSquad(names: string[], bootstrap: FplBootstrap): MatchResult {
  const teamNames = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));

  const index = bootstrap.elements.map((el) => ({
    el,
    web: normalise(el.web_name),
    second: normalise(el.second_name),
    full: normalise(`${el.first_name} ${el.second_name}`),
  }));

  const matched: MatchedPlayer[] = [];
  const unmatched: string[] = [];
  const used = new Set<number>();

  for (const raw of names) {
    const q = normalise(raw);
    if (!q) continue;

    let hit: (typeof index)[number] | undefined;
    let confidence: MatchedPlayer["confidence"] = "exact";

    // 1. Exact match on the name FPL displays.
    hit = index.find((c) => !used.has(c.el.id) && c.web === q);

    // 2. Exact on surname or full name.
    if (!hit) {
      hit = index.find((c) => !used.has(c.el.id) && (c.second === q || c.full === q));
    }

    // 3. Containment, which covers "M.Salah" read as "Salah" and truncated text.
    if (!hit) {
      const candidates = index.filter(
        (c) =>
          !used.has(c.el.id) &&
          (c.web.includes(q) || q.includes(c.web) || c.second.includes(q) || q.includes(c.second))
      );
      if (candidates.length === 1) {
        hit = candidates[0];
        confidence = "likely";
      } else if (candidates.length > 1) {
        // Ambiguous. Prefer the most owned player, but flag it for review.
        candidates.sort(
          (a, b) =>
            parseFloat(b.el.selected_by_percent || "0") - parseFloat(a.el.selected_by_percent || "0")
        );
        hit = candidates[0];
        confidence = "uncertain";
      }
    }

    if (hit) {
      used.add(hit.el.id);
      matched.push({
        id: hit.el.id,
        name: hit.el.web_name,
        team: teamNames.get(hit.el.team) ?? "???",
        position: POS[hit.el.element_type],
        price: hit.el.now_cost / 10,
        readAs: raw,
        confidence,
      });
    } else {
      unmatched.push(raw);
    }
  }

  return { matched, unmatched };
}
