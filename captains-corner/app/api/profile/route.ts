import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveTeamId, saveSquad } from "@/lib/user";
import { getBootstrap } from "@/lib/fpl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POS: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

/**
 * What the browser needs to know about the current visitor.
 *
 * If they have a remembered squad we hydrate it from live FPL data rather than
 * storing names and prices, so a player who has since been injured or changed
 * price shows up correctly.
 */
export async function GET() {
  const p = await getProfile();

  let squadPlayers: unknown[] = [];
  if (p.squad.length) {
    try {
      const bootstrap = await getBootstrap();
      const teams = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));
      const byId = new Map(bootstrap.elements.map((e) => [e.id, e]));

      squadPlayers = p.squad
        .map((id) => byId.get(id))
        .filter((el): el is NonNullable<typeof el> => Boolean(el))
        .map((el) => ({
          id: el.id,
          name: el.web_name,
          team: teams.get(el.team) ?? "???",
          position: POS[el.element_type],
          price: el.now_cost / 10,
          readAs: el.web_name,
          confidence: "exact" as const,
        }));
    } catch {
      // FPL being down should not stop the page loading.
      squadPlayers = [];
    }
  }

  return NextResponse.json({
    signedIn: p.signedIn,
    plan: p.plan,
    teamId: p.teamId,
    expiresAt: p.expiresAt,
    squadPlayers,
  });
}

/** Remember this manager's team ID and squad so they never enter them twice. */
export async function POST(req: NextRequest) {
  const p = await getProfile();
  if (!p.userId) {
    return NextResponse.json({ error: "Sign in to save your squad." }, { status: 401 });
  }

  let teamId: string | null = null;
  let playerIds: number[] | null = null;
  try {
    const body = await req.json();
    if (body.teamId !== undefined) {
      const cleaned = String(body.teamId ?? "").replace(/\D/g, "");
      if (cleaned) teamId = cleaned;
    }
    if (Array.isArray(body.playerIds)) {
      playerIds = body.playerIds
        .map((x: unknown) => parseInt(String(x), 10))
        .filter((n: number) => Number.isFinite(n) && n > 0)
        .slice(0, 15);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!teamId && !playerIds?.length) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  if (teamId) await saveTeamId(p.userId, teamId);
  if (playerIds?.length) await saveSquad(p.userId, playerIds);

  return NextResponse.json({ ok: true, teamId, saved: playerIds?.length ?? 0 });
}
