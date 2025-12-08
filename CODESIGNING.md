# Apple Code Signing Setup for GitHub Actions

This document explains how to configure the GitHub repository secrets for macOS code signing and notarization.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### 1. APPLE_CERTIFICATE

Your Apple Developer ID Application certificate exported as a `.p12` file and base64 encoded.

**How to get it:**
1. Open **Keychain Access** on your Mac
2. Select **login** keychain and **My Certificates** category
3. Find your "Developer ID Application" certificate
4. Right-click → **Export "Developer ID Application: Your Name"**
5. Save as `.p12` file with a strong password
6. Convert to base64:
   ```bash
   base64 -i /path/to/certificate.p12 | pbcopy
   ```
7. The base64 string is now in your clipboard - paste it as the secret value

### 2. APPLE_CERTIFICATE_PASSWORD

The password you used when exporting the `.p12` certificate.

### 3. APPLE_ID

Your Apple ID email address (the one used for your Apple Developer account).

Example: `your.email@example.com`

### 4. APPLE_APP_SPECIFIC_PASSWORD

An app-specific password for notarization.

**How to generate it:**
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Click **Generate an app-specific password**
5. Give it a name like "GitHub Actions LocalStream"
6. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

### 5. APPLE_TEAM_ID

Your Apple Developer Team ID.

**How to find it:**
1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Your Team ID is shown in the top right corner (10-character string like `AB1234CDEF`)

Or via terminal:
```bash
xcrun altool --list-providers -u "your.email@example.com" -p "@keychain:AC_PASSWORD"
```

## Adding Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the 5 secrets listed above

## Testing the Setup

Once all secrets are configured:

1. Update the version in `package.json` (e.g., from `1.0.7` to `1.0.8`)
2. Commit and push the changes
3. Create and push a new tag:
   ```bash
   git tag v1.0.8
   git push origin v1.0.8
   ```
4. The GitHub Action will trigger automatically
5. Check the **Actions** tab to monitor the build progress

## What Happens During Build

1. The workflow imports your Developer ID certificate into a temporary keychain
2. electron-builder signs the app with your certificate
3. The app is notarized with Apple's servers
4. The signed and notarized app is packaged into a zip file
5. Users can download and run the app without any security warnings

## Troubleshooting

### Certificate Issues
- Make sure you're using a **Developer ID Application** certificate, not an **Apple Development** certificate
- Verify the certificate is valid and not expired in Keychain Access

### Notarization Fails
- Check that your Apple ID and app-specific password are correct
- Ensure your Team ID matches your Developer account
- Review the notarization logs in the GitHub Actions output

### App Still Shows Security Warning
- This means notarization failed - check the build logs
- Try notarizing manually first to test your credentials:
  ```bash
  xcrun notarytool submit your-app.zip --apple-id "your@email.com" --team-id "ABC123" --password "xxxx-xxxx-xxxx-xxxx" --wait
  ```
