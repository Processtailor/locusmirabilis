/*
 * Locus Mirabilis — telescreen controller.
 *
 * Depends on window.LM_I18N (content) and window.LM_AUDIO (sound), both
 * loaded before this file. Everything the citizen can do is routed through
 * processCommand(); everything the system does to the citizen on its own
 * (boot, notices, idle intrusions, countdowns, the eye) lives in the
 * "autonomy" section near the bottom and respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  const I18N = window.LM_I18N;
  const AUDIO = window.LM_AUDIO;

  const SESSION_KEY = 'locusMirabilisSession';
  const CITIZEN_KEY = 'locusMirabilisCitizen';
  const MAX_COMMAND_LENGTH = 24;
  const MAX_HISTORY = 6;

  const params = new URLSearchParams(location.search);
  const FAST = params.get('lm_fast') === '1';            // test/debug: no typewriters, no delays
  const ACCESS_WINDOW = clampInt(params.get('lm_access'), 5, 600, 90);
  const IDLE_MS = clampInt(params.get('lm_idle'), 3000, 600000, 38000);

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactQuery = window.matchMedia('(max-width: 640px)');   // phones: short labels in the status bar
  const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const reduced = () => reducedMotionQuery.matches;
  const instant = () => FAST || reduced();

  /* ------------------------------------------------------------------------
     DOM
     ------------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const el = {
    boot: $('boot'),
    bootLines: $('boot-lines'),
    bootSkip: $('boot-skip'),
    statusBar: $('status-bar'),
    recLabel: $('rec-label'),
    clock: $('clock'),
    citizenLabel: $('citizen-label'),
    citizenId: $('citizen-id'),
    visitLabel: $('visit-label'),
    visitCount: $('visit-count'),
    statusItem: $('status-item'),
    statusLabel: $('status-label'),
    statusValue: $('status-value'),
    topControls: $('top-controls'),
    muteToggle: $('mute-toggle'),
    languageToggle: $('language-toggle'),
    wrapper: $('content-wrapper'),
    main: $('main-content'),
    eye: $('surveillance-eye'),
    pupil: $('pupil'),
    typed: $('typed-text'),
    hint: $('command-hint'),
    tapHint: $('tap-hint'),
    audioControls: $('audio-controls'),
    volumeLabel: $('volume-label'),
    volume: $('volume-control'),
    historyTitle: $('history-title'),
    historyList: $('history-list'),
    infoPanel: $('info-panel'),
    dossierStamp: $('dossier-stamp'),
    dossierTitle: $('dossier-title'),
    dossierBody: $('dossier-body'),
    annexTitle: $('annex-title'),
    annexList: $('annex-list'),
    annexNote: $('annex-note'),
    accessTimer: $('access-timer'),
    accessLabel: $('access-label'),
    accessBar: $('access-bar'),
    accessValue: $('access-value'),
    ticketPanel: $('ticket-panel'),
    ticketStamp: $('ticket-stamp'),
    ticketTitle: $('ticket-title'),
    ticketDescription: $('ticket-description'),
    form: $('registration-form'),
    formNoLabel: $('form-no-label'),
    formNo: $('form-no'),
    regNameLabel: $('reg-name-label'),
    regName: $('reg-name'),
    regContactLabel: $('reg-contact-label'),
    regContact: $('reg-contact'),
    regConsent: $('reg-consent'),
    regConsentLabel: $('reg-consent-label'),
    regSubmit: $('registration-submit'),
    regStatus: $('registration-status'),
    receipt: $('receipt'),
    privacyNote: $('privacy-note'),
    ticker: $('ticker'),
    tickerTrack: $('ticker-track'),
    buildStamp: $('build-stamp'),
    notice: $('notice'),
    noticeLabel: $('notice-label'),
    noticeText: $('notice-text'),
    noticeClose: $('notice-close'),
    keyboard: $('keyboard'),
    glitchContainer: $('glitch-container'),
    announcer: $('announcer')
  };
  const keyboardKeys = Array.from(el.keyboard.querySelectorAll('.key'));

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */
  const defaultState = () => ({
    v: 2,
    language: 'TR',
    lastOpenedPanel: 'main',
    commandHistory: [],
    puzzle: { dossierSeen: false, clueUnlocked: false, branch: 'none', room101: false },
    invalidCount: 0,
    registration: null,
    audio: { muted: false, volume: 0.1 }
  });

  let state = defaultState();
  let citizen = { id: '0000-A', visits: 1, firstSeen: new Date().toISOString() };

  let userInput = '';
  let busy = false;                 // bureaucratic processing in progress
  let booting = true;
  let forgetArmedUntil = 0;
  let lastInteraction = Date.now();
  let lastPointerMove = 0;
  let awayAt = 0;
  let lastStatusKey = '';
  let lastStatusVars = null;

  const timers = {
    help: null, helpHold: null, processing: null, access: null,
    intrusion: null, intrusionType: null, notice: null, noticeHide: null,
    wobble: null, ambientGlitch: null, blink: null, blinkOff: null, wander: null,
    stareUntil: 0, redactSeenAt: 0
  };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function t(key, vars) {
    const table = I18N[state.language] || I18N.TR;
    let value = table[key];
    if (value === undefined) value = I18N.TR[key];
    if (typeof value !== 'string' || !vars) return value;
    return value.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: session simply won't persist */ }
  }

  function normalize(value) {
    return value
      .trim()
      .toLocaleUpperCase('tr-TR')
      .replace(/İ/g, 'I')
      .replace(/Ş/g, 'S')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  /* ------------------------------------------------------------------------
     Persistence
     ------------------------------------------------------------------------ */
  function loadCitizen() {
    const saved = readJSON(CITIZEN_KEY);
    if (saved && typeof saved.id === 'string' && /^\d{4}-[A-Z]$/.test(saved.id)) {
      citizen = {
        id: saved.id,
        visits: (Number.isInteger(saved.visits) && saved.visits > 0 ? saved.visits : 0) + 1,
        firstSeen: typeof saved.firstSeen === 'string' ? saved.firstSeen : new Date().toISOString()
      };
    } else {
      const letters = 'ABCDEFGHKLMNPRSTUVYZ';
      citizen = {
        id: `${Math.floor(1000 + Math.random() * 9000)}-${letters[Math.floor(Math.random() * letters.length)]}`,
        visits: 1,
        firstSeen: new Date().toISOString()
      };
    }
    writeJSON(CITIZEN_KEY, citizen);
  }

  function loadSession() {
    const parsed = readJSON(SESSION_KEY);
    if (!parsed || typeof parsed !== 'object') return;
    const next = defaultState();
    next.language = parsed.language === 'EN' ? 'EN' : 'TR';
    next.lastOpenedPanel = ['main', 'info', 'ticket'].includes(parsed.lastOpenedPanel) ? parsed.lastOpenedPanel : 'main';
    next.commandHistory = Array.isArray(parsed.commandHistory)
      ? parsed.commandHistory.filter((c) => typeof c === 'string').slice(-MAX_HISTORY)
      : [];
    const puzzle = parsed.puzzle || parsed.puzzleState || {};   // v1 used "puzzleState"
    next.puzzle = {
      dossierSeen: Boolean(puzzle.dossierSeen),
      clueUnlocked: Boolean(puzzle.clueUnlocked),
      branch: ['none', 'trust', 'resist'].includes(puzzle.branch) ? puzzle.branch : 'none',
      room101: Boolean(puzzle.room101)
    };
    next.invalidCount = Number.isInteger(parsed.invalidCount) ? Math.max(0, parsed.invalidCount) : 0;
    next.registration = parsed.registration && typeof parsed.registration.code === 'string'
      ? { code: parsed.registration.code, at: String(parsed.registration.at || '') }
      : null;
    next.audio = {
      muted: Boolean(parsed.audio && parsed.audio.muted),
      volume: parsed.audio && typeof parsed.audio.volume === 'number' ? Math.min(1, Math.max(0, parsed.audio.volume)) : 0.1
    };
    state = next;
  }

  function save() { writeJSON(SESSION_KEY, state); }

  /* ------------------------------------------------------------------------
     Announcements (screen readers) + glitch text
     ------------------------------------------------------------------------ */
  function announce(text) {
    if (!text) return;
    el.announcer.textContent = '';
    window.setTimeout(() => { el.announcer.textContent = text; }, 30);
  }

  function createGlitch(text, opts = {}) {
    const glitch = document.createElement('div');
    glitch.className = 'glitch-text' + (opts.important ? ' important' : '') + (opts.alarm ? ' alarm' : '');
    glitch.textContent = text || pick(t('glitchPhrases'));
    if (!opts.important) {
      glitch.style.top = `${rand(8, 84)}vh`;
      glitch.style.left = `${rand(4, 62)}vw`;
    }
    el.glitchContainer.appendChild(glitch);
    const hold = opts.important ? 2400 : 220 + Math.random() * 320;
    window.setTimeout(() => { glitch.style.opacity = '1'; }, 40);
    window.setTimeout(() => { glitch.style.opacity = '0'; }, hold);
    window.setTimeout(() => { if (glitch.parentNode === el.glitchContainer) el.glitchContainer.removeChild(glitch); }, hold + 900);
  }

  function say(text, opts = {}) {
    createGlitch(text, { important: true, alarm: opts.alarm });
    announce(text);
    if (opts.sound) AUDIO.play(opts.sound);
  }

  /* ------------------------------------------------------------------------
     Prompt line
     ------------------------------------------------------------------------ */
  let promptMode = 'user';
  function setPrompt(text, mode) {
    promptMode = mode || 'user';
    el.typed.textContent = text;
    el.typed.className = promptMode === 'user' ? '' : promptMode;
  }
  const panelPrompts = Array.from(document.querySelectorAll('.panel-prompt'));
  function renderUserPrompt() {
    setPrompt(userInput, 'user');
    panelPrompts.forEach((node) => {
      node.querySelector('.panel-prompt-text').textContent = userInput ? `> ${userInput}` : '';
      node.classList.toggle('active', Boolean(userInput));
    });
  }

  function cancelHelp() {
    if (timers.help) { clearInterval(timers.help); timers.help = null; }
    if (timers.helpHold) { clearTimeout(timers.helpHold); timers.helpHold = null; }
    if (promptMode === 'help') renderUserPrompt();
  }

  function displayHelp() {
    cancelHelp();
    cancelIntrusion();
    const helpText = `${t('helpPrefix')} ${t('helpCommands')} ${t('helpSuffix')}`;
    userInput = '';
    if (instant()) {
      setPrompt(helpText, 'help');
      timers.helpHold = setTimeout(() => { timers.helpHold = null; if (promptMode === 'help') renderUserPrompt(); }, 4000);
      return;
    }
    let i = 0;
    setPrompt('', 'help');
    timers.help = setInterval(() => {
      if (i < helpText.length) {
        el.typed.textContent += helpText[i++];
        if (i % 3 === 0) AUDIO.play('type');
      } else {
        clearInterval(timers.help);
        timers.help = null;
        timers.helpHold = setTimeout(() => { timers.helpHold = null; if (promptMode === 'help') renderUserPrompt(); }, 3000);
      }
    }, 38);
  }

  /* ------------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------------ */
  function mood() {
    if (state.puzzle.branch === 'resist' || state.invalidCount >= 5) return 'suspect';
    if (state.puzzle.branch === 'trust') return 'loyal';
    return 'pending';
  }

  function renderStatus() {
    const m = mood();
    document.body.dataset.mood = m;
    el.statusItem.dataset.state = m;
    el.statusValue.textContent = m === 'suspect' ? t('statusSuspect') : m === 'loyal' ? t('statusLoyal') : t('statusPending');
    el.citizenId.textContent = citizen.id;
    el.visitCount.textContent = String(citizen.visits);
  }

  function renderHistory() {
    el.historyList.innerHTML = '';
    if (!state.commandHistory.length) {
      const li = document.createElement('li');
      li.textContent = t('emptyHistory');
      el.historyList.appendChild(li);
      return;
    }
    state.commandHistory.slice().reverse().forEach((command) => {
      const li = document.createElement('li');
      li.textContent = `> ${command}`;
      el.historyList.appendChild(li);
    });
  }

  function pushHistory(command) {
    state.commandHistory.push(command);
    if (state.commandHistory.length > MAX_HISTORY) state.commandHistory.shift();
    renderHistory();
  }

  function applyKeyLabels() {
    const labels = { ESC: t('keyEsc'), 'SİL': t('keyDelete'), 'GİR': t('keyEnter') };
    keyboardKeys.forEach((keyEl) => {
      const keyText = (keyEl.dataset.key || keyEl.textContent || '').trim();
      keyEl.setAttribute('aria-label', labels[keyText] || `${keyText} ${t('keySuffix')}`);
    });
  }

  function updateMuteButton() {
    const full = `${t('muteLabel')}: ${state.audio.muted ? t('muteOn') : t('muteOff')}`;
    el.muteToggle.textContent = compactQuery.matches ? (state.audio.muted ? t('muteLabel') : t('volumeLabel')) : full;
    el.muteToggle.setAttribute('aria-label', full);
    el.muteToggle.setAttribute('aria-pressed', String(state.audio.muted));
  }

  function buildId() {
    const raw = (document.documentElement.dataset.build || '').trim();
    return !raw || raw.startsWith('__') ? 'DEV' : raw;
  }

  function renderTicker() {
    const items = t('ticker').slice();
    const m = mood();
    if (m === 'suspect') items.splice(2, 0, t('tickerSuspect', { id: citizen.id }));
    if (m === 'loyal') items.splice(2, 0, t('tickerLoyal', { id: citizen.id }));
    const line = items.join('   ◆   ');
    el.tickerTrack.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const span = document.createElement('span');
      span.textContent = line;
      el.tickerTrack.appendChild(span);
    }
    el.tickerTrack.style.setProperty('--ticker-dur', `${Math.max(40, Math.round(line.length * 0.11))}s`);
    el.ticker.setAttribute('aria-label', t('tickerAria'));
    el.buildStamp.textContent = `${t('buildLabel')} ${buildId()} · ${t('buildApproved')}`;
  }

  function renderSecret(key) {
    const secret = t('secrets')[key];
    const unlocked = state.puzzle.branch === 'trust';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'redacted' + (unlocked ? ' unlocked' : '');
    button.dataset.secret = key;
    button.textContent = unlocked ? (secret.reveal || secret.text) : secret.text;
    button.setAttribute('aria-label', unlocked ? button.textContent : t('redactedAria'));
    if (!unlocked) {
      button.addEventListener('click', () => glimpse(button, secret));
      button.addEventListener('mouseenter', () => glimpse(button, secret));
    }
    return button;
  }

  function glimpse(button, secret) {
    if (button.classList.contains('revealed') || button.classList.contains('unlocked')) return;
    button.textContent = secret.reveal || secret.text;
    button.classList.add('revealed');
    announce(button.textContent);
    window.setTimeout(() => {
      button.classList.remove('revealed');
      button.textContent = secret.text;
      const now = Date.now();
      if (now - timers.redactSeenAt > 5000) {
        timers.redactSeenAt = now;
        say(t('redactSeen'), { alarm: true, sound: 'glitch' });
      }
    }, 1300);
  }

  function renderDossier() {
    el.dossierBody.innerHTML = '';
    t('dossierRows').forEach((row) => {
      const p = document.createElement('p');
      p.className = row.k ? 'row' : 'row closing';
      if (row.k) {
        const k = document.createElement('span');
        k.className = 'k';
        k.textContent = row.k;
        p.appendChild(k);
      }
      const v = document.createElement('span');
      v.className = 'v';
      row.v.split(/(\[\[\w+\]\])/).forEach((part) => {
        const match = /^\[\[(\w+)\]\]$/.exec(part);
        if (match) {
          v.appendChild(renderSecret(match[1]));
        } else if (part) {
          v.appendChild(document.createTextNode(part));
        }
      });
      p.appendChild(v);
      el.dossierBody.appendChild(p);
    });

    // Annex A: what the telescreen can see from inside the browser. Nothing leaves it.
    const now = new Date();
    let zone = '—';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '—'; } catch { /* unsupported */ }
    const labels = t('subjectRows');
    const m = mood();
    const rows = [
      [labels.subject, citizen.id],
      [labels.visits, String(citizen.visits)],
      [labels.localTime, `${pad2(now.getHours())}:${pad2(now.getMinutes())}`],
      [labels.zone, zone],
      [labels.screen, `${window.innerWidth}×${window.innerHeight}`],
      [labels.input, coarsePointer ? t('inputTouch') : t('inputMouse')],
      [labels.language, state.language],
      [labels.loyalty, m === 'suspect' ? t('statusSuspect') : m === 'loyal' ? t('statusLoyal') : t('statusPending')],
      [labels.registration, state.registration ? state.registration.code : t('none')],
      [labels.room, state.puzzle.room101 ? t('roomVisited') : t('roomNotVisited')]
    ];
    el.annexList.innerHTML = '';
    rows.forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      el.annexList.appendChild(dt);
      el.annexList.appendChild(dd);
    });
    el.annexTitle.textContent = t('subjectTitle');
    el.annexNote.textContent = t('subjectNote');
    el.accessLabel.textContent = t('accessTimer');
  }

  function renderReceipt() {
    if (!state.registration) {
      el.receipt.classList.add('hidden');
      el.receipt.innerHTML = '';
      return;
    }
    el.receipt.innerHTML = '';
    const h3 = document.createElement('h3');
    h3.textContent = t('receiptTitle');
    const dl = document.createElement('dl');
    [
      [t('receiptCode'), state.registration.code],
      [t('receiptSubject'), citizen.id],
      [t('receiptTime'), state.registration.at ? state.registration.at.replace('T', ' ').slice(0, 16) : '13:00']
    ].forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = t('receiptNote');
    el.receipt.append(h3, dl, note);
    el.receipt.classList.remove('hidden');
  }

  function renderLanguage() {
    document.documentElement.lang = t('htmlLang');
    if (!document.hidden) document.title = t('pageTitle');
    el.languageToggle.textContent = compactQuery.matches ? state.language : t('languageButton');
    el.languageToggle.setAttribute('aria-label', t('languageAria'));
    el.recLabel.textContent = t('rec');
    el.citizenLabel.textContent = t('citizenLabel');
    el.visitLabel.textContent = t('visitLabel');
    el.statusLabel.textContent = t('statusLabel');
    el.clock.setAttribute('aria-label', t('clockAria'));
    el.hint.textContent = t('hint');
    el.tapHint.textContent = t('tapHint');
    el.historyTitle.textContent = t('historyTitle');
    el.volumeLabel.textContent = t('volumeLabel');
    el.volume.setAttribute('aria-label', t('volumeAria'));
    el.dossierStamp.textContent = t('dossierStamp');
    el.dossierTitle.textContent = t('dossierTitle');
    el.ticketStamp.textContent = t('ticketStamp');
    el.ticketTitle.textContent = t('ticketTitle');
    el.ticketDescription.textContent = t('ticketDescription');
    el.formNoLabel.textContent = t('formNoLabel');
    el.formNo.value = t('formNo');
    el.regNameLabel.textContent = t('regName');
    el.regContactLabel.textContent = t('regContact');
    el.regConsentLabel.textContent = t('regConsent');
    el.regSubmit.textContent = t('regSubmit');
    el.privacyNote.textContent = t('privacyNote');
    el.noticeLabel.textContent = t('noticeLabel');
    el.noticeClose.setAttribute('aria-label', t('noticeClose'));
    el.bootSkip.textContent = t('bootSkip');

    el.statusBar.setAttribute('aria-label', t('ariaStatusBar'));
    el.topControls.setAttribute('aria-label', t('ariaTopControls'));
    el.main.setAttribute('aria-label', t('ariaMain'));
    el.audioControls.setAttribute('aria-label', t('ariaAudio'));
    el.infoPanel.setAttribute('aria-label', t('ariaInfoPanel'));
    el.ticketPanel.setAttribute('aria-label', t('ariaTicketPanel'));
    el.keyboard.setAttribute('aria-label', t('ariaKeyboard'));
    el.announcer.setAttribute('aria-label', t('ariaAnnouncer'));
    document.querySelectorAll('.exit-prompt').forEach((node) => { node.textContent = t('exitPrompt'); });

    applyKeyLabels();
    updateMuteButton();
    renderStatus();
    renderHistory();
    renderTicker();
    renderDossier();
    renderReceipt();
    if (lastStatusKey) {
      el.regStatus.textContent = t(lastStatusKey, lastStatusVars || undefined);
    }
  }

  /* ------------------------------------------------------------------------
     Keyboard + input
     ------------------------------------------------------------------------ */
  function setKeyboardVisibility(visible) {
    el.keyboard.classList.toggle('visible', visible);
    el.keyboard.setAttribute('aria-hidden', String(!visible));
    keyboardKeys.forEach((keyEl) => { keyEl.tabIndex = visible ? 0 : -1; });
    document.body.classList.toggle('keyboard-open', visible);
    el.tapHint.classList.toggle('hidden', visible || !coarsePointer);
    measureKeyboard();
  }

  function measureKeyboard() {
    const open = document.body.classList.contains('keyboard-open');
    document.documentElement.style.setProperty('--kb-h', open ? `${el.keyboard.offsetHeight}px` : '0px');
  }

  const CHAR_RE = /^[a-zA-ZçğıöşüÇĞİÖŞÜ0-9+]$/;

  function handleInput(key) {
    lastInteraction = Date.now();
    cancelIntrusion();
    if (key === 'GİR') {
      const raw = userInput.trim();
      userInput = '';
      if (raw && !busy) processCommand(raw);
      else renderUserPrompt();
      return;
    }
    if (busy) return;
    if (key === 'SİL') {
      cancelHelp();
      userInput = userInput.slice(0, -1);
    } else if (CHAR_RE.test(key) && userInput.length < MAX_COMMAND_LENGTH) {
      cancelHelp();
      userInput += key.toLocaleUpperCase('tr-TR');
      AUDIO.play('type');
      if (Math.random() < 0.18) createGlitch();
    } else {
      return;
    }
    renderUserPrompt();
  }

  function isPanelOpen() {
    return !el.infoPanel.classList.contains('hidden') || !el.ticketPanel.classList.contains('hidden');
  }

  function refocusTerminal() {
    // After a control button is clicked it would keep focus and swallow Enter; hand focus back.
    const target = !el.infoPanel.classList.contains('hidden') ? el.infoPanel
      : !el.ticketPanel.classList.contains('hidden') ? el.ticketPanel : el.main;
    target.focus({ preventScroll: true });
  }

  function triggerEscape() {
    lastInteraction = Date.now();
    if (el.notice.classList.contains('visible')) hideNotice();
    if (isPanelOpen()) {
      closePanels();
      cancelHelp();
      userInput = '';
      renderUserPrompt();
    } else if (el.keyboard.classList.contains('visible')) {
      setKeyboardVisibility(false);
    }
  }

  /* ------------------------------------------------------------------------
     Commands
     ------------------------------------------------------------------------ */
  const ALIASES = {
    HELP: 'YARDIM', INFO: 'BILGI', TICKET: 'BILET', ACCESS: 'IZIN', EXIT: 'CIKIS', TRACE: 'IZ',
    WHOAMI: 'KIMIM', TIME: 'SAAT', WHY: 'NEDEN', NO: 'HAYIR', YES: 'EVET', APPEAL: 'ITIRAZ',
    FORGET: 'UNUT', ROOM101: '101', ODA101: '101', BROTHER: 'BIRADER', BIGBROTHER: 'BIRADER',
    BUYUKBIRADER: 'BIRADER', MIRABILIS: 'LOCUS', LOCUSMIRABILIS: 'LOCUS'
  };
  const KNOWN = new Set([
    'YARDIM', 'BILGI', 'BILET', 'IZIN', 'CIKIS', 'IZ', 'TRUST', 'RESIST', '101', 'KIMIM', 'SAAT',
    'NEDEN', 'HAYIR', 'EVET', 'ITIRAZ', '2+2', '1984', 'BIRADER', 'LOCUS', 'UNUT'
  ]);
  const CORRECTABLE = ['YARDIM', 'BILGI', 'BILET', 'IZIN', 'CIKIS', 'HELP', 'INFO', 'TICKET', 'ACCESS', 'EXIT'];

  function autocorrect(norm) {
    if (norm.length < 3) return null;
    let best = null;
    let bestDistance = Infinity;
    let ties = 0;
    CORRECTABLE.forEach((candidate) => {
      const d = levenshtein(norm, candidate);
      if (d < bestDistance) { best = candidate; bestDistance = d; ties = 1; } else if (d === bestDistance) { ties++; }
    });
    const allowed = norm.length >= 6 ? 2 : 1;
    if (best && bestDistance <= allowed && ties === 1) return ALIASES[best] || best;
    return null;
  }

  function invalidCommand() {
    state.invalidCount += 1;
    const messages = t('invalid');
    const index = Math.min(messages.length - 1, state.invalidCount - 1);
    const text = t('invalid')[index].replace('{id}', citizen.id);
    const wasSuspect = mood() === 'suspect';
    say(text, { alarm: true, sound: 'error' });
    renderStatus();
    if (!wasSuspect && mood() === 'suspect') {
      window.setTimeout(() => { say(t('suspectFlag'), { alarm: true, sound: 'alarm' }); renderTicker(); stare(); }, 1400);
    }
  }

  function processCommand(raw) {
    const norm = normalize(raw);
    let cmd = ALIASES[norm] || norm;
    let correctedFrom = null;
    if (!KNOWN.has(cmd)) {
      const fix = autocorrect(norm);
      if (fix) { correctedFrom = norm; cmd = fix; }
    }

    // While a panel is open the prompt is hidden; only honor the documented exit command.
    if (isPanelOpen() && cmd !== 'CIKIS') {
      renderUserPrompt();
      return;
    }

    pushHistory(cmd);
    if (correctedFrom) {
      setPrompt(t('corrected', { raw: correctedFrom, cmd }), 'corrected');
      announce(t('corrected', { raw: correctedFrom, cmd }));
      AUDIO.play('glitch');
      window.setTimeout(() => runCommand(cmd), instant() ? 0 : 1100);
    } else {
      renderUserPrompt();
      runCommand(cmd);
    }
    save();
  }

  function runCommand(cmd) {
    if (cmd !== 'UNUT') forgetArmedUntil = 0;
    switch (cmd) {
      case 'YARDIM':
        displayHelp();
        break;
      case 'BILGI':
        bureaucracy(() => { state.puzzle.dossierSeen = true; openPanel(el.infoPanel); });
        break;
      case 'BILET':
      case 'IZIN':
        bureaucracy(() => openPanel(el.ticketPanel));
        break;
      case 'CIKIS':
        if (isPanelOpen()) closePanels();
        else say(t('noExit'), { alarm: true, sound: 'error' });
        break;
      case 'IZ':
        if (state.puzzle.dossierSeen) {
          state.puzzle.clueUnlocked = true;
          say(t('clueMessage'), { sound: 'glitch' });
        } else {
          invalidCommand();
        }
        break;
      case 'TRUST':
        if (state.puzzle.clueUnlocked) {
          state.puzzle.branch = 'trust';
          renderStatus();
          renderTicker();
          renderDossier();
          say(t('trustMessage'), { sound: 'confirm' });
          window.setTimeout(() => announce(t('redactUnlocked')), 1500);
        } else {
          invalidCommand();
        }
        break;
      case 'RESIST':
        if (state.puzzle.clueUnlocked) {
          state.puzzle.branch = 'resist';
          renderStatus();
          renderTicker();
          renderDossier();
          say(t('resistMessage'), { alarm: true, sound: 'alarm' });
          stare();
          burst(4);
        } else {
          invalidCommand();
        }
        break;
      case '101':
        if (state.puzzle.branch === 'none') {
          say(t('room101Locked'), { alarm: true, sound: 'error' });
        } else {
          room101();
        }
        break;
      case 'KIMIM': say(t('whoami', { id: citizen.id }), { sound: 'glitch' }); break;
      case 'SAAT': say(t('time'), { sound: 'glitch' }); break;
      case 'NEDEN': say(t('why'), { alarm: true, sound: 'error' }); break;
      case 'HAYIR': say(t('no'), { alarm: true, sound: 'error' }); break;
      case 'EVET': say(t('yes'), { sound: 'confirm' }); break;
      case 'ITIRAZ': say(t('appeal'), { alarm: true, sound: 'error' }); break;
      case '2+2': say(t('twoPlusTwo'), { sound: 'glitch' }); break;
      case '1984': say(t('year'), { alarm: true, sound: 'glitch' }); break;
      case 'BIRADER': say(t('brother'), { alarm: true, sound: 'alarm' }); stare(); break;
      case 'LOCUS': say(t('locus'), { sound: 'confirm' }); break;
      case 'UNUT':
        if (Date.now() < forgetArmedUntil) {
          forgetArmedUntil = 0;
          forget();
        } else {
          forgetArmedUntil = Date.now() + 20000;
          say(t('forgetConfirm'), { alarm: true, sound: 'error' });
        }
        break;
      default:
        invalidCommand();
    }
    save();
  }

  function bureaucracy(done) {
    if (busy) return;
    if (instant()) { done(); return; }
    busy = true;
    cancelHelp();
    const steps = pick(t('processing'));
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        setPrompt(`${steps[i]} ${'░'.repeat(steps.length - i - 1)}${'▓'.repeat(i + 1)}`, 'processing');
        if (i === 2) AUDIO.play('glitch'); else AUDIO.play('type');
        i++;
        timers.processing = setTimeout(tick, 260);
      } else {
        timers.processing = null;
        busy = false;
        renderUserPrompt();
        done();
      }
    };
    tick();
  }

  async function room101() {
    if (busy) return;
    busy = true;
    const lines = t('room101');
    AUDIO.play('shutter');
    el.eye.classList.add('closed');
    say(lines[0], { alarm: true });
    await wait(instant() ? 50 : 2200);
    say(lines[1], { alarm: true, sound: 'glitch' });
    await wait(instant() ? 50 : 2600);
    el.eye.classList.remove('closed');
    say(lines[2], { alarm: true, sound: 'alarm' });
    state.puzzle.room101 = true;
    renderDossier();
    busy = false;
    save();
  }

  function forget() {
    const keepLanguage = state.language;
    const keepAudio = state.audio;
    state = defaultState();
    state.language = keepLanguage;
    state.audio = keepAudio;
    forgetArmedUntil = 0;
    lastStatusKey = '';
    el.regStatus.textContent = '';
    el.regStatus.className = 'registration-status';
    closePanels();
    renderLanguage();
    save();
    say(t('forgetDone'), { alarm: true, sound: 'alarm' });
  }

  /* ------------------------------------------------------------------------
     Panels
     ------------------------------------------------------------------------ */
  function openPanel(panel, { focus = true } = {}) {
    cancelHelp();
    cancelIntrusion();
    userInput = '';
    renderUserPrompt();
    el.main.classList.add('hidden');
    setKeyboardVisibility(false);
    el.infoPanel.classList.add('hidden');
    el.ticketPanel.classList.add('hidden');
    panel.classList.remove('hidden');
    if (panel === el.infoPanel) {
      renderDossier();
      startAccessTimer();
    } else {
      stopAccessTimer();
      renderReceipt();
    }
    if (focus) panel.focus({ preventScroll: true });
    state.lastOpenedPanel = panel === el.infoPanel ? 'info' : 'ticket';
    save();
  }

  function closePanels() {
    stopAccessTimer();
    el.main.classList.remove('hidden');
    setKeyboardVisibility(false);
    el.infoPanel.classList.add('hidden');
    el.ticketPanel.classList.add('hidden');
    el.main.focus({ preventScroll: true });
    state.lastOpenedPanel = 'main';
    save();
  }

  let accessRemaining = ACCESS_WINDOW;
  function startAccessTimer() {
    stopAccessTimer();
    accessRemaining = ACCESS_WINDOW;
    paintAccess();
    timers.access = setInterval(() => {
      accessRemaining -= 1;
      paintAccess();
      if (accessRemaining <= 0) {
        stopAccessTimer();
        closePanels();
        say(t('accessExpired'), { alarm: true, sound: 'alarm' });
      }
    }, 1000);
  }
  function stopAccessTimer() {
    if (timers.access) { clearInterval(timers.access); timers.access = null; }
  }
  function paintAccess() {
    const r = Math.max(0, accessRemaining);
    el.accessValue.textContent = `${pad2(Math.floor(r / 60))}:${pad2(r % 60)}`;
    el.accessBar.style.setProperty('--pct', `${(r / ACCESS_WINDOW) * 100}%`);
    el.accessTimer.dataset.urgent = String(r <= 15);
  }

  function trapFocus(event, panel) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(panel.querySelectorAll('button:not([disabled]), input:not([tabindex="-1"]), [tabindex="0"]'))
      .filter((node) => node.offsetParent !== null);
    if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ------------------------------------------------------------------------
     Registration (local only — nothing is transmitted)
     ------------------------------------------------------------------------ */
  function setRegStatus(key, vars, className) {
    lastStatusKey = key;
    lastStatusVars = vars || null;
    el.regStatus.textContent = key ? t(key, vars) : '';
    el.regStatus.className = `registration-status${className ? ' ' + className : ''}`;
  }

  async function submitRegistration(event) {
    event.preventDefault();
    if (busy) return;
    lastInteraction = Date.now();
    const nameValue = el.regName.value.trim();
    const nameValid = nameValue.length > 0;
    const contactValid = el.regContact.checkValidity() && el.regContact.value.trim().length > 0;
    const consentValid = el.regConsent.checked;

    el.regName.setAttribute('aria-invalid', String(!nameValid));
    el.regContact.setAttribute('aria-invalid', String(!contactValid));
    el.regConsent.setAttribute('aria-invalid', String(!consentValid));

    if (!nameValid || !contactValid) {
      setRegStatus('regError', null, 'error');
      AUDIO.play('error');
      (!nameValid ? el.regName : el.regContact).focus();
      return;
    }
    if (!consentValid) {
      setRegStatus('regConsentError', null, 'error');
      AUDIO.play('error');
      el.regConsent.focus();
      return;
    }

    if (state.registration) {
      setRegStatus('regAlready', { id: citizen.id, code: state.registration.code }, 'ok');
      renderReceipt();
      say(`${t('registeredPrefix')}: ${nameValue}`, { sound: 'glitch' });
      el.regName.value = '';
      el.regContact.value = '';
      el.regConsent.checked = false;
      return;
    }

    busy = true;
    el.regSubmit.disabled = true;
    const steps = t('regSteps');
    for (let i = 0; i < steps.length; i++) {
      el.regStatus.textContent = `${steps[i]} ${'░'.repeat(steps.length - i - 1)}${'▓'.repeat(i + 1)}`;
      el.regStatus.className = 'registration-status busy';
      AUDIO.play(i === 2 || i === 4 ? 'glitch' : 'type');
      await wait(instant() ? 20 : 430);
    }
    const code = `LM-${citizen.id.replace('-', '')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    state.registration = { code, at: new Date().toISOString() };
    save();
    busy = false;
    el.regSubmit.disabled = false;
    setRegStatus('regSuccess', { code }, 'ok');
    renderReceipt();
    say(`${t('registeredPrefix')}: ${nameValue}`, { sound: 'confirm' });
    el.regName.value = '';
    el.regContact.value = '';
    el.regConsent.checked = false;
    renderDossier();
  }

  /* ------------------------------------------------------------------------
     The eye
     ------------------------------------------------------------------------ */
  const PUPIL_RANGE = 16;
  function movePupil(x, y) {
    el.pupil.style.transform = `translate(${(x * PUPIL_RANGE).toFixed(2)}px, ${(y * PUPIL_RANGE * 0.7).toFixed(2)}px)`;
  }

  function onPointerMove(event) {
    lastPointerMove = Date.now();
    if (Date.now() < timers.stareUntil) return;
    el.pupil.classList.remove('wander');
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    movePupil(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  }

  function scheduleWander() {
    clearTimeout(timers.wander);
    timers.wander = setTimeout(() => {
      const idle = Date.now() - lastPointerMove > 4000;
      if (idle && Date.now() > timers.stareUntil && !document.hidden) {
        el.pupil.classList.add('wander');
        movePupil(rand(-0.9, 0.9), rand(-0.7, 0.7));
      }
      scheduleWander();
    }, rand(1800, 4200));
  }

  function scheduleBlink() {
    clearTimeout(timers.blink);
    timers.blink = setTimeout(() => {
      if (reduced() || document.hidden || Date.now() < timers.stareUntil || el.eye.classList.contains('closed')) {
        scheduleBlink();
        return;
      }
      blinkOnce();
      if (Math.random() < 0.18) setTimeout(blinkOnce, 260);
      scheduleBlink();
    }, rand(3200, 8200));
  }
  function blinkOnce() {
    el.eye.classList.add('blink');
    clearTimeout(timers.blinkOff);
    timers.blinkOff = setTimeout(() => el.eye.classList.remove('blink'), 130);
  }

  function stare() {
    // Snap to the citizen, stop blinking, hold.
    timers.stareUntil = Date.now() + 9000;
    el.pupil.classList.remove('wander');
    el.pupil.classList.add('stare');
    movePupil(0, 0);
    setTimeout(() => el.pupil.classList.remove('stare'), 400);
  }

  /* ------------------------------------------------------------------------
     Autonomy: the system acts on its own
     ------------------------------------------------------------------------ */
  function burst(count) {
    for (let i = 0; i < count; i++) setTimeout(() => createGlitch(), i * 140);
  }

  function scheduleAmbientGlitch() {
    clearTimeout(timers.ambientGlitch);
    const base = reduced() ? rand(30000, 50000) : rand(9000, 17000);
    timers.ambientGlitch = setTimeout(() => {
      if (!booting && !document.hidden) {
        createGlitch();
        if (Math.random() < 0.35) AUDIO.play('glitch');
      }
      scheduleAmbientGlitch();
    }, base);
  }

  function scheduleWobble() {
    clearTimeout(timers.wobble);
    timers.wobble = setTimeout(() => {
      if (!reduced() && !booting && !document.hidden) {
        el.wrapper.classList.add('wobble');
        setTimeout(() => el.wrapper.classList.remove('wobble'), 420);
      }
      scheduleWobble();
    }, rand(22000, 46000));
  }

  function showNotice(text) {
    el.noticeText.textContent = text;
    el.notice.classList.add('visible');
    AUDIO.play('notice');
    clearTimeout(timers.noticeHide);
    timers.noticeHide = setTimeout(hideNotice, 7500);
  }
  function hideNotice() {
    el.notice.classList.remove('visible');
    clearTimeout(timers.noticeHide);
  }
  function scheduleNotice(first) {
    clearTimeout(timers.notice);
    timers.notice = setTimeout(() => {
      if (!booting && !document.hidden && !busy) showNotice(pick(t('notices')));
      scheduleNotice(false);
    }, first ? rand(24000, 40000) : rand(50000, 95000));
  }

  function cancelIntrusion() {
    if (timers.intrusionType) { clearInterval(timers.intrusionType); timers.intrusionType = null; }
    if (promptMode === 'system') renderUserPrompt();
  }

  function intrude() {
    if (booting || busy || isPanelOpen() || document.hidden || promptMode !== 'user' || userInput) return;
    const phrase = pick(t('idle'));
    if (instant()) {
      setPrompt(phrase, 'system');
      announce(phrase);
      setTimeout(() => { if (promptMode === 'system') renderUserPrompt(); }, 2200);
      return;
    }
    let i = 0;
    setPrompt('', 'system');
    timers.intrusionType = setInterval(() => {
      if (i < phrase.length) {
        el.typed.textContent += phrase[i++];
        AUDIO.play('type');
      } else {
        clearInterval(timers.intrusionType);
        timers.intrusionType = null;
        announce(phrase);
        setTimeout(() => { if (promptMode === 'system') renderUserPrompt(); }, 1800);
      }
    }, 75);
  }

  function watchIdle() {
    setInterval(() => {
      if (Date.now() - lastInteraction > IDLE_MS) {
        lastInteraction = Date.now() - IDLE_MS / 2; // don't fire again immediately
        intrude();
      }
    }, 2500);
  }

  function tickClock() {
    const now = new Date();
    el.clock.textContent = `13:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      awayAt = Date.now();
      document.title = t('pageTitleAway');
      AUDIO.setHidden(true);
      return;
    }
    document.title = t('pageTitle');
    AUDIO.setHidden(false);
    if (awayAt && Date.now() - awayAt > 3000 && !booting) {
      setTimeout(() => {
        say(t('away'), { alarm: true, sound: 'alarm' });
        setTimeout(() => announce(t('awayLogged')), 1200);
        stare();
      }, 500);
    }
    awayAt = 0;
  }

  /* ------------------------------------------------------------------------
     Boot sequence
     ------------------------------------------------------------------------ */
  let bootResolve = null;
  function bootLineText(line) {
    const visitLine = citizen.visits <= 1 ? t('bootFirstVisit') : t('bootReturn', { visits: citizen.visits });
    return line.replace('{id}', citizen.id).replace('{visitLine}', visitLine);
  }

  async function typeLine(node, text, perChar, skipped) {
    node.classList.add('typing');
    for (let i = 0; i < text.length; i++) {
      if (skipped()) break;
      node.textContent += text[i];
      if (i % 2 === 0) AUDIO.play('type');
      await wait(perChar);
    }
    node.textContent = text;
    node.classList.remove('typing');
  }

  async function runBoot() {
    booting = true;
    const lines = t('bootLines');
    let skipped = false;
    const skip = () => { skipped = true; if (bootResolve) bootResolve(); };
    const isSkipped = () => skipped;
    const nodes = lines.map((_, index) => {
      const p = document.createElement('p');
      p.className = index === lines.length - 1 ? 'boot-line title' : 'boot-line';
      el.bootLines.appendChild(p);
      return p;
    });
    el.bootSkip.textContent = t('bootSkip');

    if (!instant()) {
      const skipEvents = ['keydown', 'pointerdown'];
      skipEvents.forEach((name) => document.addEventListener(name, skip, { once: true, capture: true }));
      for (let i = 0; i < lines.length && !skipped; i++) {
        const text = bootLineText(lines[i]);
        const last = i === lines.length - 1;
        await Promise.race([
          typeLine(nodes[i], text, last ? 55 : i < 2 ? 11 : 16, isSkipped),
          new Promise((resolve) => { bootResolve = resolve; })
        ]);
        if (last && !skipped) AUDIO.play('boot');
        await Promise.race([wait(last ? 1100 : 320), new Promise((resolve) => { bootResolve = resolve; })]);
      }
      skipEvents.forEach((name) => document.removeEventListener(name, skip, { capture: true }));
    }
    nodes.forEach((node, i) => { node.textContent = bootLineText(lines[i]); });
    if (instant()) await wait(FAST ? 0 : 400);

    el.boot.classList.add('done');
    booting = false;
    await wait(instant() ? 0 : 650);
    el.boot.classList.add('hidden');
    el.boot.removeAttribute('aria-live');
    if (!isPanelOpen()) el.main.focus({ preventScroll: true });
    lastInteraction = Date.now();
  }

  /* ------------------------------------------------------------------------
     Audio wiring
     ------------------------------------------------------------------------ */
  function unlockAudio() {
    if (AUDIO.ready || !AUDIO.supported) return;
    if (!AUDIO.init()) return;
    AUDIO.setVolume(state.audio.volume);
    AUDIO.setMuted(state.audio.muted);
    if (!state.audio.muted) AUDIO.startAmbient();
    if (booting) AUDIO.play('boot');
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */
  function bindEvents() {
    document.addEventListener('pointerdown', unlockAudio, { capture: true });
    document.addEventListener('keydown', unlockAudio, { capture: true });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { triggerEscape(); return; }
      const target = event.target;
      if (target && (target.matches('input:not([type="range"]), textarea, select') || target.isContentEditable)) return;
      if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') && target && target.matches('button, [role="button"], a')) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (booting) return;
      if (event.key === 'Tab') {
        if (isPanelOpen()) trapFocus(event, el.infoPanel.classList.contains('hidden') ? el.ticketPanel : el.infoPanel);
        return;
      }
      if (event.key === 'Enter') handleInput('GİR');
      else if (event.key === 'Backspace') handleInput('SİL');
      else if (event.key.length === 1) handleInput(event.key);
    });

    el.keyboard.addEventListener('click', (event) => {
      const keyBtn = event.target.closest('.key');
      if (!keyBtn) return;
      const key = (keyBtn.dataset.key || keyBtn.textContent || '').trim();
      if (key === 'ESC') { triggerEscape(); return; }
      handleInput(key);
    });

    el.main.addEventListener('click', () => {
      lastInteraction = Date.now();
      if (booting) return;
      setKeyboardVisibility(true);
      AUDIO.resume();
    });
    el.infoPanel.addEventListener('click', (event) => {
      lastInteraction = Date.now();
      if (event.target.closest('.redacted')) return;
      setKeyboardVisibility(true);
    });
    el.ticketPanel.addEventListener('click', (event) => {
      lastInteraction = Date.now();
      if (event.target.closest('#registration-form, .receipt')) return;
      setKeyboardVisibility(true);
    });

    el.muteToggle.addEventListener('click', (event) => {
      state.audio.muted = !state.audio.muted;
      updateMuteButton();
      unlockAudio();
      AUDIO.setMuted(state.audio.muted);
      save();
      if (event.detail > 0) refocusTerminal(); // mouse/touch click only; keyboard users keep their focus
    });
    el.volume.addEventListener('input', (event) => {
      state.audio.volume = Number(event.target.value) / 100;
      unlockAudio();
      AUDIO.setVolume(state.audio.volume);
      AUDIO.resume();
      save();
    });
    el.languageToggle.addEventListener('click', (event) => {
      state.language = state.language === 'TR' ? 'EN' : 'TR';
      renderLanguage();
      save();
      if (event.detail > 0) refocusTerminal();
    });

    ['reg-name', 'reg-contact', 'reg-consent'].forEach((id) => {
      $(id).addEventListener('input', (event) => { event.target.setAttribute('aria-invalid', 'false'); lastInteraction = Date.now(); });
    });
    el.form.addEventListener('submit', submitRegistration);
    el.noticeClose.addEventListener('click', hideNotice);

    if (typeof compactQuery.addEventListener === 'function') compactQuery.addEventListener('change', renderLanguage);
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('resize', measureKeyboard);
    if ('ResizeObserver' in window) new ResizeObserver(measureKeyboard).observe(el.keyboard);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
    });
  }

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  async function init() {
    loadCitizen();
    loadSession();
    el.volume.value = String(Math.round(state.audio.volume * 100));
    renderLanguage();
    setKeyboardVisibility(false);
    tickClock();
    setInterval(tickClock, 1000);
    bindEvents();
    registerServiceWorker();

    if (state.lastOpenedPanel === 'info') {
      state.puzzle.dossierSeen = true;
      openPanel(el.infoPanel, { focus: false });
    } else if (state.lastOpenedPanel === 'ticket') {
      openPanel(el.ticketPanel, { focus: false });
    }

    await runBoot();

    scheduleBlink();
    scheduleWander();
    scheduleAmbientGlitch();
    scheduleWobble();
    scheduleNotice(true);
    watchIdle();
    if (state.lastOpenedPanel === 'info') startAccessTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
