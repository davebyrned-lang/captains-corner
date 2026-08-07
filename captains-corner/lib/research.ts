import Anthropic from "@anthropic-ai/sdk";

export interface ResearchResult {
  briefing: string;
  sources: { title: string; url: string }[];
  searchesUsed: number;
}

/**
 * When the FPL API has little to give us (pre-season, or a squad we could not
 * load), fall back to the open web so the advice is still grounded in something
 * current rather than the model's training data.
 *
 * Deliberately run on a fast model with a hard search cap. Each search costs
 * money and seconds, and this runs before the main analysis inside a 60 second
 * budget.
 */
const DEFAULT_DOMAINS = [
  "premierleague.com",
  "fantasy.premierleague.com",
  "bbc.co.uk",
  "skysports.com",
  "theguardian.com",
  "fantasyfootballscout.co.uk",
  "physioroom.com",
];

export async function runResearch(params: {
  apiKey: string;
  gameweekLabel: string;
  isPreSeason: boolean;
  reason: string;
}): Promise<ResearchResult | null> {
  const { apiKey, gameweekLabel, isPreSeason, reason } = params;

  if (process.env.ENABLE_WEB_RESEARCH === "false") return null;

  const model = process.env.ANTHROPIC_RESEARCH_MODEL || "claude-haiku-4-5-20251001";
  const maxUses = Math.max(1, Math.min(6, parseInt(process.env.RESEARCH_MAX_SEARCHES ?? "4", 10) || 4));

  const domains = (process.env.RESEARCH_DOMAINS || DEFAULT_DOMAINS.join(","))
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const focus = isPreSeason
    ? `The 2026/27 season has not started. Find: confirmed and rumoured injuries going into ${gameweekLabel}; which players are expected to start; notable summer transfers that change a club's attacking or defensive outlook; and which fixtures in the opening gameweeks look favourable.`
    : `Find: the latest injury and suspension news going into ${gameweekLabel}; any manager press conference comments about rotation or fitness; and players whose role in the side has recently changed.`;

  const prompt = `You are gathering current Fantasy Premier League context for a squad analysis tool. ${reason}

${focus}

Write a factual briefing of at most 450 words, organised under short headings. Rules:
- Only state things you actually found in the search results. If you could not confirm something, leave it out.
- Name specific players and clubs. Vague generalities are useless here.
- Do not give betting or gambling advice.
- Do not speculate on scorelines.
- No preamble. Start with the first heading.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: maxUses,
          allowed_domains: domains,
        } as any,
      ],
    });

    const briefing = msg.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Citations must be shown to the reader, so collect them for the UI.
    const sources = new Map<string, string>();
    for (const block of msg.content) {
      if (block.type !== "text") continue;
      const cites = (block as any).citations as
        | { url?: string; title?: string }[]
        | undefined;
      for (const c of cites ?? []) {
        if (c.url) sources.set(c.url, c.title || c.url);
      }
    }

    const searchesUsed = (msg.usage as any)?.server_tool_use?.web_search_requests ?? 0;

    if (!briefing) return null;

    return {
      briefing,
      sources: [...sources.entries()].map(([url, title]) => ({ url, title })),
      searchesUsed,
    };
  } catch (e) {
    // Research is a bonus, never a blocker. A failure here must not lose the review.
    console.error("Research pass failed, continuing without it:", e instanceof Error ? e.message : e);
    return null;
  }
}
