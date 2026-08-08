/**
 * Life_OS v2 — Counselor server route.
 * api/counselor/route.ts
 * Uses Groq API (Llama 3.3 70B) with 3 API keys rotated for fallback.
 * Only called for deep reflection — 90% of intents are handled locally.
 *
 * If all 3 keys fail, returns a graceful fallback so the Counselor
 * can still respond with a caring message.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

interface RequestBody {
  message: string;
  contextSummary: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "counselor"; content: string }>;
}

async function callGroq(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 400,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[counselor] Groq API error (${response.status}):`, errorText);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build the full system prompt with context
    const fullSystemPrompt = `${body.systemPrompt}

You are talking to a real user about THEIR life. Below is their actual data from the past week. Cite specific entries when relevant. If you don't know something, say so — never invent facts about the user. Keep responses under 200 words unless asked for detail. Use the user's name when appropriate.

${body.contextSummary}`;

    // Convert history to LLM format
    const messages = [
      { role: "system", content: fullSystemPrompt },
      ...body.history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: body.message },
    ];

    // Try each API key in sequence
    let reply = "";
    let lastError = "";

    for (let i = 0; i < GROQ_KEYS.length; i++) {
      try {
        console.log(`[counselor] trying API key ${i + 1}/${GROQ_KEYS.length}...`);
        reply = await callGroq(messages, GROQ_KEYS[i]);
        if (reply.trim()) {
          console.log(`[counselor] success with key ${i + 1}`);
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[counselor] key ${i + 1} failed:`, lastError);
        // Continue to next key
      }
    }

    // If all keys failed, return graceful fallback
    if (!reply.trim()) {
      console.error("[counselor] all API keys exhausted");
      reply = "I'm having trouble connecting to my deeper reflection right now. But I'm still here — tell me more about what's going on, and I'll do my best with what I can see in your data.";
    }

    return NextResponse.json({
      reply,
      contextUsed: true,
      apiUsed: reply.includes("I'm having trouble") ? false : true,
    });
  } catch (err) {
    console.error("[counselor] route error:", err);
    return NextResponse.json(
      {
        reply: "I'm having trouble right now. Please try again in a moment.",
        contextUsed: false,
        apiUsed: false,
      },
      { status: 200 }, // Return 200 with fallback so the UI doesn't show an error
    );
  }
}
