import type { EffortLevel, PromptRef, SkillRef } from '../api/types';

export interface SavedSignInPrefs {
  userId: string;
  modelId: string;
  workingSpace?: string;
  skills: SkillRef[];
  effort: EffortLevel;
  /** Tauri only — a real folder path we can silently re-read at launch (browsers never expose one, see StepSetup). */
  promptsFolderPath?: string;
  /**
   * Only the model's credential fields explicitly marked `secret: false` (e.g.
   * a Chat ID) — filtered in SessionContext.signIn() before this is ever
   * called. A secret field (the access token, or any field a model forgot to
   * mark non-secret) never reaches here.
   */
  credentials?: Record<string, string>;
}

const STORAGE_KEY = 'agentic-front.signin-prefs.v1';
const STORE_FILE = 'settings.json';
const STORE_KEY = 'signInPrefs';

/**
 * True only inside an actual Tauri webview. Checked at runtime (not build
 * time) so the same bundle works both as `npm run dev` in a plain browser
 * and packaged with Tauri.
 */
export const isTauri =
  typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

/**
 * Remembers the last successful sign-in setup (model, working folder, skills,
 * effort, prompts folder) so a returning user isn't asked to redo it on every
 * launch. The access token is never included here — re-authentication (typing
 * a token, for a model that needs one) still happens each launch; only the
 * *settings* around it are restored. Cleared by Settings → Danger zone → Reset
 * configuration (SettingsModal); untouched by Logout, which is meant to
 * reconnect instantly with the same setup.
 *
 * Tauri: a real file via the Store plugin (`settings.json`, in the app's own
 * data directory — survives restarts, independent of the webview cache).
 * Browser fallback: localStorage, same pattern as branding/app settings
 * elsewhere in this app.
 */
export async function loadSignInPrefs(): Promise<SavedSignInPrefs | null> {
  if (isTauri) {
    try {
      const { Store } = await import('@tauri-apps/plugin-store');
      const store = await Store.load(STORE_FILE, { autoSave: false });
      const value = await store.get<SavedSignInPrefs>(STORE_KEY);
      return value ?? null;
    } catch {
      return null;
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSignInPrefs) : null;
  } catch {
    return null;
  }
}

export async function saveSignInPrefs(prefs: SavedSignInPrefs): Promise<void> {
  if (isTauri) {
    try {
      const { Store } = await import('@tauri-apps/plugin-store');
      const store = await Store.load(STORE_FILE, { autoSave: false });
      await store.set(STORE_KEY, prefs);
      await store.save();
    } catch {
      // Best-effort — losing saved prefs never blocks a sign-in that already succeeded.
    }
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export async function clearSignInPrefs(): Promise<void> {
  if (isTauri) {
    try {
      const { Store } = await import('@tauri-apps/plugin-store');
      const store = await Store.load(STORE_FILE, { autoSave: false });
      await store.delete(STORE_KEY);
      await store.save();
    } catch {
      // ignore
    }
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Silently re-reads a previously-picked prompts folder (Tauri only — browsers
 * never expose a reusable path for a `webkitdirectory` pick, see StepSetup).
 * Shared by StepSetup's manual "Browse…" picker and SignInScreen's silent
 * restore-on-launch path, so both read folders the same way.
 */
export async function readPromptsFromFolder(dir: string): Promise<PromptRef[]> {
  const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs');
  const entries = await readDir(dir);
  const mdEntries = entries.filter((e) => !e.isDirectory && e.name?.toLowerCase().endsWith('.md'));
  const loaded: PromptRef[] = [];
  for (const entry of mdEntries) {
    const content = await readTextFile(`${dir}/${entry.name}`);
    loaded.push({ name: entry.name!.replace(/\.md$/i, ''), content });
  }
  return loaded;
}
