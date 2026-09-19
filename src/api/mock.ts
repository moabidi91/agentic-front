import type { ApiClient } from './ApiClient';
import type {
  AuditEntry,
  ChatMessage,
  HistoryEvent,
  HistorySession,
  LiveDbTable,
  ModelOption,
  PauseReason,
  PlanTask,
  SessionSnapshot,
  SignInConfig,
  WhoAmI,
} from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

const MOCK_MODELS: ModelOption[] = [
  { id: 'local-fake', name: 'Local mock model', provider: 'fake', codec: 'json_text', requiresCredentials: false },
  // No `credentialFields` here on purpose — exercises the backward-compat fallback
  // (requiresCredentials: true ⇒ a single implicit, secret "Access token" field).
  { id: 'generic-http', name: 'Generic HTTP provider', provider: 'generic_http', codec: 'json_text', requiresCredentials: true },
  // Demonstrates a model needing more than just a token — an access token (secret,
  // never persisted) plus a Chat ID (not secret, gets remembered like the rest of
  // the setup). See api/credentials.ts and contrat-interface.md §2.
  {
    id: 'templated-acme',
    name: 'Acme templated endpoint',
    provider: 'templated_http',
    codec: 'tool_call',
    requiresCredentials: true,
    credentialFields: [
      { key: 'access_token', label: 'Access token', placeholder: 'Paste an access token', secret: true },
      { key: 'chat_id', label: 'Chat ID', placeholder: 'e.g. chat_8f3a21', secret: false },
    ],
  },
];

/** Default profile this in-memory process serves — the first card of the catalogue. */
const DEFAULT_ACTIVE_MODEL_ID = 'local-fake';

/**
 * Which profile this mock serves. **One at a time**, like a real process (ADR-024 §2): the other
 * cards of the catalogue are listed and shown disabled by the sign-in picker.
 *
 * `?model=<id>` on the page that loads the application picks another one — the mock's equivalent
 * of restarting with another `models.active`, and the only way to change it, on purpose. Read
 * **once**, when this module is loaded, because in-app navigation drops the query string; a new
 * profile therefore means reloading the page, exactly like a restart. Outside a browser (a Node
 * script importing this file) it is the default.
 */
const ACTIVE_MODEL_ID: string = (() => {
  try {
    const requested = new URLSearchParams(window.location.search).get('model');
    if (requested !== null && MOCK_MODELS.some((m) => m.id === requested)) return requested;
  } catch {
    // no DOM (Node), or a location a sandbox refuses to read — the default stands
  }
  return DEFAULT_ACTIVE_MODEL_ID;
})();

/**
 * The credential value that makes this mock behave like a model answering 401 — the one way to
 * reach the paused state without a backend, so the pause banner, the credential pop-in and the
 * resume gesture stay demoable (contrat-interface.md §13, ADR-025).
 *
 * Sign in with `expired` as the access token and send a message: the session pauses on
 * `credentials_required`, exactly as the application would. Supplying any other value in the
 * pop-in resumes it; supplying `expired` again pauses it again, which is what a wrong token
 * really does. {@link MockApiClient.pauseSession} does the same thing directly.
 */
export const MOCK_EXPIRED_TOKEN = 'expired';

const MOCK_SKILLS = ['release-checklist', 'db-migration-guide', 'incident-runbook', 'api-style-guide'];

function freshBudget() {
  return { maxCycles: 40, usedCycles: 0, maxPlans: 12, usedPlans: 0, maxTotalDurationMs: 30 * 60_000, usedDurationMs: 0 };
}

function freshSnapshot(conversationId: string): SessionSnapshot {
  return {
    conversationId,
    status: 'READY',
    currentCycleId: null,
    cycleType: null,
    retryCount: 0,
    cycleStartedAt: null,
    currentPlan: null,
    contextWindow: 'HEALTHY',
    budget: freshBudget(),
  };
}

function samplePlanTasks(topic: string): PlanTask[] {
  return [
    { taskId: rid('task'), summary: `Look up context relevant to "${topic}"`, status: 'COMPLETED', dependsOn: [] },
    { taskId: rid('task'), summary: 'Draft the response', status: 'RUNNING', dependsOn: [] },
    { taskId: rid('task'), summary: 'Validate against constraints', status: 'PENDING', dependsOn: [] },
  ];
}

/**
 * In-memory mock of the whole backend surface described in
 * agentic-front/contrat-interface.md. Simulates the conversation state
 * machine well enough for the UI to feel real (cycle progression, a plan
 * with tasks moving through RUNNING → COMPLETED, a live event/audit feed)
 * without needing agentic-local-app running.
 *
 * Swap this for a real HttpApiClient once the backend team confirms the
 * routes — screens only ever depend on the ApiClient interface.
 */
