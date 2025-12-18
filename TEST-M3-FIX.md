# Test LocalStream Fix per M3 Crash

## Problema Originale
- App crasha all'avvio su macOS M3 con SIGTRAP
- Errore in Squirrel.framework (auto-updater)
- Causato da: hardened runtime + app non notarizzata + Swift runtime su M3

## Soluzioni da Testare

### Soluzione A: Rimuovi Attributi Quarantena (RAPIDA)

Sul Mac M3, prima di aprire l'app:

```bash
# Se l'app è in Applications
sudo xattr -cr "/Applications/LocalStream.app"

# Oppure ovunque sia installata
sudo xattr -cr "/path/to/LocalStream.app"
```

Poi apri l'app normalmente.

---

### Soluzione B: Usa Build Senza Hardened Runtime (TESTARE)

Ho creato una nuova build con `hardenedRuntime: false`:

**File**: `dist/LocalStream-1.0.19-arm64-mac.zip` (rebuild alle 19:45)

**Installazione**:
1. Decomprimi il file zip
2. Rimuovi l'app vecchia da Applications
3. Sposta la nuova LocalStream.app in Applications
4. Prima di aprirla, rimuovi quarantena:
   ```bash
   sudo xattr -cr "/Applications/LocalStream.app"
   ```
5. Apri l'app

**Cosa aspettarsi**:
- L'app dovrebbe aprirsi senza crash
- macOS potrebbe mostrare "non può essere verificata" - clicca "Apri comunque" in Preferenze Sistema > Privacy e Sicurezza

---

### Soluzione C: Build Senza Code Signing (TESTARE)

Build completamente unsigned (nessuna firma digitale):

**File**: Copia in `~/Downloads/LocalStream-Unsigned.app`

**Installazione**:
1. Rimuovi l'app vecchia da Applications
2. Sposta `LocalStream-Unsigned.app` in Applications
3. **IMPORTANTE**: macOS bloccherà l'app non firmata. Per aprirla:

   **Metodo 1 - Rimuovi quarantena**:
   ```bash
   sudo xattr -cr "/Applications/LocalStream-Unsigned.app"
   ```

   **Metodo 2 - Bypass Gatekeeper**:
   - Click destro sull'app > "Apri"
   - Oppure: Preferenze Sistema > Privacy e Sicurezza > "Apri comunque"

Questa versione NON ha code signing né hardened runtime - dovrebbe funzionare al 100% su M3.

---

## Debug Aggiuntivo

Se crasha ancora, cattura il crash report:

```bash
# Lancia l'app e se crasha, recupera il log
log show --predicate 'process == "LocalStream"' --last 1m --info

# Oppure guarda Console.app > Crash Reports > LocalStream
```

Inviami il nuovo crash report.

---

## Modifiche Apportate

**File modificato**: `package.json`

```diff
"mac": {
    ...
-   "hardenedRuntime": true,
+   "hardenedRuntime": false,
    ...
}
```

Questo disabilita il hardened runtime che causava conflitti con Squirrel.framework su M3.

---

## Prossimi Passi

Se la Soluzione B funziona, possiamo considerare:

1. **Rimuovere completamente Squirrel**: Implementare `electron-updater` nativo
2. **Notarizzazione Apple**: Richiede Apple Developer Program ($99/anno)
3. **Electron Update**: Aggiornare a Electron 30+ (può risolvere bug M3)

---

## Test Checklist

- [ ] Soluzione A testata (xattr -cr)
- [ ] Soluzione B testata (hardened runtime disabled)
- [ ] App si apre senza crash
- [ ] Server parte correttamente
- [ ] Bandwidth manager si inizializza
- [ ] GUI funziona normalmente

---

**Note**: L'app è ancora firmata con Developer ID ma non notarizzata. Per distribuzione pubblica servirà la notarizzazione Apple.
