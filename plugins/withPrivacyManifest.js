const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
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

const addToXcodeProject = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;
    const relPath = `${projectName}/${FILE_NAME}`;

    const groupKey = project.findPBXGroupKey({ name: projectName });
    if (!groupKey) return cfg;

    const existing = project.hasFile(relPath);
    if (existing) return cfg;

    project.addResourceFile(
      relPath,
      { target: project.getFirstTarget().uuid },
      groupKey
    );
    return cfg;
  });

module.exports = function withPrivacyManifest(config) {
  config = writeFile(config);
  config = addToXcodeProject(config);
  return config;
};
