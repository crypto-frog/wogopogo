import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './upright.css';

const loadUprightDialog = () => import('./UprightDialog');
const LazyUprightDialog = lazy(loadUprightDialog);

export interface UprightLauncherProps {
  className?: string;
  storagePrefix?: string;
  label?: string;
}

function LoadingDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="upright-backdrop">
      <div className="upright-loading" role="dialog" aria-modal="true" aria-label="Loading UPRIGHT">
        <span className="upright-loading-mark" aria-hidden="true"><i /><i /><i /></span>
        <strong>UPRIGHT</strong>
        <span>Initializing local game…</span>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function UprightLauncher({
  className = '',
  storagePrefix = 'wogo-upright',
  label = 'Play UPRIGHT',
}: UprightLauncherProps) {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const openGame = useCallback(() => {
    setOpen(true);
  }, []);

  const classes = ['upright-launcher-button', className].filter(Boolean).join(' ');

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={classes}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="UPRIGHT — take a short break"
        onClick={openGame}
        onPointerEnter={() => { void loadUprightDialog(); }}
        onFocus={() => { void loadUprightDialog(); }}
      >
        <span className="upright-launcher-glyph" aria-hidden="true"><i /><i /><i /></span>
        <span className="upright-launcher-signal" aria-hidden="true" />
      </button>
      {open && createPortal(
        <Suspense fallback={<LoadingDialog onClose={close} />}>
          <LazyUprightDialog onClose={close} storagePrefix={storagePrefix} />
        </Suspense>,
        document.body,
      )}
    </>
  );
}
