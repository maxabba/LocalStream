exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization - not macOS');
    return;
  }

  // Check if we have the required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('Skipping notarization: Missing required environment variables');
    console.warn('Required: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appName} at ${appPath}...`);

  try {
    // Dynamic import for ES module
    const { notarize } = await import('@electron/notarize');

    await notarize({
      appBundleId: 'com.localstream.app',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId
    });

    console.log(`✅ Successfully notarized ${appName}`);
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
