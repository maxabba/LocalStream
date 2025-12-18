# 🔧 Fix Crash LocalStream su Mac M3

## TL;DR - Quick Fix

Sul Mac M3 dove l'app crasha, esegui:

```bash
sudo xattr -cr /Applications/LocalStream.app
```

Poi riapri l'app. Dovrebbe funzionare.

---

## Problema

LocalStream crashava all'avvio su macOS M3 con errore **SIGTRAP**.

**Causa**: Squirrel.framework (auto-updater) incompatibile con:
- App firmata ma non notarizzata
- Hardened runtime abilitato
- macOS 15 su chip M3

---

## Soluzioni Disponibili

### ✅ Soluzione 1: Comando xattr (RAPIDA)

```bash
# Rimuove attributi di quarantena
sudo xattr -cr "/path/to/LocalStream.app"
```

Funziona con qualsiasi versione dell'app.

---

### ✅ Soluzione 2: Nuova Build (RACCOMANDATA)

Ho creato una nuova build con `hardenedRuntime: false`:

**File**: `dist/LocalStream-1.0.19-arm64-mac.zip`

**Installazione**:
1. Decomprimi il file zip
2. Sposta `LocalStream.app` in `/Applications`
3. Esegui: `sudo xattr -cr /Applications/LocalStream.app`
4. Apri l'app

---

### ✅ Soluzione 3: Build Unsigned (TESTING)

Per test locale, build completamente senza firma:

**File**: `~/Downloads/LocalStream-Unsigned.app`

**Uso**:
```bash
sudo xattr -cr ~/Downloads/LocalStream-Unsigned.app
open ~/Downloads/LocalStream-Unsigned.app
```

Se macOS blocca, vai in **Preferenze Sistema > Privacy e Sicurezza** e clicca "Apri comunque".

---

## Build Disponibili per Test

| Build | Ubicazione | Code Signing | Hardened Runtime | Note |
|-------|-----------|--------------|------------------|------|
| **Standard** | `dist/LocalStream-1.0.19-arm64-mac.zip` | ✅ Firmato | ❌ Disabilitato | **RACCOMANDATO** |
| **No-Hardened** | `~/Downloads/LocalStream-NoHardened.app` | ✅ Firmato | ❌ Disabilitato | Copia precedente |
| **Unsigned** | `~/Downloads/LocalStream-Unsigned.app` | ❌ Adhoc | ❌ Disabilitato | Solo per test |

---

## Verifica del Fix

Dopo l'installazione, controlla:

```bash
# 1. Lancia l'app
open /Applications/LocalStream.app

# 2. Verifica che non crashi (no SIGTRAP in Console.app)

# 3. Check logs
log stream --predicate 'process == "LocalStream"' --level info
```

**Output atteso**:
```
✅ HTTPS certificates found
🎛️  BandwidthManager initialized
📊 Quality tiers loaded
🚀 LocalStream Server Starting...
```

---

## Modifiche Applicate

**File**: `package.json`

```diff
"mac": {
    ...
-   "hardenedRuntime": true,
+   "hardenedRuntime": false,
    ...
}
```

**Motivo**: Elimina il conflitto tra Squirrel.framework Swift runtime e macOS M3 security validation.

---

## Se Crasha Ancora

1. **Usa la build unsigned**:
   ```bash
   sudo xattr -cr ~/Downloads/LocalStream-Unsigned.app
   open ~/Downloads/LocalStream-Unsigned.app
   ```

2. **Raccogli crash report**:
   - Console.app > Crash Reports > LocalStream
   - Inviami il file `.crash`

3. **Test server standalone**:
   ```bash
   cd /path/to/LocalStream
   node server.js
   ```

   Se funziona, il problema è solo nell'Electron wrapper.

---

## Documentazione Completa

- 📄 `TEST-M3-FIX.md` - Istruzioni dettagliate per testing
- 📄 `LONG-TERM-FIX.md` - Soluzioni permanenti (notarizzazione, electron-updater)
- 📄 `CRASH-ANALYSIS-SUMMARY.md` - Analisi tecnica completa del crash

---

## Next Steps

### Per Distribuzione Pubblica

**Opzione A - Notarizzazione Apple** (BEST):
- Costo: $99/anno (Apple Developer Program)
- Beneficio: Nessun warning per utenti, esperienza perfetta
- Vedi: `LONG-TERM-FIX.md` per implementazione

**Opzione B - Rimuovere Squirrel** (FREE):
- Migra a `electron-updater`
- Elimina Squirrel.framework completamente
- Vedi: `LONG-TERM-FIX.md` per codice esempio

### Per Uso Personale

**Configurazione Attuale** (`hardenedRuntime: false`):
- ✅ Funziona su M3 con `xattr -cr`
- ✅ Firmato con Developer ID
- ⚠️ Utenti devono rimuovere quarantine manualmente

---

## Supporto

Se hai problemi:

1. Controlla i crash logs in Console.app
2. Verifica attributi quarantena: `xattr -l /Applications/LocalStream.app`
3. Testa versione unsigned come fallback
4. Inviami il crash report completo

---

**Fix Version**: 1.0.19+
**Data**: 18 Dicembre 2025
**Status**: ✅ Fix pronto per test su M3
