import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { SerpentMark } from '../../components/Serpent.jsx';
import {
  readUprightPalette,
  UprightEngine,
  type UprightCue,
  type UprightPhase,
  type UprightSnapshot,
} from './uprightEngine';

interface UprightDialogProps {
  onClose: () => void;
  storagePrefix?: string;
}

const EMPTY_SNAPSHOT: UprightSnapshot = {
  phase: 'ready',
  score: 0,
  best: 0,
  combo: 0,
  maxCombo: 0,
  perfects: 0,
  stability: 100,
  message: '',
};

function readStoredNumber(key: string): number {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function readStoredBoolean(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be disabled. The game still works for the current session.
  }
}

function scoreLine(score: number, best: number): string {
  if (score === 0) return 'Run complete. Begin again when ready.';
  if (score < 5) return 'Initial structure recorded.';
  if (score < 12) return 'A measured run with room to refine.';
  if (score < 24) return 'A stable structure with strong control.';
  if (score < 40) return 'Excellent precision under increasing speed.';
  return score >= best ? 'New local best recorded.' : 'An exceptional run.';
}

function phaseInstruction(phase: UprightPhase): string {
  switch (phase) {
    case 'playing':
      return 'Lock the moving beam with click, tap, Space, or Enter.';
    case 'collapsing':
      return 'The tower is collapsing.';
    case 'gameOver':
      return 'Run complete. Restart to build another tower.';
    default:
      return 'Begin a run, then lock each moving beam over the tower.';
  }
}

