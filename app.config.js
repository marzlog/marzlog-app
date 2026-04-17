const config = require("./app.json");

const androidConfig = config.expo.android;
const iosConfig = config.expo.ios;

if (process.env.GOOGLE_SERVICES_JSON) {
  androidConfig.googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
}

if (process.env.GOOGLE_SERVICES_INFOPLIST) {
  iosConfig.googleServicesFile = process.env.GOOGLE_SERVICES_INFOPLIST;
}

module.exports = config;
