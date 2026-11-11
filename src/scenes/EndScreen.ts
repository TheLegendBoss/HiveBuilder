import Phaser from 'phaser';
import { campaign, endCampaign, session } from '../core/session';
import { palette } from '../data/palette';
import { endStats } from '../sim/campaign';
import { Button } from '../ui/Button';
import { makePanel } from '../ui/Panel';
import { makeStamp } from '../ui/Stamp';
import { bodyText, stencilText } from '../ui/text';
import { SceneKeys } from './keys';
import { ScreenScene } from './ScreenScene';

export type EndMode = 'lost' | 'won';

const PANEL = { x: 360, y: 150, w: 1200, h: 640 };

/** Shown when the campaign is lost (nobody left who can go out) or a floor is finished. */
export class EndScreen extends ScreenScene {
  private mode: EndMode = 'lost';

  constructor() {
    super(SceneKeys.EndScreen);
  }

  init(data: { mode?: EndMode }): void {
    this.mode = data?.mode ?? 'lost';
  }

  protected override onCreate(): void {
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  private primary(): void {
    if (this.mode === 'won') this.scene.start(SceneKeys.Hub);
    else this.newCampaign();
  }

  private newCampaign(): void {
    endCampaign();
    this.scene.start(SceneKeys.SandboxSetup);
  }

  private menu(): void {
    this.scene.start(SceneKeys.MainMenu);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.primary();
    else if (e.key === 'Escape') this.menu();
    else if (e.key.toLowerCase() === 'n' && this.mode === 'won') this.newCampaign();
  }

  protected build(root: Phaser.GameObjects.Container): void {
    const signal = this.signal;
    const won = this.mode === 'won';
    const c = session.campaign ?? campaign();
    const s = endStats(c);
    const accent = won ? signal : palette.danger;
    root.add(makePanel(this, { ...PANEL, bolts: true, hazard: true, scan: true, border: accent, borderWidth: 3 }));
    root.add(stencilText(this, PANEL.x + 56, PANEL.y + 44, won ? 'Floor cleared' : 'Campaign lost', 96, palette.text, { spacing: 0.05, fixed: true }));
    const stamp = makeStamp(this, won ? 'Survived' : 'Game over', 40, accent);
    stamp.container.setPosition(PANEL.x + PANEL.w - 230, PANEL.y + 86);
    root.add(stamp.container);
    stamp.land(this.anim(200), session.settings.animSpeed);
    root.add(
      bodyText(
        this, PANEL.x + 60, PANEL.y + 170,
        won
          ? 'The squad came out the far side of the floor. The HQ is yours to keep building, or start a fresh campaign.'
          : 'Nobody is fit to go out and nothing you own can put anyone right. The gang is finished.',
        22, palette.textMuted, { wrap: PANEL.w - 120, lineSpacing: 6 }
      )
    );
    const rows: Array<[string, string]> = [
      ['EXPEDITIONS', String(s.expeditions)],
      ['FLOORS CLEARED', String(s.floorsCleared)],
      ['MOST SECTIONS IN A RUN', String(s.bestSections)],
      ['SQUAD WIPES', String(s.wipes)],
      ['DROIDS LOST FOR GOOD', s.lost.length ? s.lost.join(', ') : 'None'],
      ['HIGHEST TIER', String(s.topTier)],
      ['EAGLES IN THE BANK', String(s.eagles)]
    ];
    rows.forEach(([label, value], i) => {
      const y = PANEL.y + 262 + i * 46;
      root.add(bodyText(this, PANEL.x + 60, y, label, 16, palette.textMuted, { spacing: 0.14 }));
      root.add(bodyText(this, PANEL.x + PANEL.w - 60, y - 4, value, 26, palette.text, { originX: 1, weight: '700', wrap: 560 }));
      const rule = this.add.graphics();
      rule.fillStyle(palette.line, 1);
      rule.fillRect(PANEL.x + 60, y + 32, PANEL.w - 120, 1.5);
      root.add(rule);
    });
    const by = PANEL.y + PANEL.h + 20;
    root.add(
      new Button(this, {
        x: PANEL.x, y: by, w: 380, h: 84, label: won ? 'Keep playing' : 'New campaign', size: 28, align: 'center', state: 'live', accent: true, signal, key: 'Enter',
        onClick: () => this.primary()
      })
    );
    if (won) {
      root.add(
        new Button(this, {
          x: PANEL.x + 410, y: by, w: 380, h: 84, label: 'New campaign', size: 28, align: 'center', state: 'live', signal, key: 'N', onClick: () => this.newCampaign()
        })
      );
    }
    root.add(
      new Button(this, {
        x: PANEL.x + PANEL.w - 380, y: by, w: 380, h: 84, label: 'Main menu', size: 28, align: 'center', state: 'live', signal, key: 'Esc', onClick: () => this.menu()
      })
    );
  }
}
