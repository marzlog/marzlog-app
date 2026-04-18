const { withGradleProperties } = require("expo/config-plugins");

/**
 * Increase Gradle JVM heap for New Architecture builds.
 * Default 2048m is often insufficient with many native modules.
 */
module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    // Replace or add org.gradle.jvmargs
    const idx = props.findIndex(
      (p) => p.type === "property" && p.key === "org.gradle.jvmargs"
    );
    const value = "-Xmx4096m -XX:MaxMetaspaceSize=512m";

    if (idx >= 0) {
      props[idx].value = value;
    } else {
      props.push({ type: "property", key: "org.gradle.jvmargs", value });
    }

    return config;
  });
};
