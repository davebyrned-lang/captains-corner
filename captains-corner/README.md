# Captain's Corner

A web app that turns an FPL team ID into a full, evidence-based gameweek review
aimed at winning your mini-league rather than chasing overall rank.

**Start here: open `DEPLOY.md`.** It walks you through getting this live, step by
step, with no assumed technical knowledge.

## What it does

Someone types in their FPL team ID. The app then:

1. Pulls their real squad, prices, bank, chips and last-gameweek score from the
   official Fantasy Premier League API.
2. Pulls their smallest private mini-league and where they sit in it.
3. Maps fixture difficulty for all 20 clubs over the next five gameweeks.
4. Screens the whole player pool down to a shortlist of realistic transfer
   targets, scored on expected goal involvement per 90, expected goals conceded
   per 90, minutes, form and fixtures.
5. Sends all of that to Claude with the Captain's Corner strategist brief.
6. Renders a structured review: executive summary, squad assessment, transfers
   with four-gameweek projections, starting XI, captaincy, chip strategy, a
   four-gameweek roadmap, mini-league strategy and named uncertainties.

## How the files fit together

    app/page.tsx              The page people see: team ID box and the results
    app/api/analyze/route.ts  The engine room: fetches data, calls Claude, returns the review
    lib/fpl.ts                Talks to the Fantasy Premier League API
    lib/context.ts            Compresses 700 players into something the model can reason over
    lib/prompt.ts             The strategist brief and the review structure
    lib/ratelimit.ts          Usage caps, plus the single hook where Stripe plugs in later
    components/               How the review is displayed on screen

## Not affiliated

This project uses the public, unauthenticated Fantasy Premier League API. It is
not affiliated with, endorsed by, or connected to the Premier League or Fantasy
Premier League. Do not use their logos or brand assets in your marketing.
