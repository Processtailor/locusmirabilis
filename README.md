# Locus Mirabilis — GÖZETİM ALTINDASIN

[![CI & Deploy](https://github.com/Processtailor/locusmirabilis/actions/workflows/pages.yml/badge.svg)](https://github.com/Processtailor/locusmirabilis/actions/workflows/pages.yml)

A surveillance-state **telescreen** you talk to through a command line. The eye follows you. The clock
strikes thirteen. Requests are forwarded to units that do not answer and approved anyway. Nothing you
type leaves your browser, and you are expected to believe that.

- **Live:** https://processtailor.github.io/locusmirabilis/
- **Changelog (in fiction):** https://processtailor.github.io/locusmirabilis/changelog.html · [CHANGELOG.md](CHANGELOG.md)
- **Previous version (v1.3.1) for comparison:** https://processtailor.github.io/locusmirabilis/archive/v1/

Turkish first, English on a toggle. Kafka for the bureaucracy, Orwell for the atmosphere; the concept
(the eye, the terminal, `DOSYA_734`, `ERİŞİM İZNİ_217`, the `IZ → TRUST / RESIST` puzzle) is the
original one from v1.

---

## 1. Quick start

Open the live site, or run it locally — it is plain static HTML/CSS/JS with no build step:

```bash
npm install          # dev tooling only (ESLint, Playwright)
npm start            # http://127.0.0.1:4173/
# or, without Node:
python3 -m http.server 4173
```

Opening `index.html` straight from disk also works (the service worker simply stays off).

---

## 2. User manual / Kullanım kılavuzu

### Interactions
| Action | Keyboard | On-screen |
| --- | --- | --- |
| Show the virtual keyboard | — | tap/click the screen |
| Run a command | `Enter` | `GİR` |
| Delete a character | `Backspace` | `SİL` |
| Close a panel / notice / keyboard | `Esc` | `ESC` |
| Skip the boot sequence | any key | tap |

Commands are case- and diacritic-insensitive (`bilgi`, `BİLGİ` and `BILGI` are the same). Letters,
digits and `+` are accepted. Near misses are corrected for you — and you are told so.

### Public commands
| TR | EN | Effect |
| --- | --- | --- |
| `YARDIM` | `HELP` | Lists the commands. Admits that unlisted ones exist. |
| `BILGI` | `INFO` | Opens **DOSYA_734**: the project dossier, redacted fields, and Annex A — what the browser can see about you (all local). Access window: 90 s. |
| `BILET` / `IZIN` | `TICKET` / `ACCESS` | Opens **ERİŞİM İZNİ_217**: the registration permit. Local only; nothing is transmitted. |
| `CIKIS` | `EXIT` | Closes the open panel. On the main screen: *there is no exit.* |
| `IZ` | `TRACE` | After the dossier has been seen: reveals the clue `TRUST or RESIST`. |

### The puzzle chain
1. `BILGI` — read the dossier.
2. `IZ` — the clue appears.
3. `TRUST` → status **ONAYLI / CLEARED**, level-2 access: the dossier's redactions are lifted (the venue is still "redacted at source").
   `RESIST` → status **ŞÜPHELİ / SUSPECT**: the eye stares, your file is flagged, the ticker tells your neighbours.
4. `101` (or `ODA101` / `ROOM101`) — available after either choice. The eye closes.

<details>
<summary><strong>Unlisted commands (spoilers)</strong></summary>

| TR | EN | Response |
| --- | --- | --- |
| `KIMIM` | `WHOAMI` | Your citizen number. Who else could you have been? |
| `SAAT` | `TIME` | It is thirteen o'clock. |
| `NEDEN` | `WHY` | No questions. |
| `HAYIR` | `NO` | Not a recognised command. It never was. |
| `EVET` | `YES` | Noted. |
| `ITIRAZ` | `APPEAL` | Forwarded to the Office of Appeals. The Office is closed. |
| `2+2` | — | 5. |
| `1984` | — | That year never happened. |
| `BIRADER` | `BROTHER` | Is watching you. |
| `LOCUS` | `MIRABILIS` | Wondrous place. Wondrous time. All is well. |
| `UNUT` | `FORGET` | Two-step reset of your session. Your citizen number and visit count survive — ours was not erased. |

</details>

### What the system does on its own
- **Boot** identifies you by citizen number and visit count; returning citizens are greeted accordingly.
- **Idle intrusions:** leave the prompt alone for ~40 s and it types by itself.
- **Notices** from the Ministry appear at the top; **the ticker** scrolls Newspeak at the bottom.
- **Leaving the tab** changes the title to *GERİ DÖN.* and is remarked upon when you return.
- **Invalid commands** accumulate. Five of them make you a suspect.
- **Redacted fields** in the dossier can be glimpsed on hover/tap for a second, then: *you did not see that.*
- The **eye** blinks, wanders when you stop moving, stares when you resist, and its glow follows your loyalty.

### Privacy and resetting
Everything is stored in your browser's `localStorage` under two keys: `locusMirabilisSession`
(language, history, puzzle state, registration code, audio settings) and `locusMirabilisCitizen`
(citizen number, visit count). No network request ever carries what you type; the end-to-end suite
asserts this. `UNUT` / `FORGET` clears the session key; clearing site data in the browser clears both.

### Accessibility
Panels are `role="dialog"` with focus trapping and `Esc` to close; every system message is mirrored
to a polite live region; redacted values are hidden from assistive tech until glimpsed; all keys and
controls are labelled in the active language; `prefers-reduced-motion` turns off the typewriters,
noise, flicker, wobble and blinking while keeping every feature reachable.

---

## 3. Architecture

| Path | Role |
| --- | --- |
| `index.html` | Semantic shell. Strict CSP (`'self'` only — no inline script or style), Open Graph, PWA links. |
| `assets/css/styles.css` | Design tokens, self-hosted fonts, CRT overlays, status bar, eye, panels, keyboard, ticker, notice, glitch, reduced-motion. |
| `assets/js/i18n.js` | **All narrative text**, TR and EN. `[[secret]]` tokens mark redactions; `{name}` are placeholders. |
| `assets/js/audio.js` | Web Audio engine: ambient drone/hum/noise, key, error, confirm, glitch, alarm, boot, shutter, notice. No audio files. |
| `assets/js/app.js` | Controller: state + migration from v1, boot, command parser (aliases, Levenshtein autocorrect), bureaucracy, panels, registration, the eye, autonomy timers, service-worker registration. |
| `sw.js` | Versioned cache; network-first navigation, cache-first assets. Registered only when not on localhost. |
| `manifest.webmanifest`, `assets/img/` | Installable app metadata, icons and OG image (generated by `npm run images`). |
| `404.html`, `changelog.html` | In-fiction error page and version record. |
| `archive/v1/index.html` | The pre-2.0 single-file version, shipped untouched for comparison. |
| `scripts/` | `serve.js` (zero-dep static server), `build.js` (dist + `__BUILD__` stamping), `make-images.js`. |
| `tests/unit/` | Content parity tests (same keys, shapes, placeholders in TR and EN). |
| `tests/e2e/` | Playwright: shell, commands, puzzle, permit, language, autonomy, phone keyboard. |

### Debug query parameters
| Param | Effect |
| --- | --- |
| `?lm_fast=1` | No typewriters or bureaucratic delays (used by the tests). |
| `?lm_access=5` | Dossier access window in seconds (5–600). |
| `?lm_idle=3000` | Idle threshold for prompt intrusions in ms. |

---

## 4. Development

```bash
npm run lint        # ESLint (browser code, service worker, node scripts, tests)
npm run test:unit   # node:test — i18n parity
npm run test:e2e    # Playwright, desktop + Pixel 7 projects (starts the dev server itself)
npm test            # all of the above
npm run build       # dist/ with BUILD_ID stamped into HTML/JS/CSS/manifest
npm run images      # regenerate icons + og.png with headless Chromium
```

First run of the e2e suite needs a browser: `npx playwright install chromium`.

**Adding a command:** add the canonical name to `KNOWN` (and any alias to `ALIASES`) in `app.js`,
handle it in `runCommand()`, add its strings to **both** languages in `i18n.js` (the unit test fails
otherwise), and extend `tests/e2e/commands.spec.js`. Public commands also go into `hint` and
`helpCommands`.

**Editing the story:** everything the citizen reads is in `assets/js/i18n.js`. Keep keys identical
across `TR` and `EN`; arrays must have the same length; placeholders must match.

---

## 5. Deployment

`.github/workflows/pages.yml` runs lint, unit and end-to-end tests on every push and pull request,
then builds `dist/` with `BUILD_ID=<short sha>` and deploys it to **GitHub Pages** via
`actions/deploy-pages` on pushes to `main` and `claude/**`. The build id is shown bottom-left on the
telescreen (`DERLEME <sha> · BAKANLIK ONAYLI`) and versions the service-worker cache and asset URLs, so
a redeploy is never one reload behind.

If the Pages source for the repository is still set to *Deploy from a branch*, switch it to
*GitHub Actions* under **Settings → Pages** — the workflow's `configure-pages` step attempts this
automatically.

---

## 6. Versioning

Semantic versioning; only meaningful releases get an entry. See [CHANGELOG.md](CHANGELOG.md) —
this rework is **2.0.0 "Telekran"**.

## 7. Credits

Fonts: [VT323](https://fonts.google.com/specimen/VT323) and [Orbitron](https://fonts.google.com/specimen/Orbitron),
SIL Open Font License (see `assets/fonts/OFL.txt`). Everything else — eye, sounds, copy — is original.
