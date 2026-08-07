/**
 * Every pricing decision lives here. Change a price, a limit or a feature in
 * this file and the landing page, the paywall and the API limits all follow.
 */

export type TierId = "free" | "classic" | "premium";

/** How long the Classic trial runs before the card on file is charged. */
export const TRIAL_DAYS = 30;

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
  trialDays?: number;
}

export const TIERS: Tier[] = [
  {
    id: "classic",
    name: "Classic",
    price: "$10",
    cadence: "for the season",
    pitch: "For the manager who plans once and gets on with their week.",
    reviewsPerWeek: 3,
    chatQuestionsPerWeek: 0,
    features: [
      "Three full squad reviews a week",
      "Transfer recommendations with the reasoning behind them",
      "Captain, vice captain and starting XI",
      "Mini-league rival analysis: who to cover, who to attack",
      "Chip strategy with timing",
      "Works from a team ID or a screenshot",
    ],
    locked: [
      "Chat with the assistant",
      "Four gameweek roadmap",
      "Double and blank gameweek planning",
      "Live injury and press conference watch",
    ],
    cta: "Start free month",
    trialDays: 30,
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
