import { isEnrichPlaceholderTitle, resolveDisplayTitle } from '../i18n';

// t() 대역 — 키를 그대로 돌려줘 어떤 문구 분기를 탔는지 키로 단언한다.
const t = (key: string) => key;

const base = { language: 'vi' as const };

describe('isEnrichPlaceholderTitle', () => {
  it('제목만 있고 본문이 없으면 enrich 임시 제목이다', () => {
    expect(isEnrichPlaceholderTitle('9월 10일의 기억', null)).toBe(true);
  });

  it('본문이 있으면 임시 제목이 아니다', () => {
    expect(isEnrichPlaceholderTitle('하얗고 소중한 뭉치', '오늘은 …')).toBe(false);
  });

  it('제목이 없으면 임시 제목이 아니다 — 본문도 없어도 마찬가지', () => {
    expect(isEnrichPlaceholderTitle(null, null)).toBe(false);
    expect(isEnrichPlaceholderTitle('', null)).toBe(false);
  });
});

describe('resolveDisplayTitle — 4상태 계약', () => {
  it('① enrich 창(title 有 / content 無): 원문을 노출하지 않고 분석 중으로 대체한다', () => {
    expect(
      resolveDisplayTitle(
        { ...base, title: '커피 한 잔', content: null, caption: 'a cup of coffee', analysisStatus: 'done' },
        t,
      ),
    ).toBe('home.analyzing');
  });

  it('② 영구 미생성(title 無 / content 無 / caption 有): 캡션 폴백을 유지한다', () => {
    expect(
      resolveDisplayTitle(
        {
          ...base,
          title: null,
          content: null,
          caption: 'a computer monitor and a cup of coffee',
          analysisStatus: 'done',
        },
        t,
      ),
    ).toBe('a computer monitor and a cup of coffee');
  });

  it('③ 실패(전부 無 / status failed): 분석 실패를 표시한다', () => {
    expect(
      resolveDisplayTitle({ ...base, title: null, content: null, analysisStatus: 'failed' }, t),
    ).toBe('home.analysisFailed');
  });

  it('④ 정상(title 有 / content 有): 제목 원문을 그대로 표시한다', () => {
    expect(
      resolveDisplayTitle(
        { ...base, title: 'Một ngày yên bình', content: 'Hôm nay …', analysisStatus: 'done' },
        t,
      ),
    ).toBe('Một ngày yên bình');
  });
});

describe('resolveDisplayTitle — 부수 계약', () => {
  it('enrich 창이라도 실패 상태면 분석 실패가 우선한다', () => {
    expect(
      resolveDisplayTitle({ ...base, title: '커피 한 잔', content: null, analysisStatus: 'failed' }, t),
    ).toBe('home.analysisFailed');
  });

  it('분석 중(queued/running)이고 아무 값도 없으면 분석 중을 표시한다', () => {
    expect(
      resolveDisplayTitle({ ...base, title: null, content: null, analysisStatus: 'queued' }, t),
    ).toBe('home.analyzing');
  });

  it('아무 값도 없고 상태가 done 이면 제목 없음으로 떨어진다', () => {
    expect(
      resolveDisplayTitle({ ...base, title: null, content: null, analysisStatus: 'done' }, t),
    ).toBe('common.noTitle');
  });

  it('ko 캡션이 있으면 영문 캡션보다 우선한다', () => {
    expect(
      resolveDisplayTitle(
        { ...base, title: null, content: null, captionKo: '커피와 모니터', caption: 'monitor', analysisStatus: 'done' },
        t,
      ),
    ).toBe('커피와 모니터');
  });
});
