import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** SVG "postmark" drawn in the style of a circular date stamp. Purely decorative, never an official mark. */
@Component({
  selector: 'pp-cancellation-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 120 120" [class.inked]="inked()" [style.--tilt.deg]="tilt()" role="img" [attr.aria-label]="label()">
      <defs>
        <path [attr.id]="pathId()" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="60" cy="60" r="56" class="ring outer" />
      <circle cx="60" cy="60" r="36" class="ring inner" />
      <text class="arc"><textPath [attr.href]="'#' + pathId()" startOffset="0">{{ arcText() }}</textPath></text>
      <text x="60" y="56" class="center big">{{ inked() ? dateText() : '—' }}</text>
      <text x="60" y="72" class="center small">{{ pin() }}</text>
    </svg>
  `,
  styles: `
    :host { display: inline-block; width: var(--mark-size, 96px); aspect-ratio: 1; }
    svg { width: 100%; height: 100%; color: var(--ink-faint); transition: transform .3s; }
    svg.inked { color: var(--ink-cancel); transform: rotate(var(--tilt)); }
    .ring { fill: none; stroke: currentColor; stroke-width: 2.2; }
    svg:not(.inked) .ring { stroke-dasharray: 4 4; }
    .inner { stroke-width: 1.4; }
    .arc { font: 700 9.5px/1 var(--font-mono); letter-spacing: 1.6px; fill: currentColor; text-transform: uppercase; }
    .center { text-anchor: middle; fill: currentColor; font-family: var(--font-mono); }
    .big { font-size: 11px; font-weight: 700; }
    .small { font-size: 9px; }
    svg.inked { opacity: .88; mix-blend-mode: multiply; }
  `,
})
export class CancellationMark {
  readonly office = input.required<string>();
  readonly pin = input<string>('');
  readonly date = input<string | undefined>(undefined);
  readonly seed = input<string>('');

  readonly inked = computed(() => !!this.date());
  readonly pathId = computed(() => 'arc-' + this.seed().replace(/[^a-z0-9]/gi, ''));
  readonly arcText = computed(() => {
    const t = this.office().replace(/\b(Post Office|Branch|Head)\b/gi, '').replace(/\s+/g, ' ').trim().toUpperCase();
    return (t.length > 26 ? t.slice(0, 25) + '…' : t) + ' ★ ';
  });
  readonly dateText = computed(() => {
    const d = this.date();
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y.slice(2)}`;
  });
  /** Deterministic small tilt so each stamp looks hand-applied. */
  readonly tilt = computed(() => {
    let h = 0;
    for (const c of this.seed()) h = (h * 31 + c.charCodeAt(0)) | 0;
    return (h % 17) - 8;
  });
  readonly label = computed(() => (this.inked() ? `Collected ${this.dateText()} at ${this.office()}` : `Not collected: ${this.office()}`));
}
