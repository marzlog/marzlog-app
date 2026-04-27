const { withDangerousMod, withXcodeProject, IOSConfig } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * App-level iOS Privacy Manifest (PrivacyInfo.xcprivacy).
 *
 * Apple aggregates the union of the app manifest and SDK manifests, so this
 * declares only what the app's own code (and SDKs without their own manifest —
 * Sentry/Kakao/Google-Signin ship theirs via CocoaPods, not the JS package)
 * needs. Required-Reason API categories use Apple's published reason codes:
 * https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
 */

const PRIVACY_INFO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyTrackingDomains</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategorySystemBootTime</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>35F9.1</string>
			</array>
		</dict>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>C617.1</string>
			</array>
		</dict>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryDiskSpace</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>E174.1</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
`;

const FILE_NAME = "PrivacyInfo.xcprivacy";

const writeFile = (config) =>
  withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.platformProjectRoot;
      const projectName = cfg.modRequest.projectName;
      const dest = path.join(projectRoot, projectName, FILE_NAME);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, PRIVACY_INFO_XML);
      return cfg;
    },
  ]);

// xcode@3.0.1 project.addResourceFile + findPBXGroupKey({ name }) 조합은
// 같은 이름의 nested group을 잘못 잡으면 correctForPath에서 null을 throw함
// (EAS build 84ccae35 실패 원인). Expo 공식 IOSConfig.XcodeUtils 헬퍼로
// 그룹 lookup/생성과 build phase 등록을 위임해 회피한다.
const addToXcodeProject = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;
    const relPath = `${projectName}/${FILE_NAME}`;

    if (project.hasFile(relPath)) return cfg;

    IOSConfig.XcodeUtils.ensureGroupRecursively(project, projectName);
    const { uuid: targetUuid } = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName,
    });
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: relPath,
      groupName: projectName,
      isBuildFile: true,
      project,
      targetUuid,
    });
    return cfg;
  });

module.exports = function withPrivacyManifest(config) {
  config = writeFile(config);
  config = addToXcodeProject(config);
  return config;
};
