import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBootstrap, FplError } from "@/lib/fpl";
import { matchSquad } from "@/lib/match";
import { checkRateLimit, isSubscriber } from "@/lib/ratelimit";
import { getProfile } from "@/lib/user";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const EXTRACT_TOOL = {
  name: "submit_squad",
  description: "Submit the list of footballers visible in the screenshot.",
  input_schema: {
    type: "object" as const,
    properties: {
      players: {
        type: "array",
        description:
          "Every player name visible, in reading order: goalkeeper first, then defenders, midfielders, forwards, then any substitutes.",
        items: { type: "string" },
      },
      looks_like_fpl: {
        type: "boolean",
        description: "True if this looks like a Fantasy Premier League squad, pitch view or team list.",
      },
      note: {
        type: "string",
        description: "Anything unclear: cut-off names, unreadable text, or what the image actually shows if it is not a squad.",
      },
    },
    required: ["players", "looks_like_fpl", "note"],
  },
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The site is not configured yet: ANTHROPIC_API_KEY is missing." }, { status: 500 });
  }

  const profile = await getProfile();
  if (!profile.signedIn) {
    return NextResponse.json(
      { error: "Please sign in to upload a squad." },
      { status: 401 }
    );
  }

  const ip =
    profile.userId ??
    (req.headers.get("x-forwarded-for") ?? "anonymous").split(",")[0].trim();
  if (!(await isSubscriber(ip))) {
    const rate = await checkRateLimit(`extract:${ip}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `You have used your ${rate.limit} free uploads for today. They reset at midnight UTC.` },
        { status: 429 }
      );
    }
  }

  let mediaType: string;
  let base64: string;
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image was uploaded." }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
      return NextResponse.json(
        { error: "That file type is not supported. Use a PNG, JPG or WEBP screenshot." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That image is over 5MB. Take a screenshot rather than uploading a photo, or resize it." },
        { status: 400 }
      );
    }
    base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    mediaType = file.type;
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded file." }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 1500,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "submit_squad" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as any, data: base64 } },
            {
              type: "text",
              text: `Read every footballer's name from this Fantasy Premier League screenshot.

Rules:
- Return names exactly as printed, including initials like "M.Salah".
- Include substitutes as well as the starting eleven.
- Do not guess at names that are cut off or blurred. List what you can actually read and mention the problem in the note.
- If this is not a football squad at all, set looks_like_fpl to false and say what it shows.`,
            },
          ],
        },
      ],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Could not read that image. Try a clearer screenshot." }, { status: 502 });
    }

    const out = toolUse.input as { players?: unknown; looks_like_fpl?: boolean; note?: string };
    const names = Array.isArray(out.players)
      ? out.players.filter((n): n is string => typeof n === "string" && n.trim().length > 1)
      : [];

    if (!out.looks_like_fpl && names.length === 0) {
      return NextResponse.json(
        { error: `That does not look like an FPL squad. ${out.note ?? ""}`.trim() },
        { status: 400 }
      );
    }
    if (names.length === 0) {
      return NextResponse.json(
        { error: "No player names could be read from that image. Try a full screenshot of your Pick Team page." },
        { status: 400 }
      );
    }

    const bootstrap = await getBootstrap();
    const { matched, unmatched } = matchSquad(names, bootstrap);

    return NextResponse.json({
      matched,
      unmatched,
      note: out.note ?? "",
      readCount: names.length,
    });
  } catch (e) {
    if (e instanceof FplError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Extraction failed:", detail);
    return NextResponse.json({ error: "Could not read that image. Please try again.", detail }, { status: 500 });
  }
}
