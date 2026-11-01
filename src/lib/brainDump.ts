/**
 * The pure parts of the brain dump: turning what the server sorted into the
 * rows of the short look, before anything is added.
 */

/** What the brain-dump function returns. A copy of the server's type in
 *  supabase/functions/_shared/brainDump.ts — the app can't import from there. */
export type Sorted = {
  timeline: { title: string; day: string; time: string | null; momentId: string | null }[];
  todos: { title: string; day: string }[];
  notes: { title: string; folder: string; isNewFolder: boolean; emoji: string | null; body: string }[];
  habits: { name: string; momentId: string | null; time: string | null }[];
};

export type LookRow = {
  key: string;
  kind: 'timeline' | 'todo' | 'note' | 'habit';
  ticked: boolean;
  title: string;
  /** YYYY-MM-DD; empty for a habit, which is every day. */
  day: string;
  /** "HH:MM". */
  time: string | null;
  momentId: string | null;
  folder?: string;
  isNewFolder?: boolean;
  emoji?: string | null;
  body?: string;
};

/**
 * Everything starts ticked except habit ideas: a habit is a commitment, so it
 * only goes in when the person says so. A folder the model named that already
 * exists, in any case, is that folder.
 */
export function toLookRows(sorted: Sorted, folders: { name: string }[]): LookRow[] {
  const existing = (name: string) => folders.find((f) => f.name.toLowerCase() === name.trim().toLowerCase());
  return [
    ...sorted.timeline.map((t, i): LookRow => ({ key: `timeline-${i}`, kind: 'timeline', ticked: true, ...t })),
    ...sorted.todos.map(
      (t, i): LookRow => ({ key: `todo-${i}`, kind: 'todo', ticked: true, ...t, time: null, momentId: null }),
    ),
    ...sorted.notes.map((n, i): LookRow => {
      const match = existing(n.folder);
      return {
        key: `note-${i}`,
        kind: 'note',
        ticked: true,
        title: n.title,
        day: '',
        time: null,
        momentId: null,
        folder: match?.name ?? n.folder.trim(),
        isNewFolder: !match,
        emoji: match ? null : n.emoji,
        body: n.body,
      };
    }),
    ...sorted.habits.map(
      (h, i): LookRow => ({ key: `habit-${i}`, kind: 'habit', ticked: false, title: h.name, day: '', ...h }),
    ),
  ];
}

export const tickedCount = (rows: LookRow[]) => rows.filter((r) => r.ticked).length;

/** "Thu" for a day that isn't today; null for today (or no day). */
export function shortDay(day: string, today: string): string | null {
  if (!day || day === today) return null;
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

/** Ids added by a brain dump this run, for the "✦ new" mark. Lives until the
 *  app restarts, which is as long as "new" means anything. */
export const freshIds = new Set<string>();
