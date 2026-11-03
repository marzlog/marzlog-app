/**
 * D11-c — plugins/withAndroidFontScaleConfigChange.js
 * MainActivity android:configChanges 에 fontScale 을 더한다(기존 값 보존·중복 방지).
 * 실제 AndroidManifest XML 문자열을 파싱 → 적용 → 다시 문자열로 만들어 확인한다.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin = require('../../../plugins/withAndroidFontScaleConfigChange');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { XML } = require('expo/config-plugins');

const { addFontScale, applyFontScaleConfigChange } = plugin;

const manifestXml = (configChanges: string | null) => `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
    <activity android:name=".MainActivity"${configChanges === null ? '' : ` android:configChanges="${configChanges}"`} android:launchMode="singleTask" android:exported="true"/>
    <activity android:name=".Other" android:configChanges="orientation"/>
  </application>
</manifest>`;

async function transform(xml: string): Promise<string> {
  const parsed = await XML.parseXMLAsync(xml);
  return XML.format(applyFontScaleConfigChange(parsed));
}

const configChangesOf = (xml: string, name: string) =>
  new RegExp(`android:name="${name.replace('.', '\\.')}"[^>]*android:configChanges="([^"]*)"`).exec(xml)?.[1] ?? null;

const EXPO_DEFAULT = 'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode';

describe('addFontScale', () => {
  it('기존 값을 보존하고 끝에 fontScale 을 더한다', () => {
    expect(addFontScale(EXPO_DEFAULT)).toBe(`${EXPO_DEFAULT}|fontScale`);
  });

  it('이미 있으면 중복으로 넣지 않는다', () => {
    expect(addFontScale('orientation|fontScale|uiMode')).toBe('orientation|fontScale|uiMode');
  });

  it.each([undefined, null, ''])('값이 없으면 fontScale 하나 (%p)', (value) => {
    expect(addFontScale(value)).toBe('fontScale');
  });

  it('공백·빈 항목은 정리한다', () => {
    expect(addFontScale(' orientation || uiMode ')).toBe('orientation|uiMode|fontScale');
  });
});

describe('applyFontScaleConfigChange — manifest 문자열 변환', () => {
  it('MainActivity 의 configChanges 에 fontScale 이 들어간다', async () => {
    const out = await transform(manifestXml(EXPO_DEFAULT));
    expect(configChangesOf(out, '.MainActivity')).toBe(`${EXPO_DEFAULT}|fontScale`);
  });

  it('다른 activity 는 건드리지 않는다', async () => {
    const out = await transform(manifestXml(EXPO_DEFAULT));
    expect(configChangesOf(out, '.Other')).toBe('orientation');
  });

  it('두 번 적용해도 한 번만 들어간다 (prebuild 반복 대비)', async () => {
    const once = await transform(manifestXml(EXPO_DEFAULT));
    const twice = await transform(once);
    expect(configChangesOf(twice, '.MainActivity')!.split('|').filter((p) => p === 'fontScale')).toHaveLength(1);
  });

  it('configChanges 속성이 없으면 새로 만든다', async () => {
    const out = await transform(manifestXml(null));
    expect(configChangesOf(out, '.MainActivity')).toBe('fontScale');
  });

  it('MainActivity 가 없으면 예외 (조용히 넘어가지 않는다)', async () => {
    const parsed = await XML.parseXMLAsync(
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".X"/></application></manifest>',
    );
    expect(() => applyFontScaleConfigChange(parsed)).toThrow();
  });
});

describe('plugin export', () => {
  it('config plugin 함수로 export 된다 (app.json plugins 등록용)', () => {
    expect(typeof plugin).toBe('function');
    expect(plugin.name).toBe('withAndroidFontScaleConfigChange');
  });
});
