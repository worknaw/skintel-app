// Backport software-mansion/react-native-screens#4790 to Expo 57's 4.26.2.
const fs = require('node:fs');
const path = require('node:path');

const packageDir = path.dirname(require.resolve('react-native-screens/package.json'));
const version = require(path.join(packageDir, 'package.json')).version;
if (version !== '4.26.2') {
  throw new Error(`Review the RNScreens Fabric backport for installed version ${version}.`);
}
const file = path.join(packageDir, 'android/src/main/java/com/swmansion/rnscreens/ScreensModule.kt');
const source = fs.readFileSync(file, 'utf8');
const before = 'UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC) as FabricUIManager';
const after = '(UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC) ?: return) as FabricUIManager';
if (source.includes(after)) process.exit(0);
if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) {
  throw new Error('RNScreens Fabric backport target was not found exactly once.');
}
fs.writeFileSync(file, source.replace(before, after));
