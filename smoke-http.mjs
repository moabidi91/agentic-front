/**
 * smoke-http.mjs — exercises the real HttpApiClient (src/api/http.ts) against a running
 * agentic-local-app. Unlike the other smoke-*.mjs scripts it drives no browser: it imports the
 * very file the app ships and calls it, so what passes here is what the screens will get.
 *
 * It starts nothing. Point it at a server that is already up:
 *
 *   node smoke-http.mjs [baseUrl]
 *
 * Default base URL: http://127.0.0.1:8765/api/v1
 *
 * One line per check, a non-zero exit as soon as one of them fails.
 *
 * It never prints a credential value: the two it posts are local sentinels — one the model
 * accepts, one it refuses on purpose to drive a real 401 — and the last check greps the whole
 * transcript for both. `POST /credentials` writes to the server's environment, so those two are
 * the only values ever sent.
 *
 * The pause path needs a model that answers 401. Start the mock model with a scenario carrying
 * `"token": "<the accepted sentinel>"` and leave the server's token variable unset; the run then
 * drives a genuine `RUNNING -> PAUSED` and resumes it. Without such a model the pause checks are
 * skipped and say so.
 *
 * `POST /admin/reset-database` is destructive; it is only called to verify that the guard
 * (`api.allow_destructive_admin = false`) refuses it. A server with the guard open is reported
 * as skipped and nothing is erased.
 *
 * Requires Node >= 22.18 (it imports a .ts file directly, through native type stripping).
 */

import { ApiError, HttpApiClient } from './src/api/http.ts';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8765/api/v1';
const BASE = (process.argv.slice(2).find((a) => !a.startsWith('--')) ?? DEFAULT_BASE_URL).replace(/\/+$/, '');

/** The credential value this script signs in with. Never a real token, never printed. */
const SENTINEL = 'smoke-http-sentinel-value-do-not-print';

/**
 * A value the model is meant to refuse, so the run can reach a genuinely paused session instead
 * of simulating one. Not a credential, but posted on the same route: kept out of the transcript
 * exactly like the other one.
 */
const WRONG_SENTINEL = 'smoke-http-wrong-token-on-purpose';

let passed = 0;
let failed = 0;
let skipped = 0;
let step = 0;
const transcript = [];

function say(text) {
  transcript.push(text);
  console.log(text);
}

