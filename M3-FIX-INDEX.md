# 📚 LocalStream M3 Fix - Indice Completo

Navigazione rapida per tutta la documentazione sul fix del crash M3.

---

## 🚀 Inizia Qui

### Se hai fretta
👉 **[M3-FIX-README.md](M3-FIX-README.md)** - Quick start con comando rapido

### Se vuoi capire tutto
👉 **[M3-CRASH-SOLUTION-COMPLETE.md](M3-CRASH-SOLUTION-COMPLETE.md)** - Sintesi completa

---

## 📖 Documentazione per Scenario

### 🧪 Vuoi Testare Subito il Fix

**Files da leggere**:
1. [M3-FIX-README.md](M3-FIX-README.md) - Quick start
2. [TEST-M3-FIX.md](TEST-M3-FIX.md) - Istruzioni dettagliate

**Script da eseguire**:
```bash
./test-m3-fix.sh
```

**Build da usare**:
- `dist/LocalStream-1.0.19-arm64-mac.zip`

**Comando chiave**:
```bash
sudo xattr -cr /Applications/LocalStream.app
```

---

### 🍎 Vuoi Configurare Notarizzazione

**Files da leggere**:
1. [NOTARIZATION-SETUP.md](NOTARIZATION-SETUP.md) - Setup completo
2. [M3-FIX-MIGRATION.md](M3-FIX-MIGRATION.md) - Migrazione

**Files da verificare**:
- `scripts/notarize.js` - Script notarizzazione
- `package.json` - Configurazione

**GitHub secrets da verificare**:
```bash
gh secret list
# Devono esserci tutti e 5
```

**Next step**:
```bash
git tag v1.0.20
git push origin v1.0.20
```

---

### 🔍 Vuoi Capire la Causa Tecnica

**Files da leggere**:
1. [CRASH-ANALYSIS-SUMMARY.md](CRASH-ANALYSIS-SUMMARY.md) - Analisi completa
2. [LONG-TERM-FIX.md](LONG-TERM-FIX.md) - Soluzioni alternative

**Concetti chiave**:
- Squirrel.framework crash
- Swift runtime su M3
- Hardened runtime + notarizzazione

**Stack trace**:
```
Thread 0: CrBrowserMain
Exception: EXC_BREAKPOINT (SIGTRAP)
Binary: Squirrel.framework
```

---

### 📦 Vuoi Distribuire l'App

**Files da leggere**:
1. [M3-FIX-MIGRATION.md](M3-FIX-MIGRATION.md) - Strategia migrazione
2. [NOTARIZATION-SETUP.md](NOTARIZATION-SETUP.md) - Release notarizzata
3. [FIX-DELIVERABLES.md](FIX-DELIVERABLES.md) - Build disponibili

**Soluzioni**:
- **Temporanea** (v1.0.19): hardenedRuntime: false + xattr
- **Permanente** (v1.0.20+): Notarizzazione Apple

**Release workflow**:
```bash
npm version patch
git push origin main --tags
# CI fa tutto automaticamente
```

---

## 📂 Struttura Documentazione

### File Principali (LEGGI QUESTI)

| File | Scopo | Quando Leggerlo |
|------|-------|----------------|
| **[M3-FIX-README.md](M3-FIX-README.md)** | Quick start | Prima cosa da leggere |
| **[M3-CRASH-SOLUTION-COMPLETE.md](M3-CRASH-SOLUTION-COMPLETE.md)** | Sintesi completa | Per overview totale |
| **[NOTARIZATION-SETUP.md](NOTARIZATION-SETUP.md)** | Setup notarizzazione | Per release pubblica |

### File di Test

| File | Scopo | Quando Usarlo |
|------|-------|--------------|
| **[TEST-M3-FIX.md](TEST-M3-FIX.md)** | Istruzioni test | Per testare fix |
| **[test-m3-fix.sh](test-m3-fix.sh)** | Script automatico | Esegui per test rapido |

### File di Analisi

| File | Scopo | Quando Leggerlo |
|------|-------|----------------|
| **[CRASH-ANALYSIS-SUMMARY.md](CRASH-ANALYSIS-SUMMARY.md)** | Analisi tecnica | Per capire causa |
| **[LONG-TERM-FIX.md](LONG-TERM-FIX.md)** | Soluzioni alternative | Per opzioni future |

### File di Migrazione

| File | Scopo | Quando Usarlo |
|------|-------|--------------|
| **[M3-FIX-MIGRATION.md](M3-FIX-MIGRATION.md)** | Guida migrazione | Da v1.0.19 a v1.0.20+ |
| **[FIX-DELIVERABLES.md](FIX-DELIVERABLES.md)** | Indice deliverables | Per lista completa |

### File di Implementazione

| File | Scopo | Tipo |
|------|-------|------|
| **[scripts/notarize.js](scripts/notarize.js)** | Script notarizzazione | Codice |
| **package.json** | Configurazione build | Config |
| **.github/workflows/release.yml** | CI/CD workflow | Workflow |

---

## 🎯 Workflow Consigliati

### Workflow 1: Test Rapido su M3

```
1. Leggi: M3-FIX-README.md
2. Esegui: ./test-m3-fix.sh
3. Verifica: App si apre senza crash
```

**Tempo**: 5 minuti

---

### Workflow 2: Setup Notarizzazione