export class MockApiClient implements ApiClient {
  private sessions = new Map<string, SessionSnapshot>();
  private messages = new Map<string, ChatMessage[]>();
  private sessionListeners = new Map<string, Set<(s: SessionSnapshot) => void>>();
  private messageListeners = new Map<string, Set<(m: ChatMessage) => void>>();
  private events = new Map<string, ProtocolLogEntry[]>();
  private auditChain: AuditEntry[] = [];
  private queuedText = new Map<string, string | null>();
  private pauses = new Map<string, PauseReason>();
  /** The last credentials handed over, sign-in or pop-in — only to decide whether they expired. */
  private credentials: Record<string, string> = {};

  async whoAmI(): Promise<WhoAmI> {
    await delay(250);
    return { userId: 'hama.local' };
  }

  /** The catalogue, active profile first, exactly one of them active (ADR-024 §2). */
  async listModels(): Promise<ModelOption[]> {
    await delay(350);
    return MOCK_MODELS.map((model) => ({ ...model, active: model.id === ACTIVE_MODEL_ID })).sort(
      (a, b) => Number(b.active) - Number(a.active),
    );
  }

  async listKnownSkills(): Promise<string[]> {
    await delay(200);
    return MOCK_SKILLS;
  }

  async signIn(config: SignInConfig): Promise<SessionSnapshot> {
    await delay(600);
    const conversationId = rid('conv');
    const snapshot = freshSnapshot(conversationId);
    this.sessions.set(conversationId, snapshot);
    this.messages.set(conversationId, []);
    this.events.set(conversationId, []);
    this.credentials = { ...(config.credentials ?? {}) };
    const credentialKeys = Object.keys(config.credentials ?? {}).join(',') || 'none';
    this.logEvent(
      conversationId,
      'session_created',
      `user_id=${config.userId} model=${config.modelId} effort=${config.effort} credentials=${credentialKeys}`,
    );
    return snapshot;
  }

  async getSession(conversationId: string): Promise<SessionSnapshot> {
    const snapshot = this.sessions.get(conversationId);
    if (!snapshot) throw new Error(`Unknown conversation ${conversationId}`);
    return snapshot;
  }

  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    const snapshot = this.sessions.get(conversationId);
    if (!snapshot) throw new Error(`Unknown conversation ${conversationId}`);
    // A paused session is continued by resume(), never by a message — the real route refuses it
    // with 409 CONFLICT (contrat front/backend §3.6).
    if (snapshot.status === 'PAUSED') throw new Error('Session is paused — provide credentials and resume');

    // The model refuses the very first call when the token handed over has expired: the session
    // pauses, keeping the message that triggered it (ADR-025).
    if (this.hasExpiredCredentials()) {
      const userMessage: ChatMessage = { id: rid('msg'), role: 'user', text, createdAt: now() };
      this.pushMessage(conversationId, userMessage);
      this.pauseSession(conversationId, 'POST');
      return userMessage;
    }

    const isBusy = snapshot.status !== 'READY' && snapshot.status !== 'NEW';
    const userMessage: ChatMessage = {
      id: rid('msg'),
      role: 'user',
      text,
      createdAt: now(),
      queued: isBusy,
    };
    this.pushMessage(conversationId, userMessage);

    if (isBusy) {
      // §7 — no confirmed backend contract yet; mock behaviour (a) queue-and-apply-later.
      this.queuedText.set(conversationId, text);
      this.logEvent(conversationId, 'user_request_queued', 'queued — will apply once current cycle finishes');
      return userMessage;
    }