function line(mark, name, detail) {
  step += 1;
  say(`${mark} ${String(step).padStart(2, '0')}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    line('ok  ', name, detail);
  } else {
    failed += 1;
    line('FAIL', name, detail);
  }
  return condition;
}

function skip(name, detail) {
  skipped += 1;
  line('skip', name, detail);
}

function summarise() {
  say(`\n${passed} passed, ${failed} failed, ${skipped} skipped — ${BASE}`);
}

// A step that throws is a failed check, not a stack trace: the message and the error code only,
// never the whole error object, which would print whatever a caller had passed in.
process.on('unhandledRejection', (error) => {
  failed += 1;
  line('FAIL', 'the run stopped on an unexpected error', `${error?.code ?? error?.name ?? 'Error'}: ${error?.message ?? error}`);
  summarise();
  process.exit(1);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `fn`, returning the ApiError it threw, or null when it did not throw one. */
async function refusal(fn) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error instanceof ApiError ? error : null;
  }
}

// ------------------------------------------------------------------------------------------------
// injection points: a fetch that records the call order, and an EventSource built on fetch
// ------------------------------------------------------------------------------------------------

/** `["POST /credentials", "POST /sessions", …]`, in the order the client issued them. */
const calls = [];

/**
 * What each `POST /sessions` carried: its field names, and `user_id` — the one value read out of
 * a request body here. A session-creation body never carries a credential (they go to
 * `POST /credentials`, whose body this spy deliberately never opens), so nothing secret can reach
 * the transcript through it.
 */
const sessionBodies = [];

const spyFetch = (input, init = {}) => {
  const method = init.method ?? 'GET';
  const path = String(input).slice(BASE.length).split('?')[0];
  calls.push(`${method} ${path}`);
  if (method === 'POST' && path === '/sessions' && typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body);
      sessionBodies.push({ keys: Object.keys(body).sort(), userId: body.user_id ?? null });
    } catch {
      sessionBodies.push({ keys: ['<unparsed>'], userId: null });
    }
  }
  return fetch(input, init);
};

/** Frames received by every stream this run opened, for the live-stream checks. */
let sseFrames = 0;

/**
 * The slice of EventSource the client uses (addEventListener, onopen, onerror, close), over
 * fetch — Node has no global EventSource here, and injecting one is exactly what the client's
 * `eventSource` option is for.
 */
class FetchEventSource {
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onerror = null;
    this.listeners = new Map();
    this.controller = new AbortController();
    this.closed = false;
    void this.run();
  }

  addEventListener(type, handler) {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(handler);
    this.listeners.set(type, bucket);
  }

  close() {
    this.closed = true;
    this.controller.abort();
  }

  emit(type, data, lastEventId) {
    sseFrames += 1;
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ type, data, lastEventId });
    }
  }

  async run() {
    try {
      const response = await fetch(this.url, {
        headers: { Accept: 'text/event-stream' },
        signal: this.controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(`stream refused with ${response.status}`);
      }
      this.onopen?.({ type: 'open' });
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
        let cut = buffer.indexOf('\n\n');
        while (cut !== -1) {
          const frame = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          cut = buffer.indexOf('\n\n');
          let type = 'message';
          let id = '';
          const data = [];
          for (const raw of frame.split('\n')) {
            if (raw.startsWith('event:')) type = raw.slice(6).trim();
            else if (raw.startsWith('id:')) id = raw.slice(3).trim();
            else if (raw.startsWith('data:')) data.push(raw.slice(5).trim());
          }
          if (data.length > 0) this.emit(type, data.join('\n'), id);
        }
      }
    } catch {
      if (!this.closed) this.onerror?.({ type: 'error' });
    }
  }
}

// ------------------------------------------------------------------------------------------------
// the client under test
// ------------------------------------------------------------------------------------------------

const client = new HttpApiClient(BASE, {
  fetch: spyFetch,
  eventSource: (url) => new FetchEventSource(url),
  reconnect: { initialDelayMs: 100, maxDelayMs: 1000, maxAttempts: 3 },
});

/** A second client, off the spy, for the polls that run beside a call under observation. */
const probe = new HttpApiClient(BASE);

/** The states in which the loop no longer owns the session (§7.3). */
const SETTLED = ['READY', 'WAITING_USER', 'COMPLETED', 'FAILED', 'INTERRUPTED', 'CLOSED', 'PAUSED'];

/**
 * Waits for the session to be paused — optionally for a pause *newer* than `after`, which is how
 * a resume that hits the same refusal is told apart from the pause it started from.
 */
async function waitForPause(sessionId, after = null, timeoutMs = 25_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const reason = await probe.pauseReason(sessionId).catch(() => null);
    if (reason !== null && (after === null || reason.since !== after)) return reason;
    await sleep(100);
  }
  return null;
}

/** Waits until the session is no longer paused — the resume took. */
async function waitUntilResumed(sessionId, timeoutMs = 25_000) {
  const until = Date.now() + timeoutMs;
  let status = '';
  while (Date.now() < until) {
    status = (await probe.getSession(sessionId)).status;
    if (status !== 'PAUSED') return status;
    await sleep(100);
  }
  return status;
}

/** Waits until the loop hands the session back, so the next step is not a race. */
async function settle(sessionId, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  let status = '';
  while (Date.now() < until) {
    status = (await probe.getSession(sessionId)).status;
    if (SETTLED.includes(status)) return status;
    await sleep(50);
  }
  return status;
}

say(`HttpApiClient against ${BASE}\n`);

// ---- identity and catalogue --------------------------------------------------------------------
const who = await client.whoAmI();
check('whoAmI() — GET /whoami', typeof who.userId === 'string' && who.userId !== '', `userId=${who.userId}`);

const whoVerbose = await client.whoAmIVerbose();
check(
  'whoAmIVerbose() — source and host, which WhoAmI cannot hold (G-1)',
  whoVerbose.source !== '',
  `source=${whoVerbose.source} host=${whoVerbose.host}`,
);

const models = await client.listModels();
check('listModels() — GET /models', models.length > 0, `${models.length} profile(s), first=${models[0]?.id}`);

const active = await client.activeModelName();
check('activeModelName() — the active profile comes first', active !== '' && models[0]?.id === active, `active=${active}`);

check(
  'ApiClient carries the pause path: pauseReason(), setCredentials(), resume()',
  typeof client.pauseReason === 'function' && typeof client.setCredentials === 'function' && typeof client.resume === 'function',
);

const flagged = models.filter((m) => typeof m.active === 'boolean');
const actives = models.filter((m) => m.active === true);
check(
  'GET /models marks the one profile this process serves → ModelOption.active (G-2 closed)',
  flagged.length === models.length && actives.length === 1 && actives[0].id === active,
  `${actives.length} active of ${models.length}: ${actives.map((m) => m.id).join(', ') || '—'}`,
);

const withFields = models.filter((m) => Array.isArray(m.credentialFields));
check(
  'credential_fields → ModelOption.credentialFields (ADR-027 §2)',
  withFields.length === models.length,
  `${withFields.length}/${models.length} profiles carry the list; active declares [${(models[0]?.credentialFields ?? []).map((f) => f.key).join(', ') || '—'}]`,
);

const fieldShape = models.every((m) =>
  (m.credentialFields ?? []).every((f) => typeof f.key === 'string' && f.key !== '' && typeof f.label === 'string' && typeof f.secret === 'boolean'),
);
check('every declared field has {key, label, secret} and no environment variable', fieldShape);

const catalogue = JSON.stringify(models);
check(
  'the catalogue carries no secret — no env name, no value (ADR-027 §2)',
  !catalogue.includes('"env"') && !/token_env|AGENTIC_TRANSPORT_TOKEN/.test(catalogue),
);

// ---- skills ------------------------------------------------------------------------------------
const skills = await client.listKnownSkills();
check(
  'listKnownSkills() — GET /skills, names only (ADR-027 §4)',
  Array.isArray(skills) && skills.every((s) => typeof s === 'string'),
  skills.length === 0 ? 'empty ([skills] root unset — the field degrades to free text)' : `${skills.length}: ${skills.join(', ')}`,
);
check('supportsKnownSkills is true now that the route exists', client.supportsKnownSkills === true);

// ---- credentials: both refusals, neither of which writes anything -------------------------------
const unknownKey = await refusal(() => client.setCredentials({ 'not-a-declared-field': SENTINEL }));
check(
  'POST /credentials with an undeclared key → 400 CREDENTIAL_FIELD_UNKNOWN',
  unknownKey?.code === 'CREDENTIAL_FIELD_UNKNOWN' && unknownKey.status === 400,
  `${unknownKey?.status} ${unknownKey?.code} expected=[${(unknownKey?.details.expected ?? []).join(', ')}]`,
);

const declaredKeys = (models[0]?.credentialFields ?? []).map((f) => f.key);
if (declaredKeys.length === 0) {
  skip('POST /credentials with a blank value → 400 CREDENTIALS_EMPTY', 'the active profile declares no field');
} else {
  const blank = await refusal(() => client.setCredentials({ [declaredKeys[0]]: '   ' }));
  check(
    'POST /credentials with a blank value → 400 CREDENTIALS_EMPTY',
    blank?.code === 'CREDENTIALS_EMPTY' && blank.status === 400,
    `${blank?.status} ${blank?.code} key=${blank?.details.key}`,
  );
}

const errorEnvelope = unknownKey !== null && typeof unknownKey.type === 'string' && typeof unknownKey.retryable === 'boolean';
check('errors arrive as the uniform envelope → typed ApiError', errorEnvelope, `type=${unknownKey?.type} retryable=${unknownKey?.retryable}`);

// ---- signIn refuses a profile this process cannot serve, before writing anything ----------------
const baseConfig = {
  userId: who.userId,
  modelId: active,
  credentials: {},
  skills: skills.slice(0, 2).map((name) => ({ name, path: `./skills/${name}` })),
  effort: 'medium',
};

calls.length = 0;
const notActive = await refusal(() => client.signIn({ ...baseConfig, modelId: `${active}-not-served` }));
check(
  'signIn() with a non-active model → ApiError MODEL_NOT_ACTIVE (ADR-024 §2)',
  notActive?.code === 'MODEL_NOT_ACTIVE',
  `requested=${notActive?.details.requested} active=${notActive?.details.active}`,
);
check(
  'that refusal wrote nothing: no POST at all before it',
  calls.every((c) => c.startsWith('GET ')),
  `calls=[${calls.join(' | ')}]`,
);

// ---- signIn with an empty credentials map skips POST /credentials -------------------------------
calls.length = 0;
sessionBodies.length = 0;
const openSnapshot = await client.signIn(baseConfig);
check(
  'signIn() with an empty credentials map skips POST /credentials',
  !calls.includes('POST /credentials'),
  `calls=[${calls.join(' | ')}]`,
);
check(
  'signIn() → a session, read back through GET /snapshot',
  typeof openSnapshot.conversationId === 'string' && openSnapshot.conversationId !== '',
  `session=${openSnapshot.conversationId} status=${openSnapshot.status}`,
);
check(
  'snapshot carries the budget counters of §6.3',
  typeof openSnapshot.budget.maxCycles === 'number' && typeof openSnapshot.budget.usedCycles === 'number',
  `cycles=${openSnapshot.budget.usedCycles}/${openSnapshot.budget.maxCycles} plans=${openSnapshot.budget.usedPlans}/${openSnapshot.budget.maxPlans}`,
);

// ---- the session is opened without a word, and nothing is posted to the model (ADR-028 §1) -------
const openBody = sessionBodies[0] ?? { keys: [], userId: null };
check(
  'POST /sessions carries no goal and no user_message (G-4 closed)',
  !openBody.keys.includes('goal') && !openBody.keys.includes('user_message'),
  `body=[${openBody.keys.join(', ')}]`,
);
check(
  'a session opened that way is READY, with no conversation and no cycle',
  openSnapshot.status === 'READY' && openSnapshot.currentCycleId === null && openSnapshot.currentPlan === null,
  `status=${openSnapshot.status} cycle=${openSnapshot.currentCycleId} plan=${openSnapshot.currentPlan}`,
);
check(
  'it burns nothing of the budget: no cycle, no plan',
  openSnapshot.budget.usedCycles === 0 && openSnapshot.budget.usedPlans === 0,
  `cycles=${openSnapshot.budget.usedCycles}/${openSnapshot.budget.maxCycles} plans=${openSnapshot.budget.usedPlans}/${openSnapshot.budget.maxPlans}`,
);

const openChat = await (await fetch(`${BASE}/sessions/${encodeURIComponent(openSnapshot.conversationId)}/chat`)).json();
check(
  'no user_request was invented: the conversation is empty',
  Array.isArray(openChat.messages) && openChat.messages.length === 0,
  `${openChat.messages?.length ?? '?'} turn(s)`,
);

const openTimeline = await client.listHistoryEvents(openSnapshot.conversationId);
check(
  'its whole audited timeline is the creation, and nothing else',
  openTimeline.length === 1 && openTimeline[0].type === 'session.created',
  `[${openTimeline.map((e) => e.type).join(', ')}]`,
);

// ---- user_id travels, so History and Sign in name the same user (ADR-028 §2) ---------------------
check(
  'POST /sessions carries config.userId as user_id',
  openBody.userId === who.userId,
  `posted=${openBody.userId} whoami=${who.userId}`,
);
const openRow = (await client.listHistorySessions()).find((row) => row.id === openSnapshot.conversationId);
check(
  'the history row of that session reports the same user as GET /whoami',
  openRow !== undefined && openRow.userId === who.userId,
  `history=${openRow?.userId} whoami=${who.userId}`,
);

// ---- signIn with credentials posts them BEFORE creating the session -----------------------------
calls.length = 0;
sessionBodies.length = 0;

const credentials = declaredKeys.length > 0 ? Object.fromEntries(declaredKeys.map((k) => [k, SENTINEL])) : {};
const snapshot = await client.signIn({ ...baseConfig, credentials });

if (declaredKeys.length === 0) {
  skip('POST /credentials before POST /sessions', 'the active profile declares no field');
} else {
  const credentialsAt = calls.indexOf('POST /credentials');
  const sessionsAt = calls.indexOf('POST /sessions');
  check(
    'signIn() posts the credentials map before creating the session',
    credentialsAt !== -1 && sessionsAt !== -1 && credentialsAt < sessionsAt,
    `calls=[${calls.join(' | ')}]`,
  );
}
check(
  'signIn() sends working_space, skills and effort on POST /sessions',
  calls.includes('POST /sessions'),
  `skills=[${baseConfig.skills.map((s) => s.name).join(', ') || '—'}] effort=${baseConfig.effort}`,
);

// ---- the first real message is what opens the first cycle (ADR-028 §1) ---------------------------
const beforeFirst = await probe.getSession(snapshot.conversationId);
check(
  'the session waits READY until the user says something',
  beforeFirst.status === 'READY' && beforeFirst.budget.usedCycles === 0,
  `status=${beforeFirst.status} cycles=${beforeFirst.budget.usedCycles}`,
);

const seenStates = new Set();
const busyErrors = [];

// Poll the history while that first message runs: that is where a raw session state shows up.
let polling = true;
const poller = (async () => {
  while (polling) {
    try {
      const rows = await probe.listHistorySessions();
      for (const row of rows) seenStates.add(row.state);
      const running = rows.find((r) => r.state === 'RUNNING');
      if (running && busyErrors.length === 0) {
        const busy = await refusal(() => probe.sendMessage(running.id, 'while the loop owns it'));
        if (busy) busyErrors.push(busy);
      }
    } catch {
      // the store moves under the poll; the next turn reads it again
    }
  }
})();

const firstTurn = await client.sendMessage(snapshot.conversationId, 'the first thing the user actually typed');
const afterFirst = await settle(snapshot.conversationId);
polling = false;
await poller;

check(
  'the first sendMessage() opens the first cycle',
  (await probe.getSession(snapshot.conversationId)).budget.usedCycles >= 1,
  `turn=${firstTurn.role} settled=${afterFirst} cycles=${(await probe.getSession(snapshot.conversationId)).budget.usedCycles}`,
);

// ---- the session states a history row really reports --------------------------------------------
check(
  'listHistorySessions() reports raw session states, RUNNING included (G-6)',
  seenStates.has('RUNNING'),
  `seen=[${[...seenStates].sort().join(', ')}]`,
);
if (busyErrors.length === 0) {
  skip('sendMessage() while the loop owns the session → 409 SESSION_BUSY', 'the session never stayed RUNNING long enough');
} else {
  check(
    'sendMessage() while the loop owns the session → 409 SESSION_BUSY (§7.3)',
    busyErrors[0].isSessionBusy && busyErrors[0].status === 409,
    `${busyErrors[0].status} ${busyErrors[0].code}`,
  );
}

// ---- skills and effort reached the trace --------------------------------------------------------
const settled = await settle(snapshot.conversationId);
check('the session hands itself back once its loop is done', SETTLED.includes(settled), `status=${settled}`);

const timeline = await client.listHistoryEvents(snapshot.conversationId);
check(
  'listHistoryEvents() — the audited timeline, newest first',
  timeline.length > 0 && timeline[0].ts >= timeline[timeline.length - 1].ts,
  `${timeline.length} events, newest=${timeline[0]?.type}`,
);
check(
  'session.created is in that timeline (skills and effort are traced there, ADR-027 §4)',
  timeline.some((e) => e.type === 'session.created'),
);
check(
  'message bodies joined onto the timeline (G-10)',
  timeline.some((e) => e.messageIn !== undefined || e.messageOut !== undefined),
  `${timeline.filter((e) => e.messageIn || e.messageOut).length} events carry a body`,
);

// ---- the live stream ----------------------------------------------------------------------------
sseFrames = 0;
const updates = [];
const turns = [];
const stopSession = client.subscribeSession(snapshot.conversationId, (s) => updates.push(s));
const stopMessages = client.subscribeMessages(snapshot.conversationId, (m) => turns.push(m));
await sleep(300);
const echoed = await client.sendMessage(snapshot.conversationId, 'a follow-up from smoke-http');
await settle(snapshot.conversationId);
await sleep(300);

check('sendMessage() gives the turn back, read from GET /chat (G-7)', echoed.role === 'user' && echoed.text === 'a follow-up from smoke-http', `id=${echoed.id}`);
check('subscribeSession() delivers snapshots', updates.length > 0, `${updates.length} update(s), last status=${updates[updates.length - 1]?.status}`);
check('subscribeMessages() replays the stored turns and then the new ones (G-11)', turns.length > 1, `${turns.length} turn(s), roles=[${[...new Set(turns.map((t) => t.role))].join(', ')}]`);
check('the SSE stream really carried frames (§5.2)', sseFrames > 0, `${sseFrames} frame(s) on the injected EventSource`);

stopSession();
stopMessages();
const framesAtStop = sseFrames;
await sleep(300);
check('unsubscribing closes the stream', sseFrames === framesAtStop, `${sseFrames} frame(s), unchanged after unsubscribe`);

// ---- interruption ----------------------------------------------------------------------------------
// Stop is only interesting while there is something to stop, so a message is fired first and left
// running: `POST /interrupt` answers once the session has reached READY (§3.7).
const inFlight = probe.sendMessage(snapshot.conversationId, 'something to stop').catch(() => null);
await sleep(60);
const interrupted = await client.interrupt(snapshot.conversationId);
await inFlight;
if (interrupted.status === 'READY') {
  check('interrupt() → the session is READY again (§3.7)', true, `status=${interrupted.status}`);
} else {
  skip('interrupt() → the session is READY again (§3.7)', `the loop was already done: nothing to interrupt, status=${interrupted.status}`);
}

const paused = await client.pauseReason(snapshot.conversationId);
check('pauseReason() → null when the session is not paused (404 NOT_PAUSED)', paused === null);

// ---- the three administration views ---------------------------------------------------------------
const sessionRows = await client.listLiveDb('sessions');
const eventRows = await client.listLiveDb('events');
const auditRows = await client.listLiveDb('audit');
check(
  'listLiveDb("sessions") → rows the Live database screen can render',
  sessionRows.length > 0 && typeof sessionRows[0].id === 'string' && typeof sessionRows[0].state === 'string',
  `${sessionRows.length} row(s), first state=${sessionRows[0]?.state}`,
);
check('listLiveDb("events") → {id, type, ts}', eventRows.length > 0 && eventRows[0].type !== '', `${eventRows.length} row(s)`);
check('listLiveDb("audit") → {eventType, prevHash, hash, ts}', auditRows.length > 0 && auditRows[0].hash !== '', `${auditRows.length} row(s)`);

const chain = await client.listAudit();
check(
  'listAudit() → every entry carries its two hashes',
  chain.length > 0 && chain.every((e) => e.id !== '' && e.hash !== '' && e.prevHash !== ''),
  `${chain.length} entries`,
);
skip(
  'listAudit() → verify the chain end to end',
  'AuditEntry carries neither session id nor sequence, and the chain is per session (each seeded at 0×64): the front cannot regroup GET /admin/audit to check it',
);

const history = await client.listHistorySessions();
check('listHistorySessions() contains the session that was opened', history.some((s) => s.id === snapshot.conversationId), `${history.length} session(s)`);

// ---- the destructive route stays shut ---------------------------------------------------------------
const cleared = await refusal(() => client.clearDatabase());
if (cleared === null) {
  skip('clearDatabase() → 403 ADMIN_DISABLED', 'api.allow_destructive_admin is open — the database was NOT cleared by this run');
} else {
  check('clearDatabase() → 403 ADMIN_DISABLED while the guard is closed (§3.13)', cleared.code === 'ADMIN_DISABLED' && cleared.status === 403, `${cleared.status} ${cleared.code}`);
}

// ---- 401 → pause → credentials → resume (§7.2, ADR-025) ------------------------------------------
// The local API never answers 401 itself; what is driven here is a real refusal by the *model*,
// obtained by handing the transport a token the mock model rejects. Nothing is simulated.
if (declaredKeys.length === 0) {
  skip('a 401 from the model pauses the session (§7.2)', 'the active profile declares no credential field');
} else {
  await client.setCredentials({ [declaredKeys[0]]: WRONG_SENTINEL });
  const pausedSession = await client.signIn({ ...baseConfig, credentials: {} });
  await client.sendMessage(pausedSession.conversationId, 'this one meets a model that refuses');
  const reason = await waitForPause(pausedSession.conversationId);
  const pausedSnapshot = await probe.getSession(pausedSession.conversationId);

  if (reason === null) {
    skip(
      'a 401 from the model pauses the session (§7.2)',
      `the model never refused the call — start the mock model with a scenario carrying a token; status=${pausedSnapshot.status}`,
    );
    skip('pauseReason() → reason, error_code, operation, since', 'no pause to read');
    skip('resume() with a token still wrong pauses again (ADR-025 §5)', 'no pause to resume');
    skip('setCredentials() then resume() continues the session', 'no pause to resume');
  } else {
    check(
      'a 401 from the model pauses the session instead of failing it (§7.2)',
      pausedSnapshot.status === 'PAUSED',
      `status=${pausedSnapshot.status}`,
    );
    check(
      'pauseReason() → reason, error_code, error_type, operation, since — and no token',
      reason.reason === 'credentials_required' && reason.errorCode !== '' && reason.operation !== '' && reason.since !== '' &&
        !JSON.stringify(reason).includes(WRONG_SENTINEL),
      `reason=${reason.reason} code=${reason.errorCode} type=${reason.errorType} operation=${reason.operation}`,
    );
    check(
      'the paused session keeps the turn that triggered it',
      (await client.listHistoryEvents(pausedSession.conversationId)).some((e) => e.type === 'session.paused'),
      'session.paused is in its audited timeline',
    );

    // Resuming without fixing anything is a retry, not a failure: it pauses again, indefinitely.
    await client.setCredentials({ [declaredKeys[0]]: WRONG_SENTINEL });
    await client.resume(pausedSession.conversationId).catch(() => null);
    const again = await waitForPause(pausedSession.conversationId, reason.since);
    check(
      'resume() with a token still wrong pauses again, unbounded (ADR-025 §5)',
      again !== null && again.since !== reason.since,
      again === null ? 'the session did not pause a second time' : `paused again at ${again.since}`,
    );

    // The gesture the owner asked for: post the credentials, then resume. Two calls, in that order.
    calls.length = 0;
    await client.setCredentials(Object.fromEntries(declaredKeys.map((k) => [k, SENTINEL])));
    await client.resume(pausedSession.conversationId);
    const resumedStatus = await waitUntilResumed(pausedSession.conversationId);
    check(
      'setCredentials() then resume() continues the session — POST /credentials before POST /resume',
      calls.indexOf('POST /credentials') === 0 && calls.some((c) => c.endsWith('/resume')) &&
        calls.indexOf('POST /credentials') < calls.findIndex((c) => c.endsWith('/resume')),
      `calls=[${calls.join(' | ')}]`,
    );
    check(
      'the resumed session is no longer paused',
      resumedStatus !== 'PAUSED',
      `status=${resumedStatus}`,
    );
    await settle(pausedSession.conversationId);
    check(
      'pauseReason() answers null again once it has resumed (404 NOT_PAUSED)',
      (await client.pauseReason(pausedSession.conversationId)) === null,
    );
  }
}

// ---- cancellation ------------------------------------------------------------------------------------
const controller = new AbortController();
controller.abort();
let aborted = false;
try {
  await client.listModels(controller.signal);
} catch (error) {
  aborted = error?.name === 'AbortError';
}
check('an aborted read rejects with AbortError, not with an ApiError', aborted);

// ---- the one property this script exists to guarantee --------------------------------------------------
const leaked = transcript.filter((l) => l.includes(SENTINEL) || l.includes(WRONG_SENTINEL));
check('no credential value was printed', leaked.length === 0, leaked.length === 0 ? 'transcript clean' : `${leaked.length} line(s) leaked a value`);

summarise();
process.exit(failed === 0 ? 0 : 1);
