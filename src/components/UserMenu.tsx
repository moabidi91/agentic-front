import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../branding/BrandingProvider';
import { BrandIcon } from '../branding/icons';
import { useSession } from '../session/SessionContext';
import { ConfirmDialog } from './ConfirmDialog';

interface MenuLink {
  label: string;
  hint: string;
  onClick: () => void;
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const navigate = useNavigate();
  const { branding, resetBranding } = useBranding();
  const { resetConfiguration } = useSession();

  const links: MenuLink[] = [
    { label: 'App identity — name & icon', hint: 'Welcome', onClick: () => navigate('/welcome') },
    { label: 'Model & transport', hint: 'Sign in', onClick: () => navigate('/signin') },
    { label: 'State machine reference', hint: 'Docs', onClick: () => navigate('/state-machine') },
    { label: 'Live database', hint: 'Admin', onClick: () => navigate('/live-database') },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--navy)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BrandIcon id={branding.iconId} primary="rgba(255,255,255,0.9)" accent="var(--blue)" size={18} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            className="af-card"
            style={{
              position: 'absolute',
              right: 0,
              top: 44,
              width: 260,
              zIndex: 50,
              padding: 8,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {links.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setOpen(false);
                  link.onClick();
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
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <span>{link.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>{link.hint}</span>
              </button>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 2px' }} />
            <button
              onClick={() => {
                setOpen(false);
                setConfirmReset(true);
              }}
              style={{
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--red)',
              }}
            >
              Reset configuration
            </button>
          </div>
        </>
      )}

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
            navigate('/welcome');
          }}
        />
      )}
    </div>
  );
}