```
1. Leggi: NOTARIZATION-SETUP.md
2. Verifica: gh secret list (tutti presenti?)
3. Commit: (già fatto)
4. Push: git push origin main
5. Tag: git tag v1.0.20 && git push origin v1.0.20
6. Wait: ~25 minuti per CI
7. Test: Download e verifica su M3
```

**Tempo**: 30 minuti (mostly automated)

---

### Workflow 3: Distribuzione Pubblica

```
1. Leggi: M3-FIX-MIGRATION.md
2. Test: Verifica fix temporaneo su M3
3. Release: Tag v1.0.20 (notarizzata)
4. Verifica: Test build notarizzato
5. Pubblica: GitHub release è già pronta
6. Comunica: Update README, release notes
```

**Tempo**: 1-2 ore

---

## 🔑 Comandi Chiave

### Test Locale
```bash
# Automatico
./test-m3-fix.sh

# Manuale
sudo xattr -cr /Applications/LocalStream.app
open /Applications/LocalStream.app
```

### Verifica Notarizzazione
```bash
# Check stapling
stapler validate LocalStream.app

# Check Gatekeeper
spctl --assess --verbose LocalStream.app

# Check code signing
codesign -dvv LocalStream.app
```

### Release
```bash
# Bump version
npm version patch

# Tag e push
git push origin main --tags

# Monitor CI
gh run watch
```

### Verifica Build
```bash
# Check GitHub secrets
gh secret list

# Check latest release
gh release view --web

# Download e test
curl -L -o test.zip <release-url>
unzip test.zip && open LocalStream.app
```

---

## 📊 Versioni e Soluzioni

| Versione | Soluzione | Hardened Runtime | Notarizzato | User Action |
|----------|-----------|-----------------|-------------|-------------|
| **≤ 1.0.18** | ❌ Nessuna | ✅ ON | ❌ NO | ❌ CRASH M3 |
| **1.0.19** | ⚠️ Temporanea | ❌ OFF | ❌ NO | `xattr -cr` |
| **1.0.20+** | ✅ Definitiva | ✅ ON | ✅ YES | Nessuna ✨ |

---

## 🐛 Troubleshooting Rapido

### App crasha su M3 (v1.0.19)
```bash
sudo xattr -cr /Applications/LocalStream.app
```

### Build notarizzata fallisce
```bash
# Check secrets
gh secret list

# Check logs
gh run view <run-id> --log | grep -i notariz
```

### App non si apre (macOS blocca)
```bash
# Check quarantine
xattr -l LocalStream.app

# Rimuovi
sudo xattr -cr LocalStream.app
```

### Verifica se è notarizzata
```bash
stapler validate LocalStream.app
# Output: "The validate action worked!" = notarizzata
```

---

## 📞 Link Utili

### Repository
- **GitHub**: https://github.com/maxabba/LocalStream
- **Releases**: https://github.com/maxabba/LocalStream/releases
- **Issues**: https://github.com/maxabba/LocalStream/issues

### Apple Developer
- **Portal**: https://developer.apple.com/account
- **Certificates**: https://developer.apple.com/account/resources/certificates
- **App Passwords**: https://appleid.apple.com

### Documentazione Esterna
- **electron-builder**: https://www.electron.build/
- **@electron/notarize**: https://github.com/electron/notarize
- **Apple Notarization**: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution

---

## ✅ Checklist Rapida

### Per Test Immediato
- [ ] Letto M3-FIX-README.md
- [ ] Build v1.0.19 disponibile
- [ ] Mac M3 disponibile
- [ ] Eseguito xattr -cr
- [ ] App si apre senza crash

### Per Release Notarizzata
- [ ] Letto NOTARIZATION-SETUP.md
- [ ] GitHub secrets verificati (5 totali)
- [ ] Commits pushed
- [ ] Tag v1.0.20 creato
- [ ] CI completato con successo
- [ ] Build testato su M3
- [ ] App si apre senza xattr

### Per Distribuzione
- [ ] Release notes aggiornate
- [ ] README aggiornato (no more xattr!)
- [ ] Test su multiple versioni macOS
- [ ] Test su M1/M2/M3 e Intel
- [ ] Feedback utenti raccolto

---

## 🎓 Glossario

**SIGTRAP**: Signal Trace Trap - Errore di breakpoint/debug
**Squirrel**: Framework auto-updater per Electron
**Hardened Runtime**: Feature sicurezza macOS
**Notarizzazione**: Processo Apple per validare app
**Gatekeeper**: Sistema sicurezza macOS per app
**xattr**: Extended attributes - metadati file macOS
**Quarantine**: Flag che macOS mette su file scaricati
**Stapling**: Attach notarization ticket all'app

---

## 📝 Note Finali

### Status Progetto
🟢 **COMPLETO E PRONTO**

### Commits Chiave
- `7eea135` - Fix temporaneo (hardenedRuntime: false)
- `a3f1856` - Notarizzazione configurata
- `d1afc2d` - Documentazione completa

### Prossimi Step
1. Test su M3 (opzionale ma raccomandato)
2. Tag v1.0.20 per release notarizzata
3. Distribuzione pubblica

### Supporto
- Documentazione: Questo indice e file correlati
- Issues: GitHub Issues
- Testing: `./test-m3-fix.sh`

---

**Ultimo Aggiornamento**: 18 Dicembre 2025, ore 20:50

**Versione Documentazione**: 1.0

**Autore**: Claude Code + Marco Abbattista
