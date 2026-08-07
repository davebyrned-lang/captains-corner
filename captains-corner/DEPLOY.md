# Getting Assistant Manager live

Written for someone who does not write code. Follow it in order. Budget about
40 minutes for your first time.

Nothing here requires you to install anything on your computer.

---

## Step 1 — Get an Anthropic API key (5 minutes)

This is what powers the actual analysis. It is separate from a Claude
subscription; you pay per use.

1. Go to **console.anthropic.com** and sign up.
2. Add a payment method under **Billing**, and put $10 of credit on it to start.
3. Go to **API Keys**, click **Create Key**, name it `captains-corner`.
4. Copy the key. It starts with `sk-ant-`. **Copy it now** — you cannot view it
   again after closing the box.
5. Paste it somewhere safe temporarily, like a note on your phone.

> Treat this key like a bank card. Anyone who has it can spend your credit.
> Never put it in a screenshot, a public repo, or a message to someone.

---

## Step 2 — Put the code on GitHub (10 minutes)

GitHub is where the code lives. Vercel reads from it.

1. Go to **github.com** and sign up if you have not already.
2. Click the **+** in the top right, then **New repository**.
3. Name it `captains-corner`. Set it to **Private**. Click **Create repository**.
4. On the next screen, click **uploading an existing file**.
5. Unzip `captains-corner.zip` on your computer. Open the folder, select
   everything inside it, and drag it all into the browser window.
   - The zip contains only what you need. If you ever see folders called
     `node_modules` or `.next`, skip them: they are build leftovers, they are
     enormous, and Vercel rebuilds them for you.
6. Scroll down, click **Commit changes**.

---

## Step 3 — Deploy on Vercel (10 minutes)

Vercel is what actually runs the website.

1. Go to **vercel.com** and click **Sign up**, then **Continue with GitHub**.
2. On your dashboard, click **Add New** then **Project**.
3. Find `captains-corner` in the list and click **Import**.
4. Before clicking Deploy, expand **Environment Variables** and add this one:

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your `sk-ant-...` key from Step 1 |

5. Click **Deploy**. Wait two or three minutes.
6. You will get a URL like `captains-corner-xyz.vercel.app`. Open it.
7. Enter your own FPL team ID and check that a review comes back.

**If it fails**, go to your project on Vercel, click **Logs**, and read the most
recent error. The app is written to return plain-English errors rather than
technical ones, so the message will usually tell you what is wrong.

---

## Step 4 — Point your own domain at it (optional, 10 minutes)

1. Buy a domain anywhere you like. Namecheap and Cloudflare are both fine.
2. In Vercel: your project, then **Settings**, then **Domains**.
3. Type your domain, click **Add**, and follow the instructions it gives you.
   You will paste two records into your domain provider's DNS settings.
4. It can take up to an hour to start working. This is normal.

---

## What it costs to run

**Vercel:** free while you are testing. Important: Vercel's free Hobby plan does
not permit commercial use. The moment you charge anyone, you need the Pro plan
at roughly $20 a month. Check their current terms before you take payment.

**Anthropic:** you pay per review. Each review sends roughly 8,000 tokens in and
gets roughly 3,000 back.

At Sonnet 5's introductory pricing of $2 per million input tokens and $10 per
million output, that works out around **5 cents per review**. At the standard
pricing of $3 and $15 that becomes around **7 cents per review**. Introductory
pricing runs to 31 August 2026, so budget on the higher number.

Some scale to plan against:

| Users, 1 review a week | Reviews per month | Anthropic cost per month |
|---|---|---|
| 50 | 200 | about $14 |
| 250 | 1,000 | about $70 |
| 1,000 | 4,000 | about $280 |

That is the number that decides your pricing. If you charge £3 a month for four
reviews, your cost is roughly 28 cents against £3 of revenue. The margin is
comfortable; the risk is people hammering the re-run button, which is what the
rate limit exists to stop.

**Web search costs extra.** When the research fallback kicks in, searches are
billed at $10 per 1,000, on top of tokens. At the default cap of four searches
that is about 4 cents added to a review, so a pre-season review costs roughly 11
cents rather than 7. It only triggers when FPL data is thin, so this mostly
disappears once the season is underway. Screenshot reading also costs a little
more than a team ID, since the image itself uses tokens.

**Set a spend limit.** In the Anthropic console, under Billing, set a monthly
cap. Do this before you tell anyone the URL. It is the difference between a bad
day and a bad month.

---

## Settings you can change

All of these go in Vercel under **Settings** then **Environment Variables**.
After changing any of them, go to **Deployments** and click **Redeploy**.

| Setting | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. Your key from Step 1. |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Set to `claude-opus-5` for sharper analysis at roughly five times the cost. Worth testing on your own team before deciding. |
| `FREE_REVIEWS_PER_DAY` | `2` | Reviews per person per day before they are cut off. |
| `PAYWALL_ENABLED` | `false` | Leave off until phase 2. |
| `ENABLE_WEB_RESEARCH` | `true` | Searches public football sources when FPL data is thin. Set to `false` to switch it off entirely. |
| `RESEARCH_MAX_SEARCHES` | `4` | Hard cap on searches per review. Each one costs a penny. |
| `ANTHROPIC_RESEARCH_MODEL` | `claude-haiku-4-5-20251001` | Research runs on a fast model so the whole request still fits in 60 seconds. |

---

## Phase 2: charging for it

Deliberately not built yet, because the thing that decides whether this is a
business is whether people come back in week three. Launch free, watch that,
then charge. If you build billing first you will spend two weeks on Stripe and
learn nothing.

When you are ready, the whole paywall hangs off **one function**:
`isSubscriber()` in `lib/ratelimit.ts`. It currently always returns false. The
work is:

1. Add sign-in. **Clerk** is the least painful for a non-developer and has a
   free tier. This gives every user a stable ID.
2. Create a Stripe subscription product and a Checkout link.
3. Add a Stripe webhook that records who is subscribed.
4. Change `isSubscriber()` to look that up and return true for active
   subscribers.

Everything else already respects it. Subscribers skip the rate limit
automatically.

**On pricing:** your genuine differentiator is the mini-league angle. Fantasy
Football Hub and FPL Review both optimise for overall rank. Nobody seriously
does "here is how to beat the six specific people in your league". Lead with
that. It is also the feature that is hardest for a free tool to copy, because it
needs the manager's actual league data.

---

## Things worth knowing

**Pre-season is thin.** Until the season starts, every player's xG, xA, minutes
and form are reset to zero by FPL. The app detects this, tells the user, and
caps its confidence scores. Reviews get noticeably sharper from about gameweek
four, once real data has accumulated. Bear that in mind if you launch in August.

**Deadline day is the busy hour.** Everyone will use this between Friday evening
and Saturday morning. That is also when the FPL API is slowest and most likely
to be in maintenance mode. The app handles that with a clear message rather than
a crash, but expect complaints.

**Free transfers are a guess.** The FPL API does not expose how many free
transfers a manager has. The app estimates and openly tells the model to treat
it as an assumption. If you later add sign-in, ask the user directly — it is a
meaningful accuracy gain for one extra field.

**Requests take 30 to 60 seconds.** Vercel's Hobby plan cuts functions off at 60
seconds. If you see timeouts, either switch the model to Haiku, or move to the
Pro plan which allows longer.

**Do not use Premier League branding.** The API is public and using it is
common practice, but their trademarks are not yours. Keep your logo and name
your own.
