/**
 * Sorts a brain dump into timeline items, to-dos, notes and habit ideas.
 *
 * The one place the Anthropic key lives. Called by the app with the person's
 * session; it checks who they are, that they have Pro and consented, and that
 * they are under the daily cap, then makes one model call. It writes only the
 * brain_dumps row — everything that lands in the day is written by the app
 * after the person has looked at it.
 *
 * Pro is asked of RevenueCat, never read from profiles.subscribed_until: the
 * app writes that column itself, so it proves nothing here.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { isLocked } from '../_shared/access.ts';
import {
  buildPrompt,
  DAILY_CAP,
  MAX_TRANSCRIPT,
  proFromRevenueCat,
  SORTED_SCHEMA,
  type Sorted,
} from '../_shared/brainDump.ts';

const fail = (error: string, status: number) => Response.json({ error }, { status });

Deno.serve(async (request: Request) => {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const revenueCatKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!url || !anonKey || !serviceKey || !anthropicKey || !revenueCatKey) {
    return fail('missing credentials', 500);
  }

  // The person's own client: RLS gives it exactly what the app can see.
  const authorization = request.headers.get('Authorization') ?? '';
  const asUser = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth } = await asUser.auth.getUser(authorization.replace(/^Bearer /, ''));
  const userId = auth.user?.id;
  if (!userId) return fail('unauthorized', 401);

  const body = await request.json().catch(() => null);
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
  const localNow = typeof body?.localNow === 'string' ? body.localNow : '';
  const timeZone = typeof body?.timeZone === 'string' ? body.timeZone : 'UTC';
  if (!transcript || transcript.length > MAX_TRANSCRIPT || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(localNow)) {
    return fail('bad_input', 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date();

  const { data: profile } = await admin
    .from('profiles')
    .select('created_at, trial_started_at, ai_consent_at')
    .eq('id', userId)
    .single();
  if (!profile) return fail('unauthorized', 401);
  if (!profile.ai_consent_at) return fail('no_consent', 403);

  // Grandfathered and legacy-trial accounts pass on our own rule. subscribed_until
  // is left out on purpose: it is the client's word, and RevenueCat's is the real one.
  let pro = !isLocked({
    createdAt: profile.created_at,
    trialStartedAt: profile.trial_started_at,
    subscribedUntil: null,
    now,
  });
  if (!pro) {
    const rc = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${revenueCatKey}` },
    });
    pro = rc.ok && proFromRevenueCat(await rc.json().catch(() => null), now);
  }
  if (!pro) return fail('not_pro', 402);

  // ponytail: a UTC day, not the person's own. Close enough for a cost guard.
  const { count } = await admin
    .from('brain_dumps')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${now.toISOString().slice(0, 10)}T00:00:00Z`);
  if ((count ?? 0) >= DAILY_CAP) return fail('daily_cap', 429);

  // Kept before sorting, so a failed call never costs them what they said.
  const { data: dump, error: dumpError } = await admin
    .from('brain_dumps')
    .insert({ user_id: userId, transcript })
    .select('id')
    .single();
  if (dumpError || !dump) return fail('sort_failed', 502);

  const [folders, moments, habits] = await Promise.all([
    asUser.from('note_folders').select('name'),
    asUser.from('anchors').select('id, label, usual_time').order('usual_time'),
    asUser.from('habits').select('name').is('archived_at', null),
  ]);

  const prompt = buildPrompt({
    transcript,
    localNow,
    timeZone,
    folders: (folders.data ?? []).map((f) => f.name),
    moments: (moments.data ?? []).map((m) => ({ id: m.id, label: m.label, time: m.usual_time.slice(0, 5) })),
    habits: (habits.data ?? []).map((h) => h.name),
  });

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SORTED_SCHEMA } },
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      return fail('sort_failed', 502);
    }
    const text = response.content.find((block) => block.type === 'text');
    const sorted = JSON.parse(text?.type === 'text' ? text.text : '') as Sorted;
    return Response.json({ dumpId: dump.id, sorted });
  } catch (error) {
    console.error('brain-dump sort failed', error);
    return fail('sort_failed', 502);
  }
});
