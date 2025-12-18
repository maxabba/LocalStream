# Soluzione Definitiva per M3 Crash

## Problema Identificato

Il crash SIGTRAP su macOS M3 è causato da **Squirrel.framework** (auto-updater) incluso automaticamente da electron-builder. Il framework usa componenti Swift che crashano durante l'inizializzazione quando:

- App è firmata ma NON notarizzata
- Hardened runtime è abilitato
- Sistema è macOS 15+ su Apple Silicon (M-series)

## Soluzioni a Lungo Termine

### Opzione 1: Rimuovere Squirrel e usare electron-updater (CONSIGLIATA)

Modificare `package.json`:

```json
{
  "build": {
    "mac": {
      "target": [
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "category": "public.app-category.utilities",
      "icon": "gui/icon.icns",
      "hardenedRuntime": false,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "publish": {
      "provider": "github",
      "owner": "maxabba",
      "repo": "LocalStream"
    }
  },
  "dependencies": {
    ...
    "electron-updater": "^6.1.7"
  }
}
```

**Vantaggi**:
- Nessun crash su M3
- Auto-update funziona ancora via GitHub releases
- Più leggero (no Squirrel.framework)

**Implementazione in `gui/main.js`**:

```javascript
const { autoUpdater } = require('electron-updater');

// Configura auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Check for updates on startup
app.whenReady().then(() => {
    createWindow();

    // Check dopo 3 secondi dall'avvio
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 3000);
});

// Events
autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-downloaded', info);
});
```

---

### Opzione 2: Notarizzazione Apple (BEST per distribuzione pubblica)

**Requisiti**:
- Apple Developer Program ($99/anno)
- Certificato "Developer ID Application"
- App Store Connect API key

**Setup**:

1. **Ottieni certificati da Apple Developer**

2. **Configura notarizzazione in `package.json`**:

```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": {
        "teamId": "38C8C426NW"
      }
    },
    "afterSign": "scripts/notarize.js"
  }
}
```

3. **Crea `scripts/notarize.js`**:

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.localstream.app',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: '38C8C426NW'
  });
};
```

4. **Variabili d'ambiente**:

```bash
export APPLE_ID="tua-email@apple.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

5. **Build con notarizzazione**:

```bash
npm install --save-dev @electron/notarize
npm run build:mac
```

**Vantaggi**:
- Nessun warning di sicurezza per gli utenti
- Hardened runtime abilitato (più sicuro)
- Distribuzione professionale

**Svantaggi**:
- Costo annuale $99
- Build più lenta (notarizzazione ~5-10 minuti)

---

### Opzione 3: Distribuire senza Code Signing (SOLO per uso personale)

**Configurazione attuale** (`hardenedRuntime: false`, firmato ma non notarizzato):

```json
{
  "build": {
    "mac": {
      "hardenedRuntime": false,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist"
    }
  }
}
```

**Pro**: Nessun costo, build veloce
**Contro**: Utenti devono fare `xattr -cr` manualmente

---

### Opzione 4: Aggiornare Electron (POSSIBILE FIX)

Electron 28.0.0 è vecchio. Le versioni più recenti potrebbero avere fix per M3.

**Aggiornamento**:

```bash
npm install --save-dev electron@latest electron-builder@latest
```

**Testa**:

```bash
npm run build:mac-arm
```

**Rischio**: Potrebbero servire modifiche al codice per compatibilità.

---

## Raccomandazione Finale

**Per uso personale/interno**:
- Usa **Opzione 1** (hardenedRuntime: false) ✅
- Istruisci utenti a fare `xattr -cr` prima di aprire l'app

**Per distribuzione pubblica**:
- Implementa **Opzione 2** (notarizzazione Apple) ✅
- Costa $99/anno ma esperienza utente perfetta
- Richiesto per distribuzione seria

**Per sviluppo/testing**:
- Build unsigned (`identity: null`) ✅
- Solo per testing locale, non distribuire

---

## File Modificati

**package.json** - Configurazione build:
```json
"hardenedRuntime": false  // Cambiato da true
```

**Prossimi step** (se implementi electron-updater):
- Aggiungi dipendenza `electron-updater`
- Modifica `gui/main.js` per gestire update events
- Configura GitHub releases per pubblicare aggiornamenti

---

## Testing

Prima di distribuire, testa su:
- ✅ Mac M1/M2/M3 (Apple Silicon)
- ✅ Mac Intel (x64)
- ✅ macOS 13 (Ventura)
- ✅ macOS 14 (Sonoma)
- ✅ macOS 15 (Sequoia)

---

**Stato attuale**: Configurazione con `hardenedRuntime: false` che risolve il crash M3 mantenendo la firma Developer ID.
