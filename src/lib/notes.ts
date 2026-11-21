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

/** Last opened first; a note never opened on this phone falls back to when it was written. */
export function byOpened<T extends { id: string; createdAt: string }>(notes: readonly T[], opened: Record<string, number>): T[] {
  const at = (n: T) => opened[n.id] ?? Date.parse(n.createdAt);
  return [...notes].sort((a, b) => at(b) - at(a));
}

/** "Just now", "2h", "9:40 AM" (yesterday: the section already says so), "Tue", or "Oct 26" once it's over a week. */
export function openedLabel(at: number, now: Date = new Date()): string {
  const mins = (now.getTime() - at) / 60000;
  if (mins < 60) return 'Just now';
  const date = new Date(at);
  if (localDateString(date) === localDateString(now)) return `${Math.floor(mins / 60)}h`;
  if (localDateString(date) === localDateString(daysBefore(now, 1))) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (mins < 7 * 24 * 60) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysBefore(now: Date, days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

export type OpenedSection = 'today' | 'yesterday' | 'week' | 'earlier';

/** Notes last opened first, cut into Today, Yesterday, This week and Earlier; empty sections left out. */
export function openedSections<T extends { id: string; createdAt: string }>(
  notes: readonly T[],
  opened: Record<string, number>,
  now: Date = new Date(),
): { section: OpenedSection; notes: T[] }[] {
  const sectionOf = (at: number): OpenedSection => {
    const day = localDateString(new Date(at));
    if (day === localDateString(now)) return 'today';
    if (day === localDateString(daysBefore(now, 1))) return 'yesterday';
    return now.getTime() - at < 7 * 24 * 60 * 60000 ? 'week' : 'earlier';
  };
  const out: { section: OpenedSection; notes: T[] }[] = [];
  for (const note of byOpened(notes, opened)) {
    const section = sectionOf(opened[note.id] ?? Date.parse(note.createdAt));
    const last = out[out.length - 1];
    if (last?.section === section) last.notes.push(note);
    else out.push({ section, notes: [note] });
  }
  return out;
}

/** A quick note: the first line is its title, the rest its body. */
export function splitCapture(text: string): { title: string; body: string } {
  const [first = '', ...rest] = text.trim().split('\n');
  return { title: first.trim(), body: rest.join('\n').trim() };
}
