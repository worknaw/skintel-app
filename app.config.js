const appJson = require('./app.json');

/**
 * Expo cannot interpolate environment variables in app.json. Keep the Android
 * Maps key outside source control and inject it only while building the app.
 */
module.exports = () => {
  const config = appJson.expo;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...(googleMapsApiKey
        ? [['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]]
        : []),
    ],
    extra: {
      ...config.extra,
      mapsAvailable: Boolean(googleMapsApiKey),
    },
  };
};
