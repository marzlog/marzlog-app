const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

/**
 * D11-c · B-IMAGEPICKER-AFTER-CONFIG-CHANGE / B-FONT-SCALE-STALE-LAYOUT
 *
 * MainActivity 의 android:configChanges 에 fontScale 을 더한다. 시스템 글자 크기를 바꿔도
 * Android 가 MainActivity 를 다시 만들지 않게 해서, 피커가 떠 있는 동안 액티비티가 파괴돼
 * 선택 결과가 pending 으로 밀리고 expo-image-picker 가 isPickerOpen 에 고착되는 경로를 막는다.
 * 기존 값은 보존하고 이미 있으면 다시 넣지 않는다. 네이티브 변경이라 빌드에만 반영된다(OTA 불가).
 */
const FONT_SCALE = "fontScale";

/** "a|b|c" 에 fontScale 을 중복 없이 더한 값. 빈 값이면 fontScale 하나. */
function addFontScale(configChanges) {
  const parts = String(configChanges || "")
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.includes(FONT_SCALE)) parts.push(FONT_SCALE);
  return parts.join("|");
}

/** AndroidManifest(modResults) 의 MainActivity 에 적용한다. 매니페스트를 그대로 돌려준다. */
function applyFontScaleConfigChange(androidManifest) {
  const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
  mainActivity.$["android:configChanges"] = addFontScale(mainActivity.$["android:configChanges"]);
  return androidManifest;
}

function withAndroidFontScaleConfigChange(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = applyFontScaleConfigChange(config.modResults);
    return config;
  });
}

module.exports = withAndroidFontScaleConfigChange;
module.exports.addFontScale = addFontScale;
module.exports.applyFontScaleConfigChange = applyFontScaleConfigChange;
