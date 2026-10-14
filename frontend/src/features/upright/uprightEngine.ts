export type UprightPhase = 'ready' | 'playing' | 'collapsing' | 'gameOver';
export type UprightCue = 'start' | 'place' | 'clip' | 'perfect' | 'milestone' | 'miss';

export interface UprightSnapshot {
  phase: UprightPhase;
  score: number;
  best: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  stability: number;
  message: string;
}

export interface UprightPalette {
  key: string;
  isLight: boolean;
  background: string;
  raised: string;
  ink: string;
  muted: string;
  line: string;
  lineStrong: string;
  primary: string;
  secondary: string;
  danger: string;
  blockPaints: ReadonlyArray<BlockPaint>;
}

interface BlockPaint {
  body: string;
  top: string;
  side: string;
  glow: string;
  detail: string;
}

interface Block {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  paletteIndex: number;
  pulse: number;
}

interface MovingBlock extends Block {
  velocityX: number;
}

interface Fragment extends Block {
  velocityX: number;
  velocityY: number;
  angle: number;
  angularVelocity: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  paletteIndex: number;
}

interface Model {
  phase: UprightPhase;
  score: number;
  best: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  stability: number;
  blocks: Block[];
  moving: MovingBlock | null;
  fragments: Fragment[];
  particles: Particle[];
  cameraY: number;
  cameraTargetY: number;
  shake: number;
  collapseElapsed: number;
  message: string;
  messageLife: number;
  nextId: number;
}

export interface UprightEngineOptions {
  canvas: HTMLCanvasElement;
  initialBest?: number;
  reducedMotion?: boolean;
  onSnapshot?: (snapshot: UprightSnapshot) => void;
  onCue?: (cue: UprightCue) => void;
}

const WORLD_WIDTH = 420;
const BLOCK_HEIGHT = 30;
const START_WIDTH = 236;
const SIDE_GUTTER = 18;
const PERFECT_TOLERANCE = 4.25;
const MIN_SURVIVABLE_OVERLAP = 5.5;
const GRAVITY = 700;
const MAX_DPR = 2.25;

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const wrapHue = (value: number) => ((value % 360) + 360) % 360;
const randomBetween = (minimum: number, maximum: number) => minimum + Math.random() * (maximum - minimum);
const hsl = (hue: number, saturation: number, lightness: number, alpha = 1) =>
  alpha >= 1
    ? `hsl(${wrapHue(hue)} ${saturation}% ${lightness}%)`
    : `hsl(${wrapHue(hue)} ${saturation}% ${lightness}% / ${alpha})`;

function cssNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Reads Wogopogo's root theme variables and expands the selected tint into
 * a deliberately multi-colour game palette. The first hue follows the site;
 * the remaining hues are harmonically offset so UPRIGHT is colourful rather
 * than monochrome.
 */
