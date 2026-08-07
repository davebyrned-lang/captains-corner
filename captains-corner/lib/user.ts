import { auth, clerkClient } from "@clerk/nextjs/server";

export type Plan = "free" | "classic" | "premium";

/**
 * Everything we know about the person making the request.
 *
 * Deliberately stored on the Clerk user record rather than in a database.
 * We only need a team ID, a plan and an expiry date, and keeping it here means
 * one less service to run, pay for and back up.
 */
export interface Profile {
  userId: string | null;
  signedIn: boolean;
  plan: Plan;
  teamId: string | null;
  expiresAt: string | null;
}

export const ANON: Profile = {
  userId: null,
  signedIn: false,
  plan: "free",
  teamId: null,
  expiresAt: null,
};

export async function getProfile(): Promise<Profile> {
  const { userId } = await auth();
  if (!userId) return ANON;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const md = (user.privateMetadata ?? {}) as Record<string, unknown>;

    let plan: Plan = (md.plan as Plan) ?? "free";
    const expiresAt = typeof md.expiresAt === "string" ? md.expiresAt : null;

    // A season pass is a one-off payment with an end date, so check it every time.
    if (plan !== "free" && expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      plan = "free";
    }

    return {
      userId,
      signedIn: true,
      plan,
      teamId: typeof md.fplTeamId === "string" ? md.fplTeamId : null,
      expiresAt,
    };
  } catch {
    // Never let a Clerk hiccup take the whole app down. Treat as signed out.
    return { ...ANON, userId, signedIn: true };
  }
}

export async function saveTeamId(userId: string, teamId: string): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    privateMetadata: { ...(user.privateMetadata ?? {}), fplTeamId: teamId },
  });
}

export async function setPlan(
  userId: string,
  plan: Plan,
  expiresAt: string
): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    privateMetadata: { ...(user.privateMetadata ?? {}), plan, expiresAt },
  });
}

export const isPaid = (p: Plan) => p === "classic" || p === "premium";
export const isPremium = (p: Plan) => p === "premium";

/** The season ends in late May. Anything bought now runs to the end of it. */
export function seasonEnd(now = new Date()): string {
  const year = now.getUTCMonth() >= 5 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(year, 4, 31, 23, 59, 59)).toISOString();
}
