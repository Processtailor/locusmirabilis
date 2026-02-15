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
   - Fix: replaced with a placeholder contact flow via `mailto:` and added safe link attributes.

5. **Potential DOM removal race in glitch cleanup**
   - Problem: delayed `removeChild` could throw if element was removed unexpectedly.
   - Fix: parent existence is checked before removal.

## Still known limitations
- Audio and font dependencies are externally hosted (offline mode is degraded).
- No automated tests yet (behavior verified manually).
- Registration endpoint is still not connected to a real backend service.

---

## 5) Phase Plan

## Phase 1 — Stabilization (Completed)
- [x] Core UI/keyboard flow working.
- [x] Command parser normalization added.
- [x] Help and panel flows aligned.
- [x] Basic bug fixes for reliability.

## Phase 2 — UX & Accessibility (Recommended next)
- Add visible command hint permanently on screen.
- Improve keyboard accessibility (`aria-label`, focus states, tab order).
- Add “reduced motion” mode for users sensitive to animation.
- Add optional mute/unmute and volume control.

## Phase 3 — Content & Feature Expansion
- Replace placeholder `mailto:` with real ticket/registration workflow.
- Add extra puzzle layers (multi-step commands, hidden clues, branching states).
- Add multilingual UI toggle (TR/EN).
- Add persistent session state (last unlocked panel, command history).

## Phase 4 — Engineering Hardening
- Split `index.html` into modular assets (`styles.css`, `app.js`).
- Introduce linting/formatting and CI checks.
- Add end-to-end tests for command flows and panel transitions.
- Self-host critical static dependencies for resilience.

---

## 6) Further Implementations / Improvement Backlog

- **Security:** add CSP headers and Subresource Integrity where possible.
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
