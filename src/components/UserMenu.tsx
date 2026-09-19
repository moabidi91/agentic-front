import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';
import { getInitials } from '../utils/initials';
import { SettingsModal } from './SettingsModal';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const { connection, resetConfiguration } = useSession();

  const initials = getInitials(connection?.userId);

  const logout = () => {
    setOpen(false);
    // Ends the current sign-in only — app identity/branding is intentionally kept
    // (that's what makes Logout different from Danger zone → Reset configuration).
    resetConfiguration();
    navigate('/signin');
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'var(--navy)',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {initials}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            className="af-card"
            style={{
              position: 'absolute',
              right: 0,
              top: 40,
              width: 190,
              zIndex: 50,
              padding: 6,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <button
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
              style={{
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Settings
            </button>
            <button
              onClick={logout}
              style={{
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Logout
            </button>
          </div>
        </>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
