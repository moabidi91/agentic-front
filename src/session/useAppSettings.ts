import { useEffect, useState } from 'react';

export type SessionEndBehavior = 'ask' | 'continue' | 'new';

export interface AppSettings {
  sessionEndBehavior: SessionEndBehavior;
}

const DEFAULTS: AppSettings = { sessionEndBehavior: 'ask' };
const KEY = 'agentic-front.settings.v1';

function read(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

/** Local-only preferences (implementation-spec.md §UI) — no backend need. */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  return { settings, setSettings };
}
