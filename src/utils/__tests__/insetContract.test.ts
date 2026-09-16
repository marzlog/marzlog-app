/**
 * Android edge-to-edge inset 계약 — B-ANDROID-EDGE-INSET (14차).
 *
 * app.json edgeToEdgeEnabled:true 에서 `react-native` 의 SafeAreaView 는 Android 패딩이 0 이다
 * (iOS 전용). 화면이 이 컴포넌트에 기대면 Android 에서 상태바에 겹친다 —
 * 회귀 가드로 소스를 직접 스캔한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.join(__dirname, '../../../app');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

/** `import { ... SafeAreaView ... } from 'react-native'` 를 쓰는 파일 */
function screensImportingRnSafeArea(): string[] {
  return walk(APP_DIR).filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    const m = src.match(/import\s*\{([\s\S]*?)\}\s*from\s*'react-native'/);
    return !!m && /\bSafeAreaView\b/.test(m[1]);
  });
}

it("app/ 어느 화면도 react-native 의 SafeAreaView 를 쓰지 않는다", () => {
  expect(screensImportingRnSafeArea().map((f) => path.relative(APP_DIR, f))).toEqual([]);
});

describe('하단 inset 적용 (내비바 가림 방지)', () => {
  const read = (rel: string) => fs.readFileSync(path.join(APP_DIR, rel), 'utf8');

  it('(tabs)/more.tsx 버전 워터마크가 떠 있는 탭바 높이까지 비운다(공유 상수)', () => {
    const src = read('(tabs)/more.tsx');
    expect(src).toMatch(/tabBarClearance\(insets\.bottom\)/);
    // 탭바 높이를 화면에 하드코딩하지 않는다
    expect(src).not.toMatch(/bottom:\s*(64|80|88)\b/);
  });

  it('(tabs)/_layout.tsx 이 같은 상수를 공유한다', () => {
    const src = read('(tabs)/_layout.tsx');
    expect(src).toMatch(/TAB_BAR_HEIGHT/);
    expect(src).toMatch(/TAB_BAR_MIN_BOTTOM/);
  });

  it('(tabs)/albums.tsx 가 insets 를 쓴다', () => {
    const src = read('(tabs)/albums.tsx');
    expect(src).toMatch(/useSafeAreaInsets/);
    expect(src).toMatch(/insets\.top/);
  });
});
