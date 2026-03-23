const config = require("./app.json");

const androidConfig = config.expo.android;

if (process.env.GOOGLE_SERVICES_JSON) {
  androidConfig.googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
}

module.exports = config;
