/**
 * Shared domain types.
 *
 * These mirror agentic-local-app/spec-v1.1.md (§4.1, §5.1-5.4, §12.2) and the
 * needs listed in agentic-front/contrat-interface.md. Anything marked
 * "besoin backend" in that document is speculative until confirmed — keep
 * these types easy to adjust once the real API is validated route by route.
 */

// ---- §5.1 Conversation state machine (11 states) ----
// The last three are session-level states, not conversation ones: the backend
// reports them verbatim on a session row (GET /admin/sessions → HistorySession.state),
// so this union has to hold them or a history row has to lie about what it read.
export type ConversationStatus =
  | 'NEW'
  | 'ACTIVE'
  | 'WAITING_MODEL_RESPONSE'
  | 'RUNNING_PLAN'
  | 'ROTATING'
  | 'WAITING_USER'
  | 'INTERRUPTED'
  | 'READY'
  | 'COMPLETED'
  | 'FAILED'
  | 'CLOSED'
  /** Session stopped on a 401, waiting for credentials; not terminal — ADR-025 §2. */
  | 'PAUSED'
  /** Session owned by its loop — session state machine, ADR-007 (`READY → RUNNING`). */
  | 'RUNNING'
  /** Interruption cleanup in flight, before READY — session state machine, ADR-007. */
  | 'INTERRUPTING';

// ---- §5.2 Plan state machine ----
export type PlanStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'STOPPED_ON_FAILURE'
  | 'SHORT_CIRCUITED_ON_SUCCESS'
  | 'INTERRUPTED'
  | 'FAILED';

// ---- §5.3 Task state machine ----
export type TaskStatus =
  | 'PENDING'
  | 'WAITING_DEPENDENCY'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'INTERRUPTED';

// ---- §5.4 Context window state machine ----
export type ContextWindowStatus = 'HEALTHY' | 'WARNING' | 'SATURATED';

export type CycleType = 'discovery' | 'execution' | 'clarification' | 'resume';

export type EffortLevel = 'low' | 'medium' | 'high';

export interface SessionBudget {
  maxCycles: number;
  usedCycles: number;
  maxPlans: number;
  usedPlans: number;
  maxTotalDurationMs: number;
  usedDurationMs: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  codec: string;
  /**
   * Kept for backward compatibility with a backend that hasn't adopted
   * `credentialFields` yet — true is treated as a single implicit, secret
   * "Access token" field (see api/credentials.ts). Prefer `credentialFields`
   * for anything with more than one field, or a non-secret one.
   */
  requiresCredentials: boolean;
  /** Fields this model needs at sign-in, beyond the user id — absent/empty means none. */
  credentialFields?: CredentialField[];
  /**
   * Whether this profile is the one the running backend serves. One model per
   * process (ADR-024 §2): only the active profile can open a session, and
   * choosing another means restarting the application. `GET /models` marks it
   * and puts it first; the sign-in picker shows the others disabled rather than
   * letting the user discover the refusal at the last click.
   *
   * Optional: a backend that does not report it leaves every card selectable,
   * which is the behaviour the app had before the flag existed.
   */
  active?: boolean;
}

/**
 * Why a session is paused, as `GET /sessions/{sid}/pause` returns it — the
 * backend pauses a session on a 401 from the model instead of failing it
 * (ADR-025, contrat-interface.md §13), and these five fields are everything a
 * banner needs to say what happened. Nothing of the token is in here.
 */
export interface PauseReason {
  /** `credentials_required` today — the only reason the backend pauses on. */
  reason: string;
  /** Error code of the refused call, e.g. `HTTP_401`. */
  errorCode: string;
  /** Error family, `AUTHN_ERROR` for a 401. */
  errorType: string;
  /** The remote operation that was refused: `INIT`, `POST` or `GET`. */
  operation: string;
  /** ISO 8601 instant the session was paused. */
  since: string;
}

/**
 * One field a model needs at sign-in — the access token, but also anything
 * else a specific provider requires (a chat/thread id, an org slug, …).
 * Declared per model (ModelOption.credentialFields) so the front never
 * guesses or hardcodes a provider's shape — see contrat-interface.md §2.
 */
export interface CredentialField {
  /** Used as the key in SignInConfig.credentials, and (if non-secret) in the saved sign-in prefs file. */
  key: string;
  label: string;
  placeholder?: string;
  /**
   * Whether this value is sensitive. Defaults to true (secret) when omitted
   * — fail closed. Only a field explicitly marked `secret: false` is ever
   * written to the local sign-in prefs file (session/signInPrefs.ts); an
   * access token stays secret and is never persisted regardless.
   */
  secret?: boolean;
}

export interface SkillRef {
  name: string;
  path: string;
}

/**
 * A locally-loaded prompt template — name plus its full .md content, read
 * client-side from a folder the user picks at sign-in. Powers the "/" picker
 * in Chat (insert a saved prompt into the composer). Front-only: unlike
 * SkillRef this is never sent to the backend, so it isn't part of
 * SignInConfig below.
 */
export interface PromptRef {
  name: string;
  content: string;
}

export interface WhoAmI {
  userId: string;
}

export interface SignInConfig {
  userId: string;
  modelId: string;
  /** Keyed by CredentialField.key (e.g. "access_token", "chat_id") — replaces a single accessToken field. */
  credentials?: Record<string, string>;
  workingSpace?: string;
  skills: SkillRef[];
  effort: EffortLevel;
  sessionBudget?: Partial<SessionBudget>;
}

export interface PlanTask {
  taskId: string;
  summary: string;
  status: TaskStatus;
  dependsOn: string[];
  error?: string;
}

export interface Plan {
  planId: string;
  status: PlanStatus;
  tasks: PlanTask[];
}

export interface SessionSnapshot {
  conversationId: string;
  status: ConversationStatus;
  currentCycleId: string | null;
  cycleType: CycleType | null;
  retryCount: number;
  cycleStartedAt: string | null;
  currentPlan: Plan | null;
  contextWindow: ContextWindowStatus;
  budget: SessionBudget;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  planSummary?: string;
  queued?: boolean;
}

export interface ProtocolEvent {
  id: string;
  ts: string;
  type: string;
  detail: string;
}

export interface AuditEntry {
  id: string;
  eventType: string;
  ts: string;
  prevHash: string;
  hash: string;
}

export interface HistorySession {
  id: string;
  state: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface HistoryEvent {
  id: string;
  sessionId: string;
  type: string;
  ts: string;
  messageIn?: string;
  messageOut?: string;
  auditEntryId?: string;
}

export type LiveDbTable = 'sessions' | 'events' | 'audit';