export function readUprightPalette(root: HTMLElement = document.documentElement): UprightPalette {
  const style = getComputedStyle(root);
  const hue = cssNumber(style.getPropertyValue('--tint-h').trim() || null, 216);
  const accentSaturation = clamp(cssNumber(style.getPropertyValue('--tint-accent-s').trim() || null, 48), 8, 72);
  const accentLightness = clamp(cssNumber(style.getPropertyValue('--tint-accent-l').trim() || null, 57), 42, 72);
  const isLight = root.dataset.theme === 'light';
  const tint = root.dataset.tint || 'neutral';
  const offsets = [0, 38, 94, 158, 220, 304];
  const paletteChroma = isLight
    ? clamp(56 + accentSaturation * 0.36, 58, 82)
    : clamp(62 + accentSaturation * 0.44, 66, 92);
  const blockPaints = offsets.map((offset, index): BlockPaint => {
    const blockHue = hue + offset;
    const saturation = clamp(paletteChroma + (index % 3) * 3, 54, 94);
    const bodyLightness = isLight
      ? clamp(43 + (accentLightness - 42) * 0.22 + (index % 2) * 3, 43, 54)
      : clamp(55 + (accentLightness - 42) * 0.16 + (index % 2) * 4, 55, 66);
    return {
      body: hsl(blockHue, saturation, bodyLightness),
      top: hsl(blockHue + 3, clamp(saturation + 4, 0, 100), clamp(bodyLightness + 13, 0, 92)),
      side: hsl(blockHue - 5, clamp(saturation - 8, 0, 100), clamp(bodyLightness - 16, 6, 82)),
      glow: hsl(blockHue, saturation, isLight ? 44 : 64, isLight ? 0.24 : 0.4),
      detail: hsl(blockHue + 12, clamp(saturation + 5, 0, 100), isLight ? 24 : 91, isLight ? 0.52 : 0.62),
    };
  });

  const computed = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    key: `${root.dataset.theme || 'dark'}:${tint}:${hue}:${accentSaturation}:${accentLightness}`,
    isLight,
    background: computed('--bg', isLight ? hsl(hue, 10, 93) : hsl(hue, 20, 7)),
    raised: computed('--bg-raise', isLight ? hsl(hue, 10, 97) : hsl(hue, 20, 11)),
    ink: computed('--ink', isLight ? hsl(hue, 10, 14) : hsl(hue, 7, 94)),
    muted: computed('--muted', isLight ? hsl(hue, 8, 40) : hsl(hue, 8, 68)),
    line: computed('--line', hsl(hue, 18, isLight ? 26 : 80, 0.16)),
    lineStrong: computed('--line-strong', hsl(hue, 18, isLight ? 24 : 82, 0.38)),
    primary: hsl(hue, clamp(paletteChroma + 2, 56, 94), isLight ? 42 : 66),
    secondary: hsl(hue + 94, clamp(paletteChroma + 4, 58, 96), isLight ? 46 : 65),
    danger: hsl(hue + 188, 84, isLight ? 46 : 62),
    blockPaints,
  };
}

