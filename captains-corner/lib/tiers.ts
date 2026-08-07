/**
 * Every pricing decision lives here. Change a price, a limit or a feature in
 * this file and the landing page, the paywall and the API limits all follow.
 */

export type TierId = "free" | "classic" | "premium";

export interface Tier {
  id: TierId;
  name: string;
  price: string;
  cadence: string;
  pitch: string;
  reviewsPerWeek: number;
  chatQuestionsPerWeek: number;
  features: string[];
  locked: string[];
  cta: string;
  highlight?: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    cadence: "forever",
    pitch: "Enough to see whether the advice is any good.",
    reviewsPerWeek: 1,
    chatQuestionsPerWeek: 0,
    features: [
      "One full squad review a week",
      "Executive summary and squad health",
      "Transfer recommendations with reasoning",
      "Captain, vice captain and starting XI",
      "Works from a team ID or a screenshot",
    ],
    locked: [
      "Chat with the assistant",
      "Four gameweek roadmap",
      "Double and blank gameweek planning",
      "Live injury and press conference watch",
    ],
    cta: "Start free",
  },
  {
    id: "classic",
    name: "Classic",
    price: "$10",
    cadence: "for the season",
    pitch: "For the manager who plans once and gets on with their week.",
    reviewsPerWeek: 3,
    chatQuestionsPerWeek: 0,
    features: [
      "Three reviews a week, so you can re-run after team news",
      "Everything in Free",
      "Mini-league rival analysis: who to cover, who to attack",
      "Chip strategy with timing reasoning",
      "Season pass, no recurring charge",
    ],
    locked: [
      "Chat with the assistant",
      "Four gameweek roadmap",
      "Double and blank gameweek planning",
      "Live injury and press conference watch",
    ],
    cta: "Get Classic",
  },
  {
    id: "premium",
    name: "Premier",
    price: "$25",
    cadence: "for the season",
    pitch: "The full thing. For the manager who actually wants to win it.",
    reviewsPerWeek: 3,
    chatQuestionsPerWeek: 45,
    features: [
      "Everything in Classic",
      "Chat with your squad, fixtures and league already loaded",
      "Four gameweek roadmap: planned moves, targets and risks",
      "Double and blank gameweek planning when they land",
      "Live injury news and press conference watch before every review",
      "45 questions a week",
    ],
    locked: [],
    cta: "Go Premier",
    highlight: true,
  },
];

export const byId = (id: TierId): Tier =>
  TIERS.find((t) => t.id === id) ?? TIERS[0];

/** Premier-only sections of the review. Referenced by the UI and the API. */
export const PREMIER_SECTIONS = ["roadmap", "chat", "doubles", "newswatch"] as const;
