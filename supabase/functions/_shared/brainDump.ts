/**
 * The pure half of the brain-dump function: who counts as Pro, what the model
 * is asked, and the shape it must answer in. Kept here, away from Deno.serve,
 * so it runs under node --test with the rest of _shared.
 */

/** A cost guard, not a product limit: about $1 a person a day at worst. */
export const DAILY_CAP = 30;

/** Longer than this is a pasted essay, not a dump. */
export const MAX_TRANSCRIPT = 8000;

/**
 * Does RevenueCat's GET /v1/subscribers/{id} reply show `pro` active now?
 * A null expiry is a lifetime grant. Anything unreadable is a no: this is the
 * door to a paid call, so the uncertain answer is the closed one.
 */
export function proFromRevenueCat(body: unknown, now: Date): boolean {
  const pro = (body as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> } })
    ?.subscriber?.entitlements?.pro;
  if (!pro || typeof pro !== 'object') return false;
  if (pro.expires_date == null) return true;
  const until = Date.parse(pro.expires_date);
  return !Number.isNaN(until) && until > now.getTime();
}

export type Sorted = {
  timeline: { title: string; day: string; time: string | null; momentId: string | null }[];
  todos: { title: string; day: string }[];
  notes: { title: string; folder: string; isNewFolder: boolean; emoji: string | null; body: string }[];
  habits: { name: string; momentId: string | null; time: string | null }[];
};

const str = { type: 'string' } as const;
const strOrNull = { type: ['string', 'null'] } as const;
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const list = (properties: Record<string, unknown>) => ({ type: 'array', items: obj(properties) });

/** The JSON schema for Sorted, handed to output_config.format. */
export const SORTED_SCHEMA = obj({
  timeline: list({ title: str, day: str, time: strOrNull, momentId: strOrNull }),
  todos: list({ title: str, day: str }),
  notes: list({ title: str, folder: str, isNewFolder: { type: 'boolean' }, emoji: strOrNull, body: str }),
  habits: list({ name: str, momentId: strOrNull, time: strOrNull }),
});

export type PromptInput = {
  transcript: string;
  /** The person's wall clock, "2026-10-31T17:05". */
  localNow: string;
  timeZone: string;
  folders: string[];
  moments: { id: string; label: string; time: string }[];
  habits: string[];
};

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  const today = input.localNow.slice(0, 10);
  const weekday = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

  const system = `You sort a person's brain dump for Tsumiki, a habit and day-planning app. They talked or typed freely; you file every point into exactly one place. Never invent things they didn't say.

Where things go:
- timeline: something tied to a time or a moment of their day ("call mum at 5", "after breakfast, stretch"). Give "time" as 24-hour HH:MM when they said a clock time. When they tied it to one of their moments, give that moment's id as "momentId" and leave "time" null.
- todos: a task with no time.
- notes: ideas, tips to themselves, techniques to try, plans, reflections. This is usually most of a dump.
- habits: only when they clearly want to start doing something regularly ("I want to start reading every night"). Never repeat a habit they already have. Stack it on a moment (momentId) or give a time, whichever they said; otherwise both null.

Days: "day" is YYYY-MM-DD. Today is ${weekday} ${today} in ${input.timeZone}. Resolve "tomorrow", "Thursday" and so on from that. When no day is said, use today.

Notes are written up the way Granola writes up a meeting: a short clear title, then the body in their own wording, tightened, under short "## " headings with "- " bullets. No other markdown. Put a note in the existing folder that fits (use its exact name, isNewFolder false). Only when none fits, make a short new folder name (isNewFolder true) and suggest one emoji for it; otherwise emoji is null. If a dump covers two topics, write two notes.

Titles for to-dos, timeline items and habits are short, start with a verb where natural, and stay under 80 characters. Return empty lists for anything they didn't mention.`;

  const moments = input.moments.length
    ? input.moments.map((m) => `- ${m.label} at ${m.time} (id ${m.id})`).join('\n')
    : '(none)';
  const user = `Their folders: ${input.folders.length ? input.folders.join(', ') : '(none yet)'}
Their moments:
${moments}
Their current habits: ${input.habits.length ? input.habits.join(', ') : '(none)'}
It is ${input.localNow} for them now.

The dump:
"""
${input.transcript}
"""`;

  return { system, user };
}
