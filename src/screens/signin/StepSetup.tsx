import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { useApi } from '../../api/context';
import type { EffortLevel, PromptRef, SkillRef } from '../../api/types';
import { Chip } from '../../components/Chip';
import { FieldHint, FieldLabel } from '../../components/Field';
import { SelectableList } from '../../components/SelectableList';
import { useAppSettings, type SessionEndBehavior } from '../../session/useAppSettings';

/** Above this many selections, a chip row stops being scannable — switch to a checkable list with a filter. */
const REVIEW_LIST_THRESHOLD = 6;

const EFFORT_OPTIONS: { id: EffortLevel; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
];

const END_BEHAVIOR_OPTIONS: { id: SessionEndBehavior; label: string }[] = [
  { id: 'ask', label: 'Ask each time' },
  { id: 'continue', label: 'Continue automatically' },
  { id: 'new', label: 'Start new automatically' },
];

/**
 * True only inside an actual Tauri webview. Checked at runtime (not build time)
 * so the same bundle works both as `npm run dev` in a plain browser and packaged
 * with Tauri — see StepSetup's folder/skills pickers below.
 */
const isTauri =
  typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function stripMdExtension(name: string): string {
  return name.replace(/\.md$/i, '');
}

export function StepSetup({
  workingSpace,
  setWorkingSpace,
  skills,
  setSkills,
  prompts,
  setPrompts,
  effort,
  setEffort,
  onBack,
  onSubmit,
  submitting,
}: {
  workingSpace: string;
  setWorkingSpace: (v: string) => void;
  skills: SkillRef[];
  setSkills: Dispatch<SetStateAction<SkillRef[]>>;
  prompts: PromptRef[];
  setPrompts: Dispatch<SetStateAction<PromptRef[]>>;
  effort: EffortLevel;
  setEffort: (v: EffortLevel) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const api = useApi();
  const { settings, setSettings } = useAppSettings();
  const [knownSkills, setKnownSkills] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pathIsApproximate, setPathIsApproximate] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const skillsInputRef = useRef<HTMLInputElement>(null);
  const promptsFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listKnownSkills().then(setKnownSkills);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSkills = (names: string[]) => {
    setSkills((prev) => {
      const seen = new Set(prev.map((s) => s.name));
      const next = [...prev];
      for (const raw of names) {
        const name = raw.trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        next.push({ name, path: `./skills/${name}` });
      }
      return next;
    });
  };

  const pickFolder = async () => {
    if (isTauri) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true });
      if (typeof selected === 'string') {
        setWorkingSpace(selected);
        setPathIsApproximate(false);
      }
      return;
    }
    // Browser fallback — no real Tauri runtime, so fall back to a hidden
    // <input webkitdirectory> and accept that only a relative folder name
    // is available (browsers never expose an absolute path for security).
    folderInputRef.current?.click();
  };

  const onFolderInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const relPath = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
      const folderName = relPath ? relPath.split('/')[0] : files[0].name;
      setWorkingSpace(folderName);
      setPathIsApproximate(true);
    }
    e.target.value = '';
  };

  const pickSkillFiles = async () => {
    if (isTauri) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: true, filters: [{ name: 'Markdown', extensions: ['md'] }] });
      if (Array.isArray(selected)) {
        addSkills(selected.map((p) => stripMdExtension(basename(p))));
      } else if (typeof selected === 'string') {
        addSkills([stripMdExtension(basename(selected))]);
      }
      return;
    }
    skillsInputRef.current?.click();
  };

  const onSkillsInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addSkills(Array.from(files).map((f) => stripMdExtension(f.name)));
    }
    e.target.value = '';
  };

  const addPrompts = (loaded: PromptRef[]) => {
    setPrompts((prev) => {
      const seen = new Set(prev.map((p) => p.name));
      const next = [...prev];
      for (const p of loaded) {
        if (!p.name || seen.has(p.name)) continue;
        seen.add(p.name);
        next.push(p);
      }
      return next;
    });
  };

  const pickPromptsFolder = async () => {
    setPromptsError(null);
    if (isTauri) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const dir = await open({ directory: true });
        if (typeof dir !== 'string') return;
        const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir(dir);
        const mdEntries = entries.filter((e) => !e.isDirectory && e.name?.toLowerCase().endsWith('.md'));
        const loaded: PromptRef[] = [];
        for (const entry of mdEntries) {
          const content = await readTextFile(`${dir}/${entry.name}`);
          loaded.push({ name: stripMdExtension(entry.name!), content });
        }
        addPrompts(loaded);
      } catch (err) {
        setPromptsError(err instanceof Error ? err.message : 'Could not read that folder.');
      }
      return;
    }
    // Browser fallback — a real folder picker (webkitdirectory), .md files filtered
    // and their real text content read via the File API, same as the Tauri path.
    promptsFolderInputRef.current?.click();
  };

  const onPromptsFolderInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const mdFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.md'));
      const loaded = await Promise.all(mdFiles.map(async (f) => ({ name: stripMdExtension(f.name), content: await f.text() })));
      addPrompts(loaded);
      if (mdFiles.length === 0) setPromptsError('That folder has no .md files.');
    }
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FieldLabel>Working folder</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 38,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              minWidth: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.8} style={{ flexShrink: 0 }}>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'IBM Plex Mono, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: workingSpace ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              {workingSpace || 'No folder selected'}
            </span>
          </div>
          <button
            type="button"
            onClick={pickFolder}
            style={{
              flexShrink: 0,
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Browse…
          </button>
        </div>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={onFolderInputChange}
          style={{ display: 'none' }}
          data-testid="folder-input"
          {...({ webkitdirectory: 'true', directory: 'true' } as unknown as Record<string, string>)}
        />
        <FieldHint>
          Mounted as a temporary <code>working_space</code>, cleaned up automatically once the task ends.
          {!isTauri && pathIsApproximate && workingSpace && (
            <>
              {' '}
              Running in a browser — only the folder name is available (<code>{workingSpace}</code>), not the full path; the
              packaged desktop app resolves the real location.
            </>
          )}
        </FieldHint>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldLabel>Skills{skills.length > 0 ? ` (${skills.length} selected)` : ''}</FieldLabel>

        {skills.length > REVIEW_LIST_THRESHOLD && (
          <SelectableList
            items={skills.map((s) => ({ id: s.name, label: s.name }))}
            onRemove={(id) => setSkills(skills.filter((x) => x.name !== id))}
            searchPlaceholder="Filter selected skills…"
          />
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {skills.length <= REVIEW_LIST_THRESHOLD &&
            skills.map((s) => (
              <Chip key={s.name} label={s.name} onRemove={() => setSkills(skills.filter((x) => x.name !== s.name))} />
            ))}
          <button
            type="button"
            onClick={pickSkillFiles}
            className="af-chip"
            style={{ border: '1px dashed var(--border)', color: 'var(--text-3)', background: 'none' }}
          >
            + Add skill
          </button>
          {knownSkills
            .filter((s) => !skills.some((sel) => sel.name === s))
            .map((s) => (
              <button
                key={s}
                onClick={() => addSkills([s])}
                className="af-chip"
                style={{ border: '1px dashed var(--border)', color: 'var(--text-3)', background: 'none' }}
              >
                + {s}
              </button>
            ))}
        </div>
        <input
          ref={skillsInputRef}
          type="file"
          accept=".md"
          multiple
          onChange={onSkillsInputChange}
          style={{ display: 'none' }}
          data-testid="skills-input"
        />
        <FieldHint>
          Optional — {isTauri ? '.md files' : '.md files from your browser'} made available to the model for this session. The
          suggestions below are known skills you can add with one click.
        </FieldHint>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldLabel>Prompts{prompts.length > 0 ? ` (${prompts.length} selected)` : ''}</FieldLabel>

        {prompts.length > REVIEW_LIST_THRESHOLD && (
          <SelectableList
            items={prompts.map((p) => ({ id: p.name, label: p.name }))}
            onRemove={(id) => setPrompts(prompts.filter((x) => x.name !== id))}
            searchPlaceholder="Filter selected prompts…"
          />
        )}

        {prompts.length > 0 && prompts.length <= REVIEW_LIST_THRESHOLD && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {prompts.map((p) => (
              <Chip key={p.name} label={p.name} onRemove={() => setPrompts(prompts.filter((x) => x.name !== p.name))} />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={pickPromptsFolder}
          className="af-btn af-btn--secondary af-btn--sm"
          style={{ alignSelf: 'flex-start' }}
        >
          Browse prompts folder…
        </button>
        <input
          ref={promptsFolderInputRef}
          type="file"
          multiple
          onChange={onPromptsFolderInputChange}
          style={{ display: 'none' }}
          data-testid="prompts-input"
          {...({ webkitdirectory: 'true', directory: 'true' } as unknown as Record<string, string>)}
        />
        {promptsError && <FieldHint>{promptsError}</FieldHint>}
        <FieldHint>
          Optional — pick a folder of .md files and their content becomes available as quick templates: type "/" in Chat to
          insert one.
        </FieldHint>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldLabel>Effort</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {EFFORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setEffort(opt.id)}
              className="af-btn"
              style={{
                flex: 1,
                background: effort === opt.id ? 'var(--navy)' : 'var(--surface-2)',
                color: effort === opt.id ? '#fff' : 'var(--text-2)',
                border: `1px solid ${effort === opt.id ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <FieldHint>
          Sent to the model as a note to parallelize more or less, within system limits — the front never computes a
          thread count itself.
        </FieldHint>
      </div>

      <button
        onClick={() => setAdvancedOpen((o) => !o)}
        style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          style={{ transform: advancedOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s' }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        Advanced settings
      </button>

      {advancedOpen && (
        <div className="af-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel>When a session completes</FieldLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {END_BEHAVIOR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSettings({ ...settings, sessionEndBehavior: opt.id })}
                  className="af-btn af-btn--sm"
                  style={{
                    background: settings.sessionEndBehavior === opt.id ? 'var(--navy)' : 'var(--surface)',
                    color: settings.sessionEndBehavior === opt.id ? '#fff' : 'var(--text-2)',
                    border: `1px solid ${settings.sessionEndBehavior === opt.id ? 'var(--navy)' : 'var(--border)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <FieldHint>The app itself never stops, regardless of this choice.</FieldHint>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <button onClick={onBack} className="af-btn af-btn--ghost" style={{ paddingLeft: 0 }}>
          ← Back
        </button>
        <button className="af-btn af-btn--primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