    this.runCycle(conversationId, text);
    return userMessage;
  }

  async interrupt(conversationId: string): Promise<SessionSnapshot> {
    const snapshot = this.sessions.get(conversationId);
    if (!snapshot) throw new Error(`Unknown conversation ${conversationId}`);
    this.logEvent(conversationId, 'user_interrupt', `from ${snapshot.status}`);
    // Accepted in every state, paused included — that is what keeps the blocked send button
    // acceptable: Stop is never conditional (§7.3).
    this.pauses.delete(conversationId);
    this.update(conversationId, { status: 'INTERRUPTED', currentPlan: snapshot.currentPlan ? { ...snapshot.currentPlan, status: 'INTERRUPTED' } : null });
    await delay(300);
    this.update(conversationId, { status: 'READY', currentCycleId: null, cycleType: null });
    this.queuedText.delete(conversationId);
    return this.sessions.get(conversationId)!;
  }

  /** §13 — why the session is paused, or `null` when it is not (the route answers 404 NOT_PAUSED). */
  async pauseReason(conversationId: string): Promise<PauseReason | null> {
    await delay(120);
    return this.pauses.get(conversationId) ?? null;
  }

  /**
   * §13 — the credentials of the active profile, as `POST /credentials` takes them. Nothing here
   * keeps them beyond deciding whether they are the expired sentinel; no screen reads them back.
   */
  async setCredentials(credentials: Record<string, string>): Promise<void> {
    await delay(200);
    if (Object.keys(credentials).length === 0) throw new Error('No credential was posted');
    this.credentials = { ...this.credentials, ...credentials };
  }

  /**
   * §13 — continues a paused session where it stopped. Resuming with a token that is still the
   * expired one pauses it again, indefinitely and without bound: a retry, not a failure
   * (ADR-025 §5).
   */
  async resume(conversationId: string): Promise<SessionSnapshot> {
    const snapshot = this.sessions.get(conversationId);
    if (!snapshot) throw new Error(`Unknown conversation ${conversationId}`);
    if (snapshot.status !== 'PAUSED') throw new Error(`Session ${conversationId} is not resumable`);
    await delay(300);
    this.logEvent(conversationId, 'session_resumed', 'credentials provided');
    this.pauses.delete(conversationId);
    this.update(conversationId, { status: 'READY' });
    if (this.hasExpiredCredentials()) {
      this.pauseSession(conversationId, 'POST');
      return this.sessions.get(conversationId)!;
    }
    // The message the pause was holding is replayed, exactly as the loop would have.
    const pending = this.messages.get(conversationId)?.filter((m) => m.role === 'user').at(-1);
    if (pending) this.runCycle(conversationId, pending.text);
    return this.sessions.get(conversationId)!;
  }

  /**
   * Puts a session in the paused state the way a 401 from the model does, so the pause banner,
   * the credential pop-in and the resume gesture are demoable without a backend. Signing in with
   * {@link MOCK_EXPIRED_TOKEN} reaches the same place through the screens.
   */
  pauseSession(conversationId: string, operation: 'INIT' | 'POST' | 'GET' = 'POST'): void {
    if (!this.sessions.has(conversationId)) return;
    this.pauses.set(conversationId, {
      reason: 'credentials_required',
      errorCode: 'HTTP_401',
      errorType: 'AUTHN_ERROR',
      operation,
      since: now(),
    });
    this.logEvent(conversationId, 'session_paused', `credentials_required on ${operation}`);
    this.update(conversationId, { status: 'PAUSED' });
  }

  subscribeSession(conversationId: string, onUpdate: (snapshot: SessionSnapshot) => void): () => void {
    if (!this.sessionListeners.has(conversationId)) this.sessionListeners.set(conversationId, new Set());
    const set = this.sessionListeners.get(conversationId)!;
    set.add(onUpdate);
    return () => set.delete(onUpdate);
  }

  subscribeMessages(conversationId: string, onMessage: (message: ChatMessage) => void): () => void {
    if (!this.messageListeners.has(conversationId)) this.messageListeners.set(conversationId, new Set());
    const set = this.messageListeners.get(conversationId)!;
    set.add(onMessage);
    return () => set.delete(onMessage);
  }

  async listHistorySessions(): Promise<HistorySession[]> {
    await delay(300);
    return Array.from(this.sessions.values())
      .map((s) => ({
        id: s.conversationId,
        state: s.status,
        createdAt: this.events.get(s.conversationId)?.[0]?.ts ?? now(),
        updatedAt: now(),
        userId: 'hama.local',
      }))
      .reverse();
  }

  async listHistoryEvents(sessionId: string): Promise<HistoryEvent[]> {
    await delay(250);
    const log = this.events.get(sessionId) ?? [];
    return log.map((e) => ({
      id: e.id,
      sessionId,
      type: e.type,
      ts: e.ts,
      messageIn: e.messageIn,
      messageOut: e.messageOut,
      auditEntryId: e.auditEntryId,
    }));
  }

  async listLiveDb(table: LiveDbTable): Promise<unknown[]> {
    await delay(300);
    if (table === 'sessions') return this.listHistorySessions();
    if (table === 'events') {
      return Array.from(this.events.values()).flat();
    }
    return this.auditChain;
  }

  async clearDatabase(): Promise<void> {
    await delay(500);
    this.sessions.clear();
    this.messages.clear();
    this.events.clear();
    this.pauses.clear();
    this.auditChain = [];
  }

  async listAudit(): Promise<AuditEntry[]> {
    await delay(250);
    return this.auditChain;
  }

  // ---- internals ----

  /** True when any value handed over is the expired sentinel — see {@link MOCK_EXPIRED_TOKEN}. */
  private hasExpiredCredentials(): boolean {
    return Object.values(this.credentials).some((value) => value.trim().toLowerCase() === MOCK_EXPIRED_TOKEN);
  }

  private pushMessage(conversationId: string, message: ChatMessage) {
    this.messages.get(conversationId)?.push(message);
    this.messageListeners.get(conversationId)?.forEach((fn) => fn(message));
  }

  private update(conversationId: string, patch: Partial<SessionSnapshot>) {
    const current = this.sessions.get(conversationId);
    if (!current) return;
    const next = { ...current, ...patch };
    this.sessions.set(conversationId, next);
    this.sessionListeners.get(conversationId)?.forEach((fn) => fn(next));
  }

  private logEvent(conversationId: string, type: string, detail: string, extra?: Partial<ProtocolLogEntry>) {
    const prevHash = this.auditChain.at(-1)?.hash ?? '0'.repeat(8);
    const hash = Math.random().toString(16).slice(2, 10);
    const auditEntry: AuditEntry = { id: rid('audit'), eventType: type, ts: now(), prevHash, hash };
    this.auditChain.push(auditEntry);
    const entry: ProtocolLogEntry = { id: rid('evt'), ts: now(), type, detail, auditEntryId: auditEntry.id, ...extra };
    if (!this.events.has(conversationId)) this.events.set(conversationId, []);
    this.events.get(conversationId)!.push(entry);
  }

  /** Simulates NEW/READY → ACTIVE → WAITING_MODEL_RESPONSE → RUNNING_PLAN → READY, with a 3-task plan. */
  private async runCycle(conversationId: string, userText: string) {
    const cycleId = rid('cycle');
    this.logEvent(conversationId, 'user_request', 'received', { messageIn: userText });
    this.update(conversationId, {
      status: 'ACTIVE',
      currentCycleId: cycleId,
      cycleType: 'execution',
      cycleStartedAt: now(),
    });

    await delay(500);
    if (this.sessions.get(conversationId)?.status !== 'ACTIVE') return; // interrupted
    this.update(conversationId, { status: 'WAITING_MODEL_RESPONSE' });
    this.logEvent(conversationId, 'model_call', 'waiting for model response');

    await delay(700);
    if (this.sessions.get(conversationId)?.status !== 'WAITING_MODEL_RESPONSE') return;

    const tasks = samplePlanTasks(userText);
    const plan = { planId: rid('plan'), status: 'RUNNING' as const, tasks };
    this.update(conversationId, { status: 'RUNNING_PLAN', currentPlan: plan });
    this.logEvent(conversationId, 'plan_received', `${tasks.length} tasks`);

    for (let i = 0; i < tasks.length; i++) {
      await delay(500);
      const snapshot = this.sessions.get(conversationId);
      if (!snapshot || snapshot.status !== 'RUNNING_PLAN') return; // interrupted mid-plan
      const updatedTasks = snapshot.currentPlan!.tasks.map((t, idx) =>
        idx < i ? { ...t, status: 'COMPLETED' as const } : idx === i ? { ...t, status: 'RUNNING' as const } : t,
      );
      this.update(conversationId, { currentPlan: { ...snapshot.currentPlan!, tasks: updatedTasks } });
      this.logEvent(conversationId, 'task_progress', `${tasks[i].summary} → RUNNING`);
    }

    await delay(400);
    const finalSnapshot = this.sessions.get(conversationId);
    if (!finalSnapshot || finalSnapshot.status !== 'RUNNING_PLAN') return;
    const completedTasks = finalSnapshot.currentPlan!.tasks.map((t) => ({ ...t, status: 'COMPLETED' as const }));
    this.update(conversationId, {
      status: 'READY',
      currentPlan: { ...finalSnapshot.currentPlan!, status: 'COMPLETED', tasks: completedTasks },
      budget: { ...finalSnapshot.budget, usedCycles: finalSnapshot.budget.usedCycles + 1, usedPlans: finalSnapshot.budget.usedPlans + 1 },
    });

    const replyText = `Done — I ran ${completedTasks.length} tasks to handle "${userText.slice(0, 60)}${userText.length > 60 ? '…' : ''}". See Debug for the full trace.`;
    const assistantMessage: ChatMessage = {
      id: rid('msg'),
      role: 'assistant',
      text: replyText,
      createdAt: now(),
      planSummary: `${completedTasks.length} tasks completed`,
    };
    this.pushMessage(conversationId, assistantMessage);
    this.logEvent(conversationId, 'final_response', replyText, { messageOut: replyText });

    const queued = this.queuedText.get(conversationId);
    if (queued) {
      this.queuedText.delete(conversationId);
      this.runCycle(conversationId, queued);
    }
  }
}

interface ProtocolLogEntry {
  id: string;
  ts: string;
  type: string;
  detail: string;
  messageIn?: string;
  messageOut?: string;
  auditEntryId?: string;
}
