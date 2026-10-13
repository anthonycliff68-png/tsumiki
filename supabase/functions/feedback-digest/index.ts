/**
 * Send what people wrote in, to the person who can do something about it.
 *
 * The feedback screen shipped in 1.2 and wrote rows to a table that nothing
 * read. The shape was there from the start — `sent_at`, and an index on the
 * rows without one — and this is the half that was missing. Until it ran,
 * every report sat in Postgres and the button in the app was, in effect, a
 * black hole.
 *
 * Runs every quarter of an hour. The order matters and is the only subtle
 * thing here: rows are stamped *after* the mail server has taken the message,
 * never before. A run that fails leaves them unsent, so the next tick picks up
 * exactly the same rows rather than losing them to a stamp that was optimistic.
 *
 * Needs three secrets on the function:
 *   RESEND_API_KEY   the sending key
 *   FEEDBACK_TO      where it goes       (default below)
 *   FEEDBACK_FROM    an address on the verified domain
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { BATCH, buildDigest, type FeedbackRow } from '../_shared/digest.ts';

const RESEND_URL = 'https://api.resend.com/emails';
const TO = Deno.env.get('FEEDBACK_TO') ?? 'tsumikihabittracker@gmail.com';
// mail.tsumiki.day, not tsumiki.day: the DKIM record Resend verifies against
// lives at resend._domainkey.mail.tsumiki.day, and the apex has none. Sending
// from the apex is refused, so the wrong default here would have meant a digest
// that 502s on every run and feedback that still never arrives.
const FROM = Deno.env.get('FEEDBACK_FROM') ?? 'Tsumiki <feedback@mail.tsumiki.day>';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: rows, error } = await supabase
    .from('feedback')
    .select('id, user_id, message, app_version, platform, reply_wanted, created_at')
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return Response.json({ sent: 0 });

  // Addresses are looked up only for the rows that asked to hear back, one at
  // a time because there are rarely more than a couple. Reading every user to
  // save a round trip would mean handling every user's address to deliver two.
  const withEmail: FeedbackRow[] = [];
  for (const r of rows) {
    let email: string | null = null;
    if (r.reply_wanted && r.user_id) {
      const { data } = await supabase.auth.admin.getUserById(r.user_id);
      email = data?.user?.email ?? null;
    }
    withEmail.push({ ...r, email });
  }

  const digest = buildDigest(withEmail);
  if (!digest) return Response.json({ sent: 0 });

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    // Loud rather than quiet: a digest that silently does nothing because a
    // secret is missing is the same failure this function exists to end.
    return Response.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 });
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject: digest.subject, text: digest.text }),
  });

  if (!res.ok) {
    const body = await res.text();
    // Nothing is stamped, so these rows come back round on the next tick.
    return Response.json({ error: `resend ${res.status}`, body }, { status: 502 });
  }

  const ids = rows.map((r) => r.id);
  const { error: stampError } = await supabase
    .from('feedback')
    .update({ sent_at: new Date().toISOString() })
    .in('id', ids);

  // The mail is already gone. Say so plainly rather than reporting a clean run:
  // the next tick will send these again, and a duplicate digest is a great deal
  // better than a lost one.
  if (stampError) {
    return Response.json({ sent: ids.length, stamped: false, error: stampError.message }, {
      status: 500,
    });
  }

  return Response.json({ sent: ids.length, subject: digest.subject });
});