export default function UprightDialog({ onClose, storagePrefix = 'wogo-upright' }: UprightDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<UprightEngine | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const closeRef = useRef(onClose);
  const bestKey = `${storagePrefix}-best`;
  const soundKey = `${storagePrefix}-sound`;

  const [snapshot, setSnapshot] = useState<UprightSnapshot>(() => ({
    ...EMPTY_SNAPSHOT,
    best: readStoredNumber(bestKey),
  }));
  const [soundEnabled, setSoundEnabled] = useState(() => readStoredBoolean(soundKey));
  const [themeRevision, setThemeRevision] = useState(0);

  closeRef.current = onClose;
  soundRef.current = soundEnabled;

  const reducedMotion = useMemo(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const ensureAudioContext = useCallback((): AudioContext | null => {
    if (!soundRef.current) return null;
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const context = audioContextRef.current;
      if (context.state === 'suspended') void context.resume();
      return context;
    } catch {
      return null;
    }
  }, []);

  const playTone = useCallback((frequency: number, duration: number, delay = 0, volume = 0.035, type: OscillatorType = 'sine') => {
    const context = ensureAudioContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }, [ensureAudioContext]);

  const playCue = useCallback((cue: UprightCue) => {
    if (!soundRef.current) return;
    switch (cue) {
      case 'start':
        playTone(248, 0.1, 0, 0.025, 'triangle');
        playTone(372, 0.12, 0.075, 0.025, 'triangle');
        break;
      case 'place':
        playTone(210, 0.06, 0, 0.018, 'square');
        break;
      case 'clip':
        playTone(154, 0.075, 0, 0.018, 'sawtooth');
        break;
      case 'perfect':
        playTone(440, 0.11, 0, 0.028, 'triangle');
        playTone(660, 0.15, 0.055, 0.024, 'sine');
        break;
      case 'milestone':
        playTone(330, 0.12, 0, 0.025, 'triangle');
        playTone(495, 0.12, 0.07, 0.025, 'triangle');
        playTone(742, 0.18, 0.14, 0.022, 'sine');
        break;
      case 'miss':
        playTone(118, 0.28, 0, 0.04, 'sawtooth');
        playTone(72, 0.42, 0.11, 0.032, 'sine');
        break;
    }
  }, [playTone]);

  useEffect(() => {
    const appShell = document.getElementById('root');
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousInert = appShell?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    if (appShell) appShell.inert = true;

    const focusable = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), canvas[tabindex="0"], [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || [],
    ).filter((element) => !element.hidden && element.getClientRects().length > 0);

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        engineRef.current?.startGame();
        requestAnimationFrame(() => canvasRef.current?.focus({ preventScroll: true }));
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    const focusFrame = requestAnimationFrame(() => startButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      if (appShell) appShell.inert = previousInert;
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousActive?.focus();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const refreshPalette = () => {
      engineRef.current?.setPalette(readUprightPalette(root));
      setThemeRevision((value) => value + 1);
    };
    const observer = new MutationObserver(refreshPalette);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-tint', 'style'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const engine = new UprightEngine({
      canvas,
      initialBest: readStoredNumber(bestKey),
      reducedMotion,
      onCue: playCue,
      onSnapshot: (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        if (nextSnapshot.best > 0) writeStoredValue(bestKey, String(nextSnapshot.best));
      },
    });
    engineRef.current = engine;
    engine.setPalette(readUprightPalette());
    engine.startLoop();

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => engine.resize())
      : null;
    resizeObserver?.observe(canvas);
    const handleResize = () => engine.resize();
    const handleVisibility = () => engine.setSuspended(document.hidden);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      engine.destroy();
      engineRef.current = null;
    };
  }, [bestKey, playCue, reducedMotion]);

  useEffect(() => () => {
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, []);

  const startGame = useCallback(() => {
    if (soundRef.current) ensureAudioContext();
    engineRef.current?.startGame();
    requestAnimationFrame(() => canvasRef.current?.focus());
  }, [ensureAudioContext]);

  const placeBeam = useCallback(() => {
    engineRef.current?.place();
  }, []);

  const handleCanvasPointer = useCallback(() => {
    canvasRef.current?.focus({ preventScroll: true });
    if (snapshot.phase === 'playing') placeBeam();
    else if (snapshot.phase !== 'collapsing') startGame();
  }, [placeBeam, snapshot.phase, startGame]);

  const handleCanvasKeyDown = useCallback((event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'enter') {
      event.preventDefault();
      if (snapshot.phase === 'playing') placeBeam();
      else if (snapshot.phase !== 'collapsing') startGame();
    }
  }, [placeBeam, snapshot.phase, startGame]);

  const toggleSound = useCallback(() => {
    const next = !soundRef.current;
    soundRef.current = next;
    setSoundEnabled(next);
    writeStoredValue(soundKey, String(next));
    if (next) {
      ensureAudioContext();
      playTone(392, 0.08, 0, 0.022, 'triangle');
    }
  }, [ensureAudioContext, playTone, soundKey]);

  const stabilityStyle = {
    '--upright-stability': `${snapshot.stability}%`,
  } as CSSProperties;

  const statusText = `${phaseInstruction(snapshot.phase)} Height ${snapshot.score}. Best ${snapshot.best}. Stability ${snapshot.stability} percent.${snapshot.combo > 1 ? ` Perfect combo ${snapshot.combo}.` : ''}`;

  return (
    <div className="upright-backdrop" data-theme-revision={themeRevision} onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        event.preventDefault();
        closeRef.current();
      }
    }}>
      <div
        ref={dialogRef}
        className="upright-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upright-title"
        aria-describedby="upright-description"
        tabIndex={-1}
      >
        <header className="upright-header">
          <div className="upright-wordmark">
            <span className="upright-wordmark-icon" aria-hidden="true"><SerpentMark /></span>
            <span><strong id="upright-title">UPRIGHT</strong><small>A Wogopogo break</small></span>
          </div>
          <div className="upright-window-controls">
            <button
              type="button"
              className="upright-window-button"
              aria-label={soundEnabled ? 'Mute game sounds' : 'Enable game sounds'}
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Sound on' : 'Sound off'}
              onClick={toggleSound}
            >
              {soundEnabled ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 7a7 7 0 0 1 0 10" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="m16 10 4 4m0-4-4 4" /></svg>
              )}
            </button>
            <button type="button" className="upright-window-button" aria-label="Close UPRIGHT" title="Close" onClick={() => closeRef.current()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
            </button>
          </div>
        </header>

        <p id="upright-description" className="upright-sr-only">Lock each moving beam over the tower. The overhang is cut away. Miss the structure and the whole tower comes down.</p>

        <section className="upright-hud" aria-label="Game status">
          <div><span>Height</span><strong>{String(snapshot.score).padStart(2, '0')}</strong></div>
          <div><span>Best</span><strong>{String(snapshot.best).padStart(2, '0')}</strong></div>
          <div><span>Perfect</span><strong>{snapshot.combo > 1 ? `×${snapshot.combo}` : snapshot.perfects}</strong></div>
          <div className="upright-stability" style={stabilityStyle}>
            <span>Stability</span><strong>{snapshot.stability}%</strong><i aria-hidden="true"><b /></i>
          </div>
        </section>

        <div className="upright-stage" data-phase={snapshot.phase}>
          <canvas
            ref={canvasRef}
            className="upright-canvas"
            tabIndex={0}
            role="application"
            aria-label="UPRIGHT tower-building game"
            aria-describedby="upright-description upright-status"
            onPointerDown={handleCanvasPointer}
            onKeyDown={handleCanvasKeyDown}
            onContextMenu={(event: ReactMouseEvent<HTMLCanvasElement>) => event.preventDefault()}
          />

          {snapshot.phase === 'ready' && (
            <div className="upright-overlay-card upright-intro">
              <span className="upright-kicker">A LITTLE BREAK BETWEEN JOBS</span>
              <h2>How high can you go?</h2>
              <p>Lock each moving beam over the tower. The overhang is cut away. Miss the structure and the whole tower comes down.</p>
              <button ref={startButtonRef} type="button" className="upright-primary-action" onClick={startGame}>
                Begin run <span aria-hidden="true">↗</span>
              </button>
              <small>Click · tap · Space · Enter</small>
            </div>
          )}

          {snapshot.phase === 'gameOver' && (
            <div className="upright-overlay-card upright-results">
              <span className="upright-kicker">RUN COMPLETE</span>
              <h2>Balance lost.</h2>
              <p>{scoreLine(snapshot.score, snapshot.best)}</p>
              <div className="upright-result-grid">
                <span><small>Height</small><strong>{snapshot.score}</strong></span>
                <span><small>Best</small><strong>{snapshot.best}</strong></span>
                <span><small>Best combo</small><strong>{snapshot.maxCombo || '—'}</strong></span>
              </div>
              <button ref={startButtonRef} type="button" className="upright-primary-action" onClick={startGame}>
                Again <span aria-hidden="true">↻</span>
              </button>
            </div>
          )}

          <p id="upright-status" className="upright-sr-only" aria-live="polite" aria-atomic="true">{statusText}</p>
        </div>

        <footer className="upright-footer">
          <span><kbd>Space</kbd> lock <i>·</i> <kbd>R</kbd> restart <i>·</i> <kbd>Esc</kbd> close</span>
          <span>Your best stays on this device.</span>
        </footer>
      </div>
    </div>
  );
}
