import { Injectable, Pipe, PipeTransform, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Dictionary, I18nKey, en } from './en';
import { kn } from './kn';
import { ta } from './ta';
import { hi } from './hi';

export type Lang = 'en' | 'kn' | 'ta' | 'hi';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ (beta)' },
  { code: 'ta', label: 'தமிழ் (beta)' },
  { code: 'hi', label: 'हिन्दी (beta)' },
];
const DICTS: Record<Lang, Dictionary> = { en, kn, ta, hi };

/** Lightweight runtime i18n: signal-driven, so switching language needs no reload. */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>((localStorage.getItem('pp.lang') as Lang) || 'en');
  private readonly dict = computed(() => DICTS[this.lang()]);

  constructor() {
    const doc = inject(DOCUMENT);
    effect(() => {
      localStorage.setItem('pp.lang', this.lang());
      doc.documentElement.lang = this.lang();
    });
  }

  t(key: I18nKey, params?: Record<string, string | number>): string {
    let s = this.dict()[key] ?? en[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
    return s;
  }
}

@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(key: I18nKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
