import Phaser from 'phaser';
import { campaign } from '../core/session';
import { autosave } from '../core/session';
import { controlRooms, fnInfo } from '../data/control';
import { palette } from '../data/palette';
import { claimFoothold, claimProblem } from '../sim/campaign';
import { SECTION_FNS, type SectionFn } from '../sim/expedition';
import { Button } from '../ui/Button';
import { makePanel } from '../ui/Panel';
import { bodyText, stencilText, textContext } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

const ROW = { x: 180, y: 186, w: 1560, h: 140, step: 150 };

/** The five section functions: what each control room asks, and which ones the gang holds. */
export class Footholds extends ScreenScene {
  private note = '';

  constructor() {
    super(SceneKeys.Footholds);
  }

  protected override onCreate(): void {
    this.note = '';
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  protected build(root: Phaser.GameObjects.Container): void {
    textContext.dense = true;
    try {
      this.buildAll(root);
    } finally {
      textContext.dense = false;
    }
  }

  private buildAll(root: Phaser.GameObjects.Container): void {
    const c = campaign();
    const signal = this.signal;
    root.add(stencilText(this, 84, 36, 'Footholds', 90, palette.text, { spacing: 0.06, fixed: true }));
    const hint = this.note || 'Win a section\'s control room on an expedition, bring the squad home, then claim it with power. A claimed foothold pays power every expedition.';
    root.add(bodyText(this, 90, 142, hint.toUpperCase(), 15, palette.textMuted, { spacing: 0.08, wrap: 1700 }));
    root.add(bodyText(this, 1740, 70, `POWER ${c.power}`, 40, signal, { originX: 1, weight: '700' }));

    SECTION_FNS.forEach((fn, i) => {
      const y = ROW.y + i * ROW.step;
      const def = controlRooms.find((q) => q.fn === fn)!;
      const hold = c.footholds.find((f) => f.fn === fn);
      root.add(makePanel(this, { x: ROW.x, y, w: ROW.w, h: ROW.h, bolts: true, border: hold?.claimed ? signal : undefined, borderWidth: hold?.claimed ? 3 : undefined }));
      root.add(stencilText(this, ROW.x + 32, y + 12, `${fnInfo[fn].name} · ${def.room}`, 32, hold ? palette.text : palette.textMuted, { spacing: 0.05 }));
      root.add(bodyText(this, ROW.x + 32, y + 58, fnInfo[fn].job, 18, palette.textMuted, { wrap: 1000 }));
      root.add(bodyText(this, ROW.x + 32, y + ROW.h - 24, `FIRST CAPTURE: ${def.reward.note}`.toUpperCase(), 13, palette.textMuted, { spacing: 0.08 }));
      const state = hold
        ? hold.claimed
          ? `CLAIMED · +${c.cfg.footholdIncome(hold.tier)} POWER EACH EXPEDITION`
          : `TAKEN AT TIER ${hold.tier} · ${hold.rooms} ROOMS`
        : 'NOT TAKEN';
      root.add(bodyText(this, ROW.x + ROW.w - 36, y + 22, state, 16, hold?.claimed ? signal : hold ? palette.text : palette.textMuted, { originX: 1, spacing: 0.1 }));
      if (hold && !hold.claimed) {
        const problem = claimProblem(c, fn);
        root.add(
          new Button(this, {
            x: ROW.x + ROW.w - 36 - 330, y: y + 54, w: 330, h: 60, label: `Claim ${hold.cost}`, size: 28, state: problem ? 'offline' : 'live', accent: !problem, signal,
            key: String(i + 1), onClick: () => this.claim(fn)
          })
        );
      }
    });

    root.add(
      new Button(this, { x: ROW.x, y: 950, w: 330, h: 84, label: 'Back', size: 36, state: 'live', signal, key: 'Esc', onClick: () => this.leave() })
    );
  }

  private claim(fn: SectionFn): void {
    const c = campaign();
    if (claimProblem(c, fn)) {
      this.note = claimProblem(c, fn) ?? '';
    } else {
      this.note = claimFoothold(c, fn);
      autosave();
    }
    this.time.delayedCall(0, () => this.rebuild());
  }

  private leave(): void {
    this.scene.start(SceneKeys.Hub);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') return this.leave();
    const n = Number(e.key);
    if (n >= 1 && n <= SECTION_FNS.length) this.claim(SECTION_FNS[n - 1]!);
  }
}
