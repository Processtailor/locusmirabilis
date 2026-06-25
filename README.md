# Locus Mirabilis — User Manual & Development Roadmap

`Locus Mirabilis` is a single-page interactive dystopian web experience themed around surveillance, command input, and hidden information panels.

## 1) Quick Start

### Requirements
- A modern browser (Chrome, Edge, Firefox, Safari).
- Internet connection (for Tailwind CDN, Google Fonts, and remote audio files).

### Run locally
Because this project is a static page, you can run it with any static server.

```bash
python -m http.server 8080
```

Then open:

- `http://localhost:8080/index.html`

> You can also open `index.html` directly, but some browser setups behave better with a local server.

---

## 2) User Manual

## Theme and objective
The interface simulates an authoritarian “terminal” where users trigger commands to reveal restricted files and registration access.

### Main interactions
- Click the main screen to reveal the virtual keyboard.
- Type commands from physical keyboard **or** the on-screen keyboard.
- Press:
  - `GİR` / `Enter` → execute command
  - `SİL` / `Backspace` → delete last character
  - `ESC` / `Escape` → close active panel

### Supported commands
- `YARDIM` → shows available commands.
- `BILGI` → opens information panel (`DOSYA_734`).
- `BILET` or `IZIN` → opens participation/registration panel (`ERİŞİM İZNİ_217`).
- `CIKIS` → returns to the main eye screen.

### Command input notes
- Commands are normalized for Turkish uppercase and diacritics (e.g., `BİLGİ` works like `BILGI`).
- Empty submissions are ignored.

---

## 3) Technical Overview

- **Single file app:** all HTML, CSS, and JavaScript are in `index.html`.
- **Visual layer:** CRT effects (scanline, noise, vignette), eye animation, glitch text.
- **Audio layer:** ambient loop + typing/error effects, unlocked after first user interaction.
- **UI states:**
  - Main screen
  - Info panel
  - Ticket/permission panel

---

## 4) Bug Review (Current Status)

This section documents issues found during review and their status.

## Fixed in this update
1. **Command mismatch for Turkish characters**
   - Problem: commands typed with Turkish uppercase letters could fail to match strict ASCII switch values.
   - Fix: added `normalizeCommand()` to standardize diacritics and casing before command parsing.

2. **Help text missing a valid command**
   - Problem: `YARDIM` output omitted `BILET` even though command was implemented.
   - Fix: help line now includes `BILET`.

3. **Empty command submit noise**
   - Problem: pressing `Enter/GİR` on empty input attempted command processing.
   - Fix: empty input is now ignored.

4. **Placeholder registration link**
   - Problem: ticket CTA pointed to `#` (non-functional).
   - Fix: replaced with an in-page registration `<form>` (`#registration-form`) that validates a code name + contact channel and shows a themed, in-fiction confirmation. No data leaves the browser — nothing is transmitted or stored.

5. **Potential DOM removal race in glitch cleanup**
   - Problem: delayed `removeChild` could throw if element was removed unexpectedly.
   - Fix: parent existence is checked before removal.

## Hardening pass (latest update)
A full read-only audit was run and every confirmed finding was fixed:

- **Input/event handling:** the global `keydown` listener now ignores events from focused form fields (no more leaking into the hidden command buffer, no `Enter` double-submit) and from buttons being activated, and it ignores `Ctrl/Cmd/Alt` shortcuts. While a panel is open only the documented exit command (`CIKIS`) is honored, so blind typing can't silently switch panels.
- **Help animation:** the `YARDIM` typewriter is now cancellable (tracked interval/timeout) so live typing and repeated invocations no longer corrupt the terminal line.
- **Audio resilience:** the ambient loop is retried on later user gestures (unmute, volume, screen click) instead of dying permanently after a single failed autoplay; effect-sound warm-up is muted to avoid an audible blip.
- **Persistence:** all `localStorage` reads *and* writes are guarded, so private mode / quota / sandboxed contexts degrade gracefully; restored command history keeps the newest entries and validates types.
- **Internationalization:** EN mode now localizes the mute button, volume label, exit prompts, info dossier, panel headings, glitch/clue/invalid-command strings, the page `<title>`, the `<html lang>` attribute, and all ARIA labels (previously many were stuck in Turkish).
- **Accessibility:** panels are `role="dialog"`; the registration status is a live region with per-field `aria-invalid` and focus management; the on-screen keys are keyboard-operable and no longer focusable while hidden; redacted dossier values are hidden from screen readers/copy with an `[redacted]` placeholder; the decorative eye/overlays are `aria-hidden`.
- **Assets/robustness:** fixed the corrupt base64 of the `.noise` film-grain texture (it now renders); added a local `.hidden` fallback so hide/show keeps working if the Tailwind CDN fails; added a `Content-Security-Policy` meta restricting origins.

## Still known limitations
- Audio and font dependencies are externally hosted (offline mode is degraded — the page now stays fully usable, but ambience/fonts/grain need the network).
- No automated test suite is committed yet (this round was verified with a headless browser smoke test).
- Registration is intentionally local-only and not connected to a backend service.
- Subresource Integrity is not applied: the Tailwind Play CDN has no fixed hash, so self-hosting (Phase 4) is the real fix.

---

## 5) Phase Plan

## Phase 1 — Stabilization (Completed)
- [x] Core UI/keyboard flow working.
- [x] Command parser normalization added.
- [x] Help and panel flows aligned.
- [x] Basic bug fixes for reliability.

## Phase 2 — UX & Accessibility (Implemented)
- [x] Add visible command hint permanently on screen.
- [x] Improve keyboard accessibility (`aria-label`, focus states, tab order).
- [x] Add optional mute/unmute and volume control.

## Phase 3 — Content & Feature Expansion
- [x] Replace placeholder `mailto:` with real ticket/registration workflow.
- [x] Add extra puzzle layers (multi-step commands, hidden clues, branching states).
- [x] Add multilingual UI toggle (TR/EN).
- [x] Add persistent session state (last unlocked panel, command history).

## Phase 4 — Engineering Hardening
- Split `index.html` into modular assets (`styles.css`, `app.js`).
- Introduce linting/formatting and CI checks.
- Add end-to-end tests for command flows and panel transitions.
- Self-host critical static dependencies for resilience.

---

## 6) Further Implementations / Improvement Backlog

- **Security:** a `Content-Security-Policy` meta is now in place; still pending is Subresource Integrity, which requires self-hosting the Tailwind/font/audio assets (the Play CDN has no fixed hash).
- **Performance:** optimize effect layers for low-end mobile GPUs.
- **Design system:** centralize colors/spacing/animation values as CSS variables.
- **Telemetry (optional):** privacy-respecting analytics for command usage patterns.
- **Content ops:** externalize narrative text into JSON for easier story updates.
- **PWA support:** cache offline assets, add installable app shell.

---

## 7) Maintenance Notes

If you modify commands:
1. Update `processCommand()` mapping.
2. Update the `YARDIM` text.
3. Verify keyboard + physical keyboard both still work.
4. Re-test panel open/close flow and `ESC` behavior.
