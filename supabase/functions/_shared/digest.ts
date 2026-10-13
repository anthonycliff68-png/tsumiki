/**
 * Turning rows of feedback into one email.
 *
 * Pure, so the awkward parts can be tested without a mail server: which rows go
 * out, whether an address is allowed to appear, and what the subject says when
 * there are four of them instead of one.
 *
 * A digest rather than one email per row. Somebody writing in three times in an
 * afternoon is one conversation, and the sender is rate limited anyway — a bad
 * day on the App Store should not be the thing that exhausts the quota.
 */

/** One row of public.feedback, plus the address when they asked for a reply. */
export type FeedbackRow = {
  id: string;
  message: string;
  app_version: string | null;
  platform: string | null;
  reply_wanted: boolean;
  created_at: string;
  /** From auth.users. Only ever read for a row that asked to hear back. */
  email: string | null;
};

/**
 * How many rows one run will send.
 *
 * Capped so a flood cannot build an email too large to deliver, and so a single
 * failure cannot strand every unsent row behind it. What is left over is picked
 * up by the next tick, oldest first, because the index on the table is ordered
 * that way.
 */
export const BATCH = 50;

export type Digest = { subject: string; text: string };

/** The date, written the way a person reads it rather than ISO. */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

/**
 * Build the email, or null when there is nothing to send.
 *
 * Returning null rather than an empty digest is the whole reason this is
 * separate: a job that runs every quarter of an hour must not send ninety-six
 * empty emails a day, and "there was nothing" is not an error.
 */
export function buildDigest(rows: FeedbackRow[]): Digest | null {
  if (rows.length === 0) return null;

  const replies = rows.filter((r) => r.reply_wanted).length;
  const subject =
    rows.length === 1
      ? `Tsumiki feedback${replies > 0 ? ' · wants a reply' : ''}`
      : `Tsumiki feedback · ${rows.length} new${replies > 0 ? `, ${replies} want a reply` : ''}`;

  const parts = rows.map((r) => {
    const meta = [r.platform, r.app_version].filter(Boolean).join(' · ');
    const head = [when(r.created_at), meta].filter(Boolean).join('  |  ');
    // The address appears only when they asked to hear back. Someone who left
    // the toggle off wrote in anonymously as far as they are concerned, and
    // putting their email in the digest quietly makes that untrue.
    const reply = r.reply_wanted
      ? `\nReply to: ${r.email ?? '(no address on the account)'}`
      : '\nNo reply wanted.';
    return `${head}${reply}\n\n${r.message.trim()}`;
  });

  return { subject, text: parts.join('\n\n' + '—'.repeat(40) + '\n\n') + '\n' };
}
