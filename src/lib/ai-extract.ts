import { z } from "zod";
import type { Category } from "./types";
import { getSetting } from "./db";
import { listActiveItems } from "./items";
import { isCategoryValue } from "./extract-renewal";

export type AiDraft = {
  relevant: boolean;
  name: string | null;
  category: Category;
  provider: string | null;
  renewal_date: string | null;
  amount: number | null;
  currency: string;
  notes: string | null;
  model: string;
};

const DraftSchema = z.object({
  relevant: z.boolean(),
  name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  renewal_date: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export function geminiKey() {
  return (getSetting("gemini_api_key") || process.env.GEMINI_API_KEY || "").trim();
}

export function openaiKey() {
  return (getSetting("openai_api_key") || process.env.OPENAI_API_KEY || "").trim();
}

export function anthropicKey() {
  return (getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY || "").trim();
}

export type AiProvider = "claude" | "openai" | "gemini";

export function preferredProvider(): AiProvider | null {
  const raw = (getSetting("ai_provider") || process.env.AI_PROVIDER || "auto").trim().toLowerCase();
  if (raw === "claude" && anthropicKey()) return "claude";
  if (raw === "openai" && openaiKey()) return "openai";
  if (raw === "gemini" && geminiKey()) return "gemini";
  if (anthropicKey()) return "claude";
  if (openaiKey()) return "openai";
  if (geminiKey()) return "gemini";
  return null;
}

export function aiConfigured() {
  return Boolean(anthropicKey() || openaiKey() || geminiKey());
}

export function aiProviderLabel() {
  const provider = preferredProvider();
  if (provider === "claude") return "Claude Haiku";
  if (provider === "openai") return "OpenAI gpt-4o-mini";
  if (provider === "gemini") return "Gemini 2.5 Flash";
  return "";
}

function clip(text: string, max = 8000) {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function parseDraft(raw: string, model: string): AiDraft | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  const data = DraftSchema.safeParse(parsed);
  if (!data.success) return null;
  const category = data.data.category && isCategoryValue(data.data.category) ? data.data.category : "other";
  const date = data.data.renewal_date && /^\d{4}-\d{2}-\d{2}$/.test(data.data.renewal_date) ? data.data.renewal_date : null;
  const amount = typeof data.data.amount === "number" && Number.isFinite(data.data.amount) ? data.data.amount : null;
  return {
    relevant: data.data.relevant,
    name: data.data.name?.trim() || null,
    category,
    provider: data.data.provider?.trim() || null,
    renewal_date: date,
    amount,
    currency: (data.data.currency || "ILS").trim().toUpperCase().slice(0, 3) || "ILS",
    notes: data.data.notes?.trim() || null,
    model,
  };
}

function promptFor(input: { subject: string; from: string; body: string; pdfText: string; forwarded: boolean }) {
  const known = listActiveItems()
    .slice(0, 40)
    .map((item) => `${item.name}${item.provider ? ` / ${item.provider}` : ""} / ${item.renewal_date}`)
    .join("\n");
  return `You extract household renewals (insurance, licenses, subscriptions, warranties, domains, memberships) from Hebrew or English email.
Return JSON only:
{"relevant":boolean,"name":string|null,"category":"insurance"|"license"|"subscription"|"warranty"|"membership"|"domain"|"other","provider":string|null,"renewal_date":"YYYY-MM-DD"|null,"amount":number|null,"currency":"ILS"|"USD"|"EUR"|null,"notes":string|null}

Rules:
- relevant=true only if this is a policy, renewal notice, invoice for a recurring service, license/expiry, warranty, or domain renewal. Not newsletters, OTPs, shipping, social, privacy policy, ads.
- Prefer a future expiry/renewal date. If several dates, pick the next renewal/end date.
- amount is the premium/price to pay, not random numbers. Use ILS if ₪ / שח.
- name: short household label in the email's language, e.g. "ביטוח רכב הראל".
- If the user forwarded this on purpose (forwarded=true), still fill fields even if unsure; set relevant=true unless it is clearly junk.
- Do not invent quotes or competitors. notes can mention what the email says, max 200 chars.
- If it matches an existing item, still relevant=true and use the same name/provider.

Existing items:
${known || "(none)"}

forwarded=${input.forwarded}
From: ${input.from}
Subject: ${input.subject}
Body: ${clip(input.body)}
PDF text: ${clip(input.pdfText, 6000)}`;
}

async function geminiExtract(prompt: string): Promise<AiDraft | null> {
  const key = geminiKey();
  if (!key) return null;
  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );
    if (!res.ok) continue;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    const draft = parseDraft(text, model);
    if (draft) return draft;
  }
  return null;
}

async function openaiExtract(prompt: string): Promise<AiDraft | null> {
  const key = openaiKey();
  if (!key) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only the JSON object requested." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseDraft(json.choices?.[0]?.message?.content ?? "", "gpt-4o-mini");
}

async function claudeExtract(prompt: string): Promise<AiDraft | null> {
  const key = anthropicKey();
  if (!key) return null;
  const models = ["claude-haiku-4-5", "claude-sonnet-4-5", "claude-3-5-haiku-latest"];
  for (const model of models) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        temperature: 0,
        system: "Return only a JSON object. No markdown.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) continue;
    const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
    const text = json.content?.map((part) => part.text ?? "").join("") ?? "";
    const draft = parseDraft(text, model);
    if (draft) return draft;
  }
  return null;
}

export async function extractWithAi(input: {
  subject: string;
  from: string;
  body: string;
  pdfText: string;
  forwarded: boolean;
}): Promise<AiDraft | null> {
  if (!aiConfigured()) return null;
  const prompt = promptFor(input);
  const order: AiProvider[] = [];
  const preferred = preferredProvider();
  if (preferred) order.push(preferred);
  for (const next of ["claude", "openai", "gemini"] as const) {
    if (!order.includes(next)) order.push(next);
  }
  try {
    for (const provider of order) {
      const draft =
        provider === "claude"
          ? await claudeExtract(prompt)
          : provider === "openai"
            ? await openaiExtract(prompt)
            : await geminiExtract(prompt);
      if (draft) return draft;
    }
  } catch {
    return null;
  }
  return null;
}
