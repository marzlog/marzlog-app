/**
 * D10-c 문체 문구 — 4개 언어 키 존재·빈 값 없음·톤 라벨 중복 없음, 혜택 카피 규정(명세 §5).
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

const TONE_KEYS = [
  'tone.title',
  'tone.regenBody',
  'tone.settingsBody',
  'tone.regenConfirm',
  'tone.defaultBadge',
  'tone.sincere',
  'tone.sincereDesc',
  'tone.literary',
  'tone.literaryDesc',
  'tone.plain',
  'tone.plainDesc',
  'tone.saveFailed',
  'settings.diaryTone',
  'mediaDetail.toneLabel',
  'paywall.compare.toneSelect',
];

describe.each(LANGS)('%s', (lang) => {
  const raw = fs.readFileSync(path.join(ROOT, `src/i18n/locales/${lang}.json`), 'utf8');
  const locale = leaves(JSON.parse(raw));

  it('문체 키가 모두 있고 비어 있지 않다', () => {
    for (const key of TONE_KEYS) expect([key, (locale[key] ?? '').trim().length > 0]).toEqual([key, true]);
  });

  it('톤 라벨 3개·설명 3개는 서로 다르다', () => {
    const labels = ['sincere', 'literary', 'plain'].map((t) => locale[`tone.${t}`]);
    const descs = ['sincere', 'literary', 'plain'].map((t) => locale[`tone.${t}Desc`]);
    expect(new Set(labels).size).toBe(3);
    expect(new Set(descs).size).toBe(3);
  });

  it('상세 라벨은 {{tone}} 을 끼워 넣는다', () => {
    expect(locale['mediaDetail.toneLabel']).toContain('{{tone}}');
  });

  it('최상위 키가 중복되지 않는다(JSON.parse 가 앞 값을 덮어쓰는 것 방지)', () => {
    const topKeys = [...raw.matchAll(/^ {2}"([^"]+)":/gm)].map((m) => m[1]);
    expect(topKeys.length).toBe(new Set(topKeys).size);
    expect(topKeys.filter((k) => k === 'tone')).toHaveLength(1);
  });

  it('혜택 카피: 용량은 {{gb}} 보간, "AI 일기·검색 무제한" 류 금지(검색은 Plus 혜택 아님)', () => {
    for (const key of ['paywall.subhead', 'plusSheet.regenBody', 'plusSheet.storageBody', 'plusSuccess.body', 'subscription.footnote']) {
      expect([key, locale[key].includes('{{gb}}')]).toEqual([key, true]);
      expect(locale[key]).not.toMatch(/검색|search|tìm kiếm|ค้นหา/i);
    }
  });
});

it.each(['vi', 'th'] as const)('%s 혜택 문구에는 문체 언급이 없다(문체 UI 숨김 언어) — 키는 비교표용으로만 존재', (lang) => {
  const locale = leaves(JSON.parse(fs.readFileSync(path.join(ROOT, `src/i18n/locales/${lang}.json`), 'utf8')));
  const toneWords = [locale['tone.title'], locale['paywall.compare.toneSelect'], lang === 'vi' ? 'giọng văn' : 'สำนวน'];
  for (const key of ['paywall.subhead', 'plusSheet.regenBody', 'plusSheet.storageBody', 'plusSuccess.body', 'subscription.footnote']) {
    for (const word of toneWords) expect([key, locale[key].toLowerCase().includes(word.toLowerCase())]).toEqual([key, false]);
  }
});

it('ko·en 혜택 문구는 문체를 언급한다', () => {
  for (const [lang, word] of [
    ['ko', '문체'],
    ['en', 'writing style'],
  ] as const) {
    const locale = leaves(JSON.parse(fs.readFileSync(path.join(ROOT, `src/i18n/locales/${lang}.json`), 'utf8')));
    for (const key of ['paywall.subhead', 'plusSheet.regenBody', 'plusSheet.storageBody', 'plusSuccess.body', 'subscription.footnote']) {
      expect([key, locale[key].toLowerCase().includes(word)]).toEqual([key, true]);
    }
  }
});

it('ko·en 혜택 한 줄은 지정 문구 그대로', () => {
  const ko = leaves(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/ko.json'), 'utf8')));
  const en = leaves(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/en.json'), 'utf8')));
  expect(ko['paywall.subhead']).toBe('AI 일기 재생성 무제한 · 문체 선택 · {{gb}}GB 저장 공간');
  expect(en['paywall.subhead']).toBe('Unlimited AI diary rewrites · Writing style · {{gb}}GB storage');
});
