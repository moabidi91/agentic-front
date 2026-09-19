/**
 * Reference content for StateMachineScreen — ported from spec-v1.1.md §5.1-5.4
 * via the approved StateMachine.dc.html mockup. Static by design (no live
 * data except the side panel) — keep this in sync if the backend spec
 * changes; the screen itself never mutates anything.
 */

export interface Transition {
  from: string;
  to: string;
}

export interface Branch {
  path: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'danger';
}

export const CONVERSATION_HAPPY_PATH = ['NEW', 'ACTIVE', 'WAITING_MODEL_RESPONSE', 'RUNNING_PLAN', 'COMPLETED', 'CLOSED'];

export const CONVERSATION_BRANCHES: Branch[] = [
  { path: 'RUNNING_PLAN → WAITING_MODEL_RESPONSE', detail: "The cycle loop — execution_result goes back, next plan or final_answer is awaited.", tone: 'neutral' },
  { path: 'RUNNING_PLAN → ROTATING → WAITING_MODEL_RESPONSE', detail: 'Context window saturated — a compact summary is sent, model ACKs, loop continues.', tone: 'neutral' },
  { path: 'COMPLETED → WAITING_USER → WAITING_MODEL_RESPONSE', detail: 'Unless closed, the conversation stays reusable — the next message continues it.', tone: 'neutral' },
  { path: 'ACTIVE / WAITING_MODEL_RESPONSE / RUNNING_PLAN / ROTATING → INTERRUPTED → READY → ACTIVE', detail: 'The user can interrupt at any instant from any active state — full cleanup, then ready for a new request.', tone: 'warning' },
];

export const CONVERSATION_FAILURE: Branch = {
  path: 'ANY STATE → FAILED',
  detail: 'An unrecoverable error can be raised from anywhere — always classified (see error taxonomy) and surfaced, never silent.',
  tone: 'danger',
};

export const CONVERSATION_TRANSITIONS: Transition[] = [
  { from: 'NEW', to: 'ACTIVE' },
  { from: 'ACTIVE', to: 'WAITING_MODEL_RESPONSE' },
  { from: 'WAITING_MODEL_RESPONSE', to: 'RUNNING_PLAN' },
  { from: 'WAITING_MODEL_RESPONSE', to: 'COMPLETED' },
  { from: 'RUNNING_PLAN', to: 'WAITING_MODEL_RESPONSE' },
  { from: 'RUNNING_PLAN', to: 'ROTATING' },
  { from: 'ROTATING', to: 'WAITING_MODEL_RESPONSE' },
  { from: 'ANY', to: 'FAILED' },
  { from: 'ACTIVE · WAITING_MODEL_RESPONSE · RUNNING_PLAN · ROTATING', to: 'INTERRUPTED' },
  { from: 'INTERRUPTED', to: 'READY (after full cleanup + persistence)' },
  { from: 'READY', to: 'ACTIVE (on new user request)' },
  { from: 'COMPLETED', to: 'WAITING_USER' },
  { from: 'WAITING_USER', to: 'WAITING_MODEL_RESPONSE' },
  { from: 'COMPLETED', to: 'CLOSED' },
];

export const PLAN_BRANCHES: Branch[] = [
  { path: 'RUNNING → COMPLETED', detail: 'All tasks finished without a stop condition.', tone: 'neutral' },
  { path: 'RUNNING → STOPPED_ON_FAILURE', detail: 'A critical or stop_plan_on_failure task failed.', tone: 'danger' },
  { path: 'RUNNING → SHORT_CIRCUITED_ON_SUCCESS', detail: 'A stop_plan_on_success task succeeded — remaining tasks cancelled.', tone: 'neutral' },
  { path: 'RUNNING → INTERRUPTED', detail: 'User interrupt signal received during execution.', tone: 'warning' },
  { path: 'RUNNING → FAILED', detail: 'Unrecoverable failure during execution — classified via the error taxonomy.', tone: 'danger' },
];

export const TASK_TRANSITIONS: Branch[] = [
  { path: '→ COMPLETED', detail: 'Exit 0, within limits.', tone: 'neutral' },
  { path: '→ FAILED', detail: 'Non-zero exit.', tone: 'danger' },
  { path: '→ TIMED_OUT', detail: 'Exceeded its time budget.', tone: 'neutral' },
  { path: '→ CANCELLED', detail: 'Stop condition hit in parallel mode.', tone: 'neutral' },
  { path: '→ INTERRUPTED', detail: 'From RUNNING, PENDING or WAITING_DEPENDENCY.', tone: 'warning' },
  { path: '→ SKIPPED', detail: 'From PENDING or WAITING_DEPENDENCY, after a stop condition.', tone: 'neutral' },
];

export const CYCLE_TYPES: { id: string; description: string }[] = [
  { id: 'discovery', description: 'first pass, gathering context' },
  { id: 'execution', description: 'carrying out the plan' },
  { id: 'clarification', description: 'asking the user a priority question' },
  { id: 'resume', description: 'continuing after a context rotation' },
];

export const CONTEXT_ROTATION_SEQUENCE =
  'Mark ROTATING → build a compact structured summary → validate it fits the size budget (fail explicitly if not) → create a new conversation → send context_resume_request → wait for context_resume_ack → mark HEALTHY again.';
