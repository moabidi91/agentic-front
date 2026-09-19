import type { ApiClient } from './ApiClient';
import type {
  AuditEntry,
  ChatMessage,
  HistoryEvent,
  HistorySession,
  LiveDbTable,
  ModelOption,
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
  { id: 'generic-http', name: 'Generic HTTP provider', provider: 'generic_http', codec: 'json_text', requiresCredentials: true },
  { id: 'templated-acme', name: 'Acme templated endpoint', provider: 'templated_http', codec: 'tool_call', requiresCredentials: true },
];

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

  async whoAmI(): Promise<WhoAmI> {
    await delay(250);
    return { userId: 'hama.local' };
  }

  async listModels(): Promise<ModelOption[]> {
    await delay(350);
    return MOCK_MODELS;
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
    this.logEvent(conversationId, 'session_created', `user_id=${config.userId} model=${config.modelId} effort=${config.effort}`);
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
    this.update(conversationId, { status: 'INTERRUPTED', currentPlan: snapshot.currentPlan ? { ...snapshot.currentPlan, status: 'INTERRUPTED' } : null });
    await delay(300);
    this.update(conversationId, { status: 'READY', currentCycleId: null, cycleType: null });
    this.queuedText.delete(conversationId);
    return this.sessions.get(conversationId)!;
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
    this.auditChain = [];
  }

  async listAudit(): Promise<AuditEntry[]> {
    await delay(250);
    return this.auditChain;
  }

  // ---- internals ----

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
