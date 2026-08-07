/**
 * Every pricing decision lives here.
 *
 * Both tiers are recurring subscriptions with a monthly and an annual option.
 * The monthly plans carry a free first month; annual is already discounted so
 * it charges immediately.
 */

export type TierId = "free" | "classic" | "premium";
export type Period = "monthly" | "annual";

export const TRIAL_DAYS = 30;

export interface Tier {
  id: TierId;
  name: string;
  monthly: string;
  annual: string;
  annualNote: string;
  pitch: string;
  reviewsPerWeek: number;
  chatQuestionsPerWeek: number;
  features: string[];
  locked: string[];
  highlight?: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "classic",
    name: "Classic",
    monthly: "$2.50",
    annual: "$12.50",
    annualNote: "Just over five months' worth",
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
  },
  {
    id: "premium",
    name: "Premier",
    monthly: "$6",
    annual: "$35",
    annualNote: "Just under six months' worth",
    pitch: "The full thing. For the manager who actually wants to win it.",
    reviewsPerWeek: 3,
    chatQuestionsPerWeek: 20,
    features: [
      "Everything in Classic",
      "Chat with your squad, fixtures and league already loaded",
      "Four gameweek roadmap: planned moves, targets and risks",
      "Double and blank gameweek planning when they land",
      "Live injury news and press conference watch before every review",
      "20 questions a week",
    ],
    locked: [],
    highlight: true,
  },
];

export const byId = (id: TierId): Tier => TIERS.find((t) => t.id === id) ?? TIERS[0];
