/**
 * The pure parts of Notes: reading a body, and grouping a folder by day.
 *
 * A body is plain text. Notes a brain dump writes use "## " headings and "- "
 * bullets, Granola-style, so those two are drawn; everything else is a line of
 * text. No Markdown library: two prefixes don't need one.
 */
import { localDateString } from './dates.ts';

export type Block = { kind: 'heading' | 'bullet' | 'text'; text: string };

export function parseNoteBody(body: string): Block[] {
  return body.split('\n').flatMap((raw): Block[] => {
    const line = raw.trim();
    if (!line) return [];
    if (line.startsWith('## ')) return [{ kind: 'heading', text: line.slice(3).trim() }];
    if (line.startsWith('- ')) return [{ kind: 'bullet', text: line.slice(2).trim() }];
    return [{ kind: 'text', text: line }];
  });
}

/** "Today · Sat Oct 31", "Yesterday · Fri Oct 30", or just "Mon Oct 26". */
export function dayHeading(createdAt: string, now: Date = new Date()): string {
  const date = new Date(createdAt);
  const short = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '');
  const day = localDateString(date);
  if (day === localDateString(now)) return `Today · ${short}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === localDateString(yesterday)) return `Yesterday · ${short}`;
  return short;
}

/** Notes already newest first, cut into runs that share a local day. */
export function groupByDay<T extends { createdAt: string }>(notes: T[], now: Date = new Date()) {
  const groups: { heading: string; notes: T[] }[] = [];
  for (const note of notes) {
    const heading = dayHeading(note.createdAt, now);
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.notes.push(note);
    else groups.push({ heading, notes: [note] });
  }
  return groups;
}
