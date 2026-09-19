import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../branding/BrandingProvider';
import { IdentityFieldsLive } from '../branding/IdentityFields';
import { useSession } from '../session/SessionContext';
import { StateMachineContent } from '../screens/StateMachineContent';
import { LiveDatabaseContent } from '../screens/LiveDatabaseContent';
import { Badge } from './Badge';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

type SettingsTab = 'identity' | 'model' | 'state-machine' | 'live-database' | 'danger';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'model', label: 'Model & transport' },
  { id: 'state-machine', label: 'State machine' },
  { id: 'live-database', label: 'Live database' },
];

function TabButton({ active, danger, label, onClick }: { active: boolean; danger?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: active ? 'var(--surface-2)' : 'none',
        border: 'none',
        padding: '9px 12px',
        borderRadius: 8,
        fontSize: 12.5,
        fontWeight: 700,
        color: danger ? 'var(--red)' : active ? 'var(--text)' : 'var(--text-2)',
      }}
    >
      {label}
    </button>
  );
}

function ModelTab({ onNavigateSignIn }: { onNavigateSignIn: () => void }) {
  const { connection } = useSession();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Current model</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
          Swapping the model mid-session isn't modeled by this app — sign in again to pick a different one.
        </div>
      </div>

      {connection ? (
        <div className="af-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{connection.model.name}</span>
            {connection.model.requiresCredentials ? (
              <Badge bg="var(--amber-soft)" color="var(--amber)">Token required</Badge>
            ) : (
              <Badge bg="var(--green-soft)" color="var(--green)">No credentials</Badge>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {connection.model.provider} · {connection.model.codec}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
            Transport: user id <code>{connection.userId}</code> · effort <code>{connection.effort}</code>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No active session — sign in to select a model.</div>
      )}

      <div>
        <Button variant="secondary" onClick={onNavigateSignIn}>
          Change model…
        </Button>
      </div>
    </div>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<SettingsTab>('identity');
  const [confirmReset, setConfirmReset] = useState(false);
  const navigate = useNavigate();
  const { resetConfiguration } = useSession();
  // resetBranding is intentionally used only in this danger-zone flow — Logout (UserMenu) never calls it.
  const { resetBranding } = useBranding();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 10, 28, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 720,
          height: 560,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface-2)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, padding: '4px 12px 14px' }}>Settings</div>
          {TABS.map((t) => (
            <TabButton key={t.id} active={tab === t.id} label={t.label} onClick={() => setTab(t.id)} />
          ))}
          <div style={{ flexGrow: 1 }} />
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 2px' }} />
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 12px' }}>
            Danger zone
          </div>
          <TabButton active={tab === 'danger'} danger label="Reset configuration" onClick={() => setTab('danger')} />
        </div>

        <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 14px 0' }}>
            <button
              onClick={onClose}
              aria-label="Close settings"
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'none', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', padding: '6px 26px 26px' }}>
            {tab === 'identity' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>App identity</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 18 }}>
                  Name, label and icon — the same choices as the Welcome screen. Changes apply immediately.
                </div>
                <IdentityFieldsLive />
              </>
            )}

            {tab === 'model' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Model &amp; transport</div>
                <ModelTab
                  onNavigateSignIn={() => {
                    onClose();
                    navigate('/signin');
                  }}
                />
              </>
            )}

            {tab === 'state-machine' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>State machine reference</div>
                <div className="af-card" style={{ overflow: 'hidden' }}>
                  <StateMachineContent embedded />
                </div>
              </>
            )}

            {tab === 'live-database' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Live database</div>
                <LiveDatabaseContent embedded />
              </>
            )}

            {tab === 'danger' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--red)' }}>Danger zone</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 18, maxWidth: 440, lineHeight: 1.55 }}>
                  Interrupts the current session, then clears your local sign-in <em>and</em> branding choices. You'll start again
                  from Welcome. This is different from Logout, which keeps your app identity.
                </div>
                <Button variant="danger" onClick={() => setConfirmReset(true)}>
                  Reset configuration
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Reset configuration?"
          description="This interrupts the current session, then clears your local sign-in and branding choices. You'll start again from Welcome."
          confirmLabel="Reset"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            resetConfiguration();
            resetBranding();
            onClose();
            navigate('/welcome');
          }}
        />
      )}
    </div>
  );
}
