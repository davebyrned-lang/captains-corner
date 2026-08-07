import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveTeamId } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the browser needs to know about the current visitor. */
export async function GET() {
  const p = await getProfile();
  return NextResponse.json({
    signedIn: p.signedIn,
    plan: p.plan,
    teamId: p.teamId,
    expiresAt: p.expiresAt,
  });
}

/** Remember this manager's team ID so they never type it twice. */
export async function POST(req: NextRequest) {
  const p = await getProfile();
  if (!p.userId) {
    return NextResponse.json({ error: "Sign in to save your team." }, { status: 401 });
  }

  let teamId: string;
  try {
    const body = await req.json();
    teamId = String(body.teamId ?? "").replace(/\D/g, "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!teamId) {
    return NextResponse.json({ error: "That is not a valid team ID." }, { status: 400 });
  }

  await saveTeamId(p.userId, teamId);
  return NextResponse.json({ ok: true, teamId });
}