export class UprightEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly onSnapshot?: (snapshot: UprightSnapshot) => void;
  private readonly onCue?: (cue: UprightCue) => void;
  private readonly reducedMotion: boolean;

  private model: Model;
  private palette: UprightPalette;
  private animationFrame = 0;
  private previousTime = 0;
  private suspended = false;
  private destroyed = false;
  private cssWidth = 1;
  private cssHeight = 1;
  private dpr = 1;
  private unit = 1;
  private floorMargin = 58;
  private resizeCheckCountdown = 0;

  public constructor(options: UprightEngineOptions) {
    const context = options.canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('UPRIGHT requires Canvas 2D support.');

    this.canvas = options.canvas;
    this.context = context;
    this.onSnapshot = options.onSnapshot;
    this.onCue = options.onCue;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.palette = readUprightPalette();
    this.model = this.createModel(Math.max(0, Math.floor(options.initialBest || 0)));
    this.resize();
    this.emitSnapshot();
  }

  public startLoop(): void {
    if (this.destroyed || this.animationFrame) return;
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  public destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  public setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.previousTime = 0;
    if (!suspended) this.startLoop();
  }

  public setPalette(palette: UprightPalette): void {
    this.palette = palette;
    this.draw(performance.now());
  }

  public resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const nextDpr = clamp(window.devicePixelRatio || 1, 1, MAX_DPR);
    if (width === this.cssWidth && height === this.cssHeight && nextDpr === this.dpr) return;

    this.cssWidth = width;
    this.cssHeight = height;
    this.dpr = nextDpr;
    this.unit = width / WORLD_WIDTH;
    this.floorMargin = clamp(height * 0.075, 44, 66);
    this.canvas.width = Math.round(width * nextDpr);
    this.canvas.height = Math.round(height * nextDpr);
    this.updateCameraTarget();
    this.draw(performance.now());
  }

  public startGame(): void {
    const best = this.model.best;
    this.model = this.createModel(best);
    this.model.phase = 'playing';
    this.model.message = 'LOCK THE BEAM';
    this.model.messageLife = 0.72;
    this.onCue?.('start');
    this.emitSnapshot();
  }

  public place(): void {
    if (this.model.phase !== 'playing' || !this.model.moving) return;

    const moving = this.model.moving;
    const support = this.model.blocks[this.model.blocks.length - 1];
    const offset = moving.x - support.x;
    const overlapLeft = Math.max(moving.x, support.x);
    const overlapRight = Math.min(moving.x + moving.width, support.x + support.width);
    const overlap = overlapRight - overlapLeft;
    const isPerfect = Math.abs(offset) <= PERFECT_TOLERANCE;

    if (!isPerfect && overlap < MIN_SURVIVABLE_OVERLAP) {
      this.beginCollapse(moving);
      return;
    }

    let placedX = overlapLeft;
    let placedWidth = overlap;
    if (isPerfect) {
      placedX = support.x;
      placedWidth = support.width;
      this.model.combo += 1;
      this.model.perfects += 1;
      this.model.maxCombo = Math.max(this.model.maxCombo, this.model.combo);
      this.model.message = this.model.combo >= 2 ? `PERFECT ×${this.model.combo}` : 'PERFECT';
      this.model.messageLife = 0.76;
      this.model.shake = Math.max(this.model.shake, this.reducedMotion ? 0 : 1.35);
      this.spawnPerfectParticles(placedX, moving.y, placedWidth, moving.paletteIndex);
      this.onCue?.('perfect');
    } else {
      this.model.combo = 0;
      this.model.message = overlap / support.width < 0.35 ? 'HOLD IT' : 'LOCKED';
      this.model.messageLife = 0.46;
      this.model.shake = Math.max(this.model.shake, this.reducedMotion ? 0 : 2.2);
      this.spawnOverhang(moving, overlapLeft, overlapRight);
      this.onCue?.('clip');
    }

    const placed: Block = {
      id: this.model.nextId++,
      x: placedX,
      y: moving.y,
      width: placedWidth,
      height: BLOCK_HEIGHT,
      paletteIndex: moving.paletteIndex,
      pulse: 1,
    };
    this.model.blocks.push(placed);
    this.model.stability = clamp(Math.round((placed.width / START_WIDTH) * 100), 0, 100);
    this.model.score += 1;
    this.model.best = Math.max(this.model.best, this.model.score);
    this.model.moving = this.createMovingBlock();
    this.updateCameraTarget();

    if (this.model.score > 0 && this.model.score % 10 === 0) {
      this.model.message = `ALTITUDE ${this.model.score}`;
      this.model.messageLife = 1;
      this.onCue?.('milestone');
    }

    this.emitSnapshot();
  }

  public getSnapshot(): UprightSnapshot {
    return {
      phase: this.model.phase,
      score: this.model.score,
      best: this.model.best,
      combo: this.model.combo,
      maxCombo: this.model.maxCombo,
      perfects: this.model.perfects,
      stability: this.model.stability,
      message: this.model.message,
    };
  }

  private readonly frame = (time: number): void => {
    this.animationFrame = 0;
    if (this.destroyed) return;
    if (this.suspended) return;

    if (this.resizeCheckCountdown <= 0) {
      this.resize();
      this.resizeCheckCountdown = 20;
    } else {
      this.resizeCheckCountdown -= 1;
    }

    const elapsed = this.previousTime ? (time - this.previousTime) / 1000 : 0;
    this.previousTime = time;
    const delta = clamp(elapsed, 0, 1 / 24);
    this.update(delta, time);
    this.draw(time);
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private createModel(best: number): Model {
    const base: Block = {
      id: 0,
      x: (WORLD_WIDTH - START_WIDTH) / 2,
      y: 0,
      width: START_WIDTH,
      height: BLOCK_HEIGHT,
      paletteIndex: 0,
      pulse: 0,
    };
    const model: Model = {
      phase: 'ready',
      score: 0,
      best,
      combo: 0,
      maxCombo: 0,
      perfects: 0,
      stability: 100,
      blocks: [base],
      moving: null,
      fragments: [],
      particles: [],
      cameraY: 0,
      cameraTargetY: 0,
      shake: 0,
      collapseElapsed: 0,
      message: '',
      messageLife: 0,
      nextId: 1,
    };
    this.model = model;
    model.moving = this.createMovingBlock();
    return model;
  }

  private createMovingBlock(): MovingBlock {
    const support = this.model.blocks[this.model.blocks.length - 1];
    const level = this.model.blocks.length;
    const direction = level % 2 === 0 ? -1 : 1;
    const speed = clamp(108 + this.model.score * 4.7 + Math.min(26, this.model.combo * 2.5), 108, 252);
    const x = direction > 0 ? SIDE_GUTTER : WORLD_WIDTH - SIDE_GUTTER - support.width;
    return {
      id: this.model.nextId++,
      x,
      y: support.y + BLOCK_HEIGHT,
      width: support.width,
      height: BLOCK_HEIGHT,
      velocityX: direction * speed,
      paletteIndex: level % this.palette.blockPaints.length,
      pulse: 0,
    };
  }

  private update(delta: number, time: number): void {
    const model = this.model;

    if ((model.phase === 'ready' || model.phase === 'playing') && model.moving) {
      const readinessFactor = model.phase === 'ready' ? 0.72 : 1;
      model.moving.x += model.moving.velocityX * readinessFactor * delta;
      const leftLimit = SIDE_GUTTER;
      const rightLimit = WORLD_WIDTH - SIDE_GUTTER - model.moving.width;
      if (model.moving.x <= leftLimit) {
        model.moving.x = leftLimit;
        model.moving.velocityX = Math.abs(model.moving.velocityX);
      } else if (model.moving.x >= rightLimit) {
        model.moving.x = rightLimit;
        model.moving.velocityX = -Math.abs(model.moving.velocityX);
      }
    }

    for (const block of model.blocks) block.pulse = Math.max(0, block.pulse - delta * 2.8);

    for (const fragment of model.fragments) {
      fragment.x += fragment.velocityX * delta;
      fragment.y += fragment.velocityY * delta;
      fragment.velocityY -= GRAVITY * delta;
      fragment.angle += fragment.angularVelocity * delta;
      fragment.opacity = Math.max(0, fragment.opacity - delta * 0.12);
    }
    model.fragments = model.fragments.filter((fragment) => fragment.opacity > 0 && fragment.y > model.cameraY - 620);

    for (const particle of model.particles) {
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      particle.velocityY -= GRAVITY * 0.34 * delta;
      particle.life -= delta;
    }
    model.particles = model.particles.filter((particle) => particle.life > 0);

    model.cameraY += (model.cameraTargetY - model.cameraY) * clamp(delta * 4.8, 0, 1);
    model.shake = Math.max(0, model.shake - delta * 11);
    model.messageLife = Math.max(0, model.messageLife - delta);

    if (model.phase === 'collapsing') {
      model.collapseElapsed += delta;
      const duration = this.reducedMotion ? 0.12 : 0.92;
      if (model.collapseElapsed >= duration) {
        model.phase = 'gameOver';
        model.message = '';
        model.messageLife = 0;
        this.emitSnapshot();
      }
    }

    // Keep a subtle pulse alive in the attract screen without changing gameplay.
    if (!this.reducedMotion && model.phase === 'ready' && model.moving) {
      model.moving.pulse = 0.35 + Math.sin(time / 430) * 0.15;
    }
  }

  private updateCameraTarget(): void {
    const moving = this.model.moving;
    if (!moving) return;
    const visibleWorldHeight = Math.max(180, (this.cssHeight - this.floorMargin - 26) / this.unit);
    this.model.cameraTargetY = Math.max(0, moving.y + BLOCK_HEIGHT - visibleWorldHeight * 0.6);
  }

  private spawnOverhang(moving: MovingBlock, overlapLeft: number, overlapRight: number): void {
    const leftWidth = Math.max(0, overlapLeft - moving.x);
    const rightWidth = Math.max(0, moving.x + moving.width - overlapRight);
    const isLeft = leftWidth > rightWidth;
    const width = Math.max(leftWidth, rightWidth);
    if (width <= 0.01) return;

    this.model.fragments.push({
      id: this.model.nextId++,
      x: isLeft ? moving.x : overlapRight,
      y: moving.y,
      width,
      height: moving.height,
      paletteIndex: moving.paletteIndex,
      pulse: 0,
      velocityX: isLeft ? -randomBetween(28, 58) : randomBetween(28, 58),
      velocityY: randomBetween(18, 70),
      angle: 0,
      angularVelocity: (isLeft ? -1 : 1) * randomBetween(1.7, 3.6),
      opacity: 1,
    });
  }

  private spawnPerfectParticles(x: number, y: number, width: number, paletteIndex: number): void {
    if (this.reducedMotion) return;
    const count = 18;
    for (let index = 0; index < count; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      this.model.particles.push({
        x: x + (index / (count - 1)) * width,
        y: y + BLOCK_HEIGHT * randomBetween(0.4, 0.95),
        velocityX: direction * randomBetween(16, 72),
        velocityY: randomBetween(55, 142),
        life: randomBetween(0.34, 0.68),
        maxLife: 0.68,
        size: randomBetween(1.4, 3.4),
        paletteIndex: (paletteIndex + index) % this.palette.blockPaints.length,
      });
    }
  }

  private beginCollapse(missed: MovingBlock): void {
    const model = this.model;
    const support = model.blocks[model.blocks.length - 1];
    const missedCentre = missed.x + missed.width / 2;
    const supportCentre = support.x + support.width / 2;
    const missDirection = Math.sign(missedCentre - supportCentre) || Math.sign(missed.velocityX) || 1;

    const fallingBlocks = model.blocks.slice(1);
    for (let index = 0; index < fallingBlocks.length; index += 1) {
      const block = fallingBlocks[index];
      const centreBias = (block.x + block.width / 2 - WORLD_WIDTH / 2) * 0.32;
      model.fragments.push({
        ...block,
        id: model.nextId++,
        velocityX: centreBias + missDirection * randomBetween(28, 92) + randomBetween(-36, 36),
        velocityY: randomBetween(45, 165) + index * 2.2,
        angle: 0,
        angularVelocity: missDirection * randomBetween(1.2, 4.2) + randomBetween(-1.4, 1.4),
        opacity: 1,
      });
    }
    model.fragments.push({
      ...missed,
      id: model.nextId++,
      velocityX: missed.velocityX * 0.42 + missDirection * 42,
      velocityY: randomBetween(20, 80),
      angle: 0,
      angularVelocity: missDirection * randomBetween(2.8, 5.2),
      opacity: 1,
    });

    model.blocks = [model.blocks[0]];
    model.moving = null;
    model.phase = 'collapsing';
    model.collapseElapsed = 0;
    model.combo = 0;
    model.message = 'CASCADE';
    model.messageLife = this.reducedMotion ? 0.08 : 0.72;
    model.shake = this.reducedMotion ? 0 : 12;
    this.onCue?.('miss');
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    this.onSnapshot?.(this.getSnapshot());
  }

  private draw(time: number): void {
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.clearRect(0, 0, this.cssWidth, this.cssHeight);

    this.drawBackground(this.reducedMotion ? 0 : time);

    const shakeX = this.model.shake ? randomBetween(-this.model.shake, this.model.shake) : 0;
    const shakeY = this.model.shake ? randomBetween(-this.model.shake * 0.45, this.model.shake * 0.45) : 0;
    context.save();
    context.translate(shakeX, shakeY);

    this.drawFloor();
    this.drawGuides(this.reducedMotion ? 0 : time);

    for (const block of this.model.blocks) this.drawBlock(block, 0, 1, false);
    for (const fragment of this.model.fragments) this.drawBlock(fragment, fragment.angle, fragment.opacity, false);
    if (this.model.moving) this.drawBlock(this.model.moving, 0, 1, true);
    this.drawParticles();
    this.drawMessage();

    context.restore();
    this.drawVignette(this.reducedMotion ? 0 : time);
  }

  private drawBackground(time: number): void {
    const context = this.context;
    context.fillStyle = this.palette.background;
    context.fillRect(0, 0, this.cssWidth, this.cssHeight);

    const activeX = this.model.moving
      ? (this.model.moving.x + this.model.moving.width / 2) * this.unit
      : this.cssWidth / 2;
    const glow = context.createRadialGradient(activeX, this.cssHeight * 0.36, 0, activeX, this.cssHeight * 0.36, this.cssWidth * 0.76);
    glow.addColorStop(0, this.palette.blockPaints[(this.model.score + 1) % this.palette.blockPaints.length].glow);
    glow.addColorStop(0.48, this.palette.isLight ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, this.cssWidth, this.cssHeight);

    context.save();
    context.globalAlpha = this.palette.isLight ? 0.15 : 0.22;
    context.strokeStyle = this.palette.line;
    context.lineWidth = 1;
    const grid = clamp(this.cssWidth / 12, 26, 42);
    const offsetY = ((this.model.cameraY * this.unit) + time * 0.004) % grid;
    context.beginPath();
    for (let x = grid; x < this.cssWidth; x += grid) {
      context.moveTo(Math.round(x) + 0.5, 0);
      context.lineTo(Math.round(x) + 0.5, this.cssHeight);
    }
    for (let y = offsetY; y < this.cssHeight; y += grid) {
      context.moveTo(0, Math.round(y) + 0.5);
      context.lineTo(this.cssWidth, Math.round(y) + 0.5);
    }
    context.stroke();
    context.restore();

    // Deterministic signal points: texture without external imagery or assets.
    context.save();
    for (let index = 0; index < 24; index += 1) {
      const x = ((index * 83.17) % 100) / 100 * this.cssWidth;
      const y = ((index * 47.71 + time * 0.0018) % 100) / 100 * this.cssHeight;
      context.globalAlpha = 0.08 + (index % 4) * 0.022;
      context.fillStyle = index % 3 === 0 ? this.palette.secondary : this.palette.primary;
      context.fillRect(x, y, index % 5 === 0 ? 2 : 1, index % 5 === 0 ? 2 : 1);
    }
    context.restore();
  }

  private drawFloor(): void {
    const context = this.context;
    const floorY = this.worldBottomToScreen(0);
    if (floorY < -20 || floorY > this.cssHeight + 20) return;

    const gradient = context.createLinearGradient(0, floorY, this.cssWidth, floorY);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.18, this.palette.lineStrong);
    gradient.addColorStop(0.5, this.palette.primary);
    gradient.addColorStop(0.82, this.palette.lineStrong);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, Math.round(floorY) + 0.5);
    context.lineTo(this.cssWidth, Math.round(floorY) + 0.5);
    context.stroke();
  }

  private drawGuides(time: number): void {
    const context = this.context;
    const support = this.model.blocks[this.model.blocks.length - 1];
    if (!support || !this.model.moving || this.model.phase === 'collapsing') return;

    const supportTop = this.worldBottomToScreen(support.y + support.height);
    const movingBottom = this.worldBottomToScreen(this.model.moving.y);
    const left = support.x * this.unit;
    const right = (support.x + support.width) * this.unit;
    context.save();
    context.setLineDash([4, 7]);
    context.lineDashOffset = -(time / 80) % 11;
    context.strokeStyle = this.palette.lineStrong;
    context.globalAlpha = this.model.phase === 'ready' ? 0.26 : 0.42;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left, supportTop);
    context.lineTo(left, movingBottom);
    context.moveTo(right, supportTop);
    context.lineTo(right, movingBottom);
    context.stroke();
    context.restore();

    const centre = (this.model.moving.x + this.model.moving.width / 2) * this.unit;
    context.save();
    context.globalAlpha = 0.34;
    context.strokeStyle = this.palette.primary;
    context.beginPath();
    context.moveTo(centre, movingBottom - 10);
    context.lineTo(centre, movingBottom + 6);
    context.stroke();
    context.restore();
  }

  private drawBlock(block: Block, angle: number, opacity: number, active: boolean): void {
    const context = this.context;
    const screenBottom = this.worldBottomToScreen(block.y);
    const width = block.width * this.unit;
    const height = block.height * this.unit;
    const x = block.x * this.unit;
    const centreX = x + width / 2;
    const centreY = screenBottom - height / 2;
    if (centreY + height < -100 || centreY - height > this.cssHeight + 100) return;

    const paint = this.palette.blockPaints[block.paletteIndex % this.palette.blockPaints.length];
    const pulse = clamp(block.pulse, 0, 1);
    context.save();
    context.translate(centreX, centreY);
    context.rotate(angle);
    context.globalAlpha = opacity;

    if (active || pulse > 0) {
      context.shadowColor = paint.glow;
      context.shadowBlur = active ? 22 + (this.reducedMotion ? 0 : Math.sin(performance.now() / 190) * 4) : 18 * pulse;
    }

    const radius = clamp(height * 0.16, 2.5, 6);
    const bodyGradient = context.createLinearGradient(0, -height / 2, 0, height / 2);
    bodyGradient.addColorStop(0, paint.top);
    bodyGradient.addColorStop(0.18, paint.body);
    bodyGradient.addColorStop(1, paint.side);
    context.fillStyle = bodyGradient;
    this.roundedRect(context, -width / 2, -height / 2, width, height, radius);
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = this.palette.isLight ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.16)';
    context.lineWidth = 1;
    this.roundedRect(context, -width / 2 + 0.5, -height / 2 + 0.5, Math.max(0, width - 1), Math.max(0, height - 1), radius);
    context.stroke();

    if (width > 34) {
      context.globalAlpha = opacity * 0.62;
      context.strokeStyle = paint.detail;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(-width / 2 + Math.min(13, width * 0.12), -height * 0.18);
      context.lineTo(width / 2 - Math.min(13, width * 0.12), -height * 0.18);
      context.stroke();

      context.fillStyle = paint.detail;
      const notch = clamp(height * 0.1, 1.2, 2.8);
      context.fillRect(-width / 2 + 8, height * 0.12, notch * 2.4, notch);
      context.fillRect(width / 2 - 8 - notch * 2.4, height * 0.12, notch * 2.4, notch);
    }

    if (active && width > 72) {
      context.globalAlpha = opacity * 0.7;
      context.fillStyle = this.palette.isLight ? 'rgba(0,0,0,.58)' : 'rgba(255,255,255,.84)';
      context.font = `700 ${clamp(height * 0.27, 7, 10)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(this.model.phase === 'ready' ? 'UPRIGHT' : 'LOCK', 0, height * 0.08);
    }

    context.restore();
  }

  private drawParticles(): void {
    const context = this.context;
    for (const particle of this.model.particles) {
      const paint = this.palette.blockPaints[particle.paletteIndex % this.palette.blockPaints.length];
      const x = particle.x * this.unit;
      const y = this.worldBottomToScreen(particle.y);
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = paint.top;
      context.shadowColor = paint.glow;
      context.shadowBlur = 7;
      const size = particle.size * this.unit;
      context.fillRect(x - size / 2, y - size / 2, size, size);
      context.restore();
    }
  }

  private drawMessage(): void {
    if (this.model.messageLife <= 0 || !this.model.message) return;
    const context = this.context;
    const alpha = clamp(this.model.messageLife / 0.35, 0, 1);
    const movingY = this.model.moving ? this.worldBottomToScreen(this.model.moving.y + BLOCK_HEIGHT + 16) : this.cssHeight * 0.34;
    const y = clamp(movingY, 58, this.cssHeight - 110);

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = this.model.message === 'CASCADE' ? this.palette.danger : this.palette.ink;
    context.font = `760 ${clamp(this.cssWidth * 0.027, 10, 14)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = this.model.message === 'CASCADE' ? this.palette.danger : this.palette.primary;
    context.shadowBlur = 12;
    context.fillText(this.model.message, this.cssWidth / 2, y);
    context.restore();
  }

  private drawVignette(time: number): void {
    const context = this.context;
    const vignette = context.createRadialGradient(
      this.cssWidth / 2,
      this.cssHeight * 0.45,
      this.cssWidth * 0.18,
      this.cssWidth / 2,
      this.cssHeight * 0.45,
      Math.max(this.cssWidth, this.cssHeight) * 0.78,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, this.palette.isLight ? 'rgba(18,20,28,.08)' : 'rgba(0,0,0,.38)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, this.cssWidth, this.cssHeight);

    const scanY = (time * 0.035) % (this.cssHeight + 80) - 40;
    const scan = context.createLinearGradient(0, scanY - 28, 0, scanY + 28);
    scan.addColorStop(0, 'rgba(0,0,0,0)');
    scan.addColorStop(0.5, this.palette.isLight ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.045)');
    scan.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = scan;
    context.fillRect(0, scanY - 28, this.cssWidth, 56);
  }

  private worldBottomToScreen(worldY: number): number {
    return this.cssHeight - this.floorMargin - (worldY - this.model.cameraY) * this.unit;
  }

  private roundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const safeRadius = Math.min(Math.max(0, radius), Math.abs(width) / 2, Math.abs(height) / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }
}
