/**
 * PAYWALL 문구 병합 확인 (명세 §5) — docs/paywall/copy/{lang}.json 74키가 로케일 파일에
 * 같은 값으로 들어 있고, 4개 언어의 키 집합이 같은지.
 */
import * as fs from 'fs';
import * as path from 'path';

const LANGS = ['ko', 'en', 'vi', 'th'] as const;
const ROOT = path.resolve(__dirname, '../../..');

type Json = { [k: string]: Json | string };

function leaves(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, leaves(v, key));
  }
  return out;
}

function read(rel: string): Record<string, string> {
  return leaves(JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
}

describe.each(LANGS)('%s', (lang) => {
  const copy = read(`docs/paywall/copy/${lang}.json`);
  const locale = read(`src/i18n/locales/${lang}.json`);

  it('copy 74키가 로케일에 같은 값으로 있다', () => {
    expect(Object.keys(copy)).toHaveLength(74);
    for (const [key, value] of Object.entries(copy)) {
      expect([key, locale[key]]).toEqual([key, value]);
    }
  });
});

it('4개 언어 로케일의 키 집합이 같다', () => {
  const sets = LANGS.map((lang) => Object.keys(read(`src/i18n/locales/${lang}.json`)).sort());
  for (const keys of sets.slice(1)) expect(keys).toEqual(sets[0]);
});
