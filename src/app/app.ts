import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18n, LANGS, Lang, TranslatePipe } from './i18n/i18n.service';
import { I18nKey } from './i18n/en';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly langs = LANGS;
  protected readonly nav: { path: string; key: I18nKey; icon: string }[] = [
    { path: '/', key: 'nav.home', icon: '✉' },
    { path: '/map', key: 'nav.map', icon: '◈' },
    { path: '/passport', key: 'nav.passport', icon: '▤' },
    { path: '/nearby', key: 'nav.nearby', icon: '◎' },
    { path: '/progress', key: 'nav.progress', icon: '★' },
    { path: '/guide', key: 'nav.guide', icon: '?' },
  ];

  setLang(v: string): void {
    this.i18n.lang.set(v as Lang);
  }
}
