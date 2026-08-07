# Assistant Manager

*for Fantasy Premier League*

A web app that turns an FPL team ID into a full, evidence-based gameweek review
aimed at winning your mini-league rather than chasing overall rank.

**Start here: open `DEPLOY.md`.** It walks you through getting this live, step by
step, with no assumed technical knowledge.

## What it does

Someone gives us their squad, either by typing an FPL team ID or uploading a
screenshot of their team. The app then:

1. Pulls their real squad, prices, bank, chips and last-gameweek score from the
   official Fantasy Premier League API. If they uploaded a screenshot instead,
   the names are read from the image and matched back to real FPL players, so
   the analysis still runs on proper data.
2. Pulls their smallest private mini-league and where they sit in it.
3. Maps fixture difficulty for all 20 clubs over the next five gameweeks.
4. Screens the whole player pool down to a shortlist of realistic transfer
   targets, scored on expected goal involvement per 90, expected goals conceded
   per 90, minutes, form and fixtures.
5. If FPL has little to give (pre-season, or no squad published), searches
   public football sources first and folds that briefing in, with citations.
6. Sends all of that to Claude with the strategist brief.
7. Renders a structured review: executive summary, squad assessment, transfers
   with four-gameweek projections, starting XI, captaincy, chip strategy, a
   four-gameweek roadmap, mini-league strategy and named uncertainties.

## How the files fit together

    app/page.tsx              The page people see: team ID box and the results
    app/api/analyze/route.ts  The engine room: fetches data, calls Claude, returns the review
    lib/fpl.ts                Talks to the Fantasy Premier League API
    lib/context.ts            Compresses 700 players into something the model can reason over
    lib/prompt.ts             The strategist brief and the review structure
    lib/ratelimit.ts          Usage caps, plus the single hook where Stripe plugs in later
    lib/brand.ts              Every piece of naming and headline copy, in one file
    lib/match.ts              Matches names read off a screenshot to real FPL players
    lib/research.ts           The web search fallback when FPL data is thin
    lib/normalize.ts          Guarantees the review has a safe shape before rendering
    app/api/extract/route.ts  Reads a squad out of an uploaded screenshot
    components/               How the review is displayed on screen

## Not affiliated

This project uses the public, unauthenticated Fantasy Premier League API. It is
not affiliated with, endorsed by, or connected to the Premier League or Fantasy
Premier League.

"Premier League", "Fantasy Premier League" and "FPL" are their trademarks. The
brand name here is deliberately "Assistant Manager", with Fantasy Premier League
used only as a description of what the tool is for. That distinction matters
more once you start charging. Do not use their logos or brand assets.
