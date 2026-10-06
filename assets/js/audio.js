/*
 * Locus Mirabilis — procedural audio.
 *
 * Everything is synthesised with the Web Audio API, so the telescreen has no
 * external audio dependency and works offline. Nothing plays until the first
 * user gesture (browser autoplay policy); every public method is safe to call
 * before init() and simply does nothing.
 */
(function () {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  function createEngine() {
    let ctx = null;
    let master = null;
    let ambientBus = null;
    let ambient = null;        // { nodes: [], lfo }
    let volume = 0.1;
    let muted = false;
    let pausedByVisibility = false;

    const supported = typeof AudioCtx === 'function';

    function now() { return ctx.currentTime; }

    function makeNoiseBuffer(seconds, brown) {
      const length = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        } else {
          data[i] = white;
        }
      }
      return buffer;
    }

    function applyMaster() {
      if (!master) return;
      const target = muted ? 0 : volume;
      master.gain.cancelScheduledValues(now());
      master.gain.setTargetAtTime(target, now(), 0.05);
    }

    function init() {
      if (!supported || ctx) return ctx !== null;
      try {
        ctx = new AudioCtx();
      } catch {
        return false;
      }
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 20;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.2;

      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(compressor);
      compressor.connect(ctx.destination);

      ambientBus = ctx.createGain();
      ambientBus.gain.value = 0.9;
      ambientBus.connect(master);

      applyMaster();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }

    function startAmbient() {
      if (!ctx || ambient) return;
      const t = now();
      const nodes = [];

      // Two detuned low oscillators -> slow beating drone.
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.0;
      droneGain.gain.linearRampToValueAtTime(0.32, t + 4);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      lp.Q.value = 0.8;
      droneGain.connect(lp);
      lp.connect(ambientBus);

      [55, 55.6, 110.3].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 2 ? 'sine' : 'sawtooth';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = i === 2 ? 0.25 : 0.5;
        osc.connect(g);
        g.connect(droneGain);
        osc.start(t);
        nodes.push(osc, g);
      });

      // Mains hum — barely audible, always there.
      const hum = ctx.createOscillator();
      hum.type = 'triangle';
      hum.frequency.value = 50;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.05;
      hum.connect(humGain);
      humGain.connect(ambientBus);
      hum.start(t);
      nodes.push(hum, humGain);

      // Brown noise through a slowly sweeping bandpass: ventilation / tape hiss.
      const noise = ctx.createBufferSource();
      noise.buffer = makeNoiseBuffer(4, true);
      noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 400;
      bp.Q.value = 0.6;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0;
      noiseGain.gain.linearRampToValueAtTime(0.16, t + 6);
      noise.connect(bp);
      bp.connect(noiseGain);
      noiseGain.connect(ambientBus);
      noise.start(t);
      nodes.push(noise, bp, noiseGain);

      // LFO modulating the bandpass + the drone filter so it never sits still.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.045;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(bp.frequency);
      const lfoGain2 = ctx.createGain();
      lfoGain2.gain.value = 90;
      lfo.connect(lfoGain2);
      lfoGain2.connect(lp.frequency);
      lfo.start(t);
      nodes.push(lfo, lfoGain, lfoGain2);

      ambient = { nodes, droneGain, noiseGain };
    }

    function stopAmbient() {
      if (!ambient) return;
      const t = now();
      ambient.droneGain.gain.setTargetAtTime(0, t, 0.3);
      ambient.noiseGain.gain.setTargetAtTime(0, t, 0.3);
      const nodes = ambient.nodes;
      ambient = null;
      setTimeout(() => {
        nodes.forEach((n) => {
          try { if (typeof n.stop === 'function') n.stop(); } catch { /* already stopped */ }
          try { n.disconnect(); } catch { /* detached */ }
        });
      }, 1200);
    }

    /* ---- one-shot effects ------------------------------------------------ */

    function envGain(peak, attack, decay, at) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
      g.connect(master);
      return g;
    }

    function fxType() {
      // Mechanical key: a filtered noise tick plus a tiny sine click.
      const t = now();
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(0.05, false);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 900;
      bp.Q.value = 1.2;
      const g = envGain(0.5, 0.002, 0.045, t);
      src.connect(bp);
      bp.connect(g);
      src.start(t);
      src.stop(t + 0.06);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900 + Math.random() * 300, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.03);
      const g2 = envGain(0.18, 0.001, 0.03, t);
      osc.connect(g2);
      osc.start(t);
      osc.stop(t + 0.04);
    }

    function fxError() {
      const t = now();
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.28);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g = envGain(0.45, 0.005, 0.3, t);
      osc.connect(lp);
      lp.connect(g);
      osc.start(t);
      osc.stop(t + 0.32);
    }

    function fxConfirm() {
      const t = now();
      [660, 880].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const g = envGain(0.3, 0.005, 0.16, t + i * 0.09);
        osc.connect(g);
        osc.start(t + i * 0.09);
        osc.stop(t + i * 0.09 + 0.2);
      });
    }

    function fxGlitch() {
      const t = now();
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(0.09, false);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2500;
      const g = envGain(0.22, 0.002, 0.07, t);
      src.connect(hp);
      hp.connect(g);
      src.start(t);
      src.stop(t + 0.1);
    }

    function fxAlarm() {
      // Low, deliberate double thud for RESIST / suspect flags.
      const t = now();
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, t + offset);
        osc.frequency.exponentialRampToValueAtTime(40, t + offset + 0.18);
        const g = envGain(0.8, 0.004, 0.2, t + offset);
        osc.connect(g);
        osc.start(t + offset);
        osc.stop(t + offset + 0.25);
      });
    }

    function fxBoot() {
      const t = now();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.9);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(3000, t + 0.9);
      const g = envGain(0.22, 0.05, 0.95, t);
      osc.connect(lp);
      lp.connect(g);
      osc.start(t);
      osc.stop(t + 1.05);
    }

    function fxShutter() {
      // Eye closing: a soft low "whump".
      const t = now();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
      const g = envGain(0.6, 0.01, 0.45, t);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.5);
    }

    function fxNotice() {
      const t = now();
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 1320;
      const g = envGain(0.12, 0.004, 0.12, t);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.14);
    }

    const effects = {
      type: fxType,
      error: fxError,
      confirm: fxConfirm,
      glitch: fxGlitch,
      alarm: fxAlarm,
      boot: fxBoot,
      shutter: fxShutter,
      notice: fxNotice
    };

    function play(name) {
      if (!ctx || muted) return;
      const fx = effects[name];
      if (!fx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      try { fx(); } catch { /* audio graph hiccup — never break the UI for sound */ }
    }

    function setVolume(v) {
      volume = Math.min(1, Math.max(0, Number(v) || 0));
      applyMaster();
    }

    function setMuted(flag) {
      muted = Boolean(flag);
      applyMaster();
      if (!ctx) return;
      if (muted) {
        setTimeout(() => { if (muted && ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 300);
      } else if (!pausedByVisibility) {
        ctx.resume().catch(() => {});
        startAmbient();
      }
    }

    function setHidden(hidden) {
      if (!ctx) return;
      pausedByVisibility = hidden;
      if (hidden) {
        ctx.suspend().catch(() => {});
      } else if (!muted) {
        ctx.resume().catch(() => {});
      }
    }

    function resume() {
      if (!ctx || muted) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      startAmbient();
    }

    return {
      get supported() { return supported; },
      get ready() { return ctx !== null; },
      init,
      play,
      startAmbient,
      stopAmbient,
      setVolume,
      setMuted,
      setHidden,
      resume
    };
  }

  window.LM_AUDIO = createEngine();
})();
