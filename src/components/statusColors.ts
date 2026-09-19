import type { ConversationStatus, PlanStatus, TaskStatus, ContextWindowStatus } from '../api/types';

export type StatusTone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger';

const TONE_VAR: Record<StatusTone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--surface-2)', fg: 'var(--text-2)' },
  info: { bg: 'var(--blue)22', fg: 'var(--blue)' },
  progress: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  success: { bg: 'var(--green-soft)', fg: 'var(--green)' },
  warning: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  danger: { bg: 'var(--red-soft)', fg: 'var(--red)' },
};

export function toneColors(tone: StatusTone) {
  return TONE_VAR[tone];
}

export function conversationTone(status: ConversationStatus): StatusTone {
  switch (status) {
    case 'NEW':
    case 'READY':
      return 'neutral';
    case 'ACTIVE':
    case 'WAITING_MODEL_RESPONSE':
    case 'RUNNING_PLAN':
    case 'ROTATING':
    // Session-level state of a stored row (HistorySession.state): the loop owns it.
    case 'RUNNING':
      return 'progress';
    case 'WAITING_USER':
      return 'info';
    case 'INTERRUPTED':
    // Session-level states: cleanup in flight, and stopped waiting for credentials.
    // Both need the user's attention or their patience, neither is a failure.
    case 'INTERRUPTING':
    case 'PAUSED':
      return 'warning';
    case 'COMPLETED':
    case 'CLOSED':
      return 'success';
    case 'FAILED':
      return 'danger';
  }
}

export function planTone(status: PlanStatus): StatusTone {
  switch (status) {
    case 'PENDING':
      return 'neutral';
    case 'RUNNING':
      return 'progress';
    case 'COMPLETED':
    case 'SHORT_CIRCUITED_ON_SUCCESS':
      return 'success';
    case 'INTERRUPTED':
      return 'warning';
    case 'STOPPED_ON_FAILURE':
    case 'FAILED':
      return 'danger';
  }
}

export function taskTone(status: TaskStatus): StatusTone {
  switch (status) {
    case 'PENDING':
    case 'WAITING_DEPENDENCY':
      return 'neutral';
    case 'RUNNING':
      return 'progress';
    case 'COMPLETED':
      return 'success';
    case 'SKIPPED':
    case 'INTERRUPTED':
    case 'CANCELLED':
      return 'warning';
    case 'FAILED':
    case 'TIMED_OUT':
      return 'danger';
  }
}

export function contextWindowTone(status: ContextWindowStatus): StatusTone {
  switch (status) {
    case 'HEALTHY':
      return 'success';
    case 'WARNING':
      return 'warning';
    case 'SATURATED':
      return 'danger';
  }
}
