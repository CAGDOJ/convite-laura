(() => {
  'use strict';
  const root = document.getElementById('laura-story-invite');
  const control = document.getElementById('laura-keys-control');
  if (!root || !control) return;
  const Context = window.AudioContext || window.webkitAudioContext;
  const effectsVolume = .3;
  const preferenceKey = 'laura-typewriter-sound';
  let enabled = true;
  try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch (_) {}
  let context = null;
  let output = null;
  let samples = [];
  let foley = {};
  let strokes = 0;

  function usePlaybackSession() {
    // Safari otherwise treats Web Audio as ambient and can mute it with the ringer.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}
  }

  function render() {
    const active = enabled && context?.state === 'running';
    control.textContent = active ? 'Efeitos sonoros ligados' : 'Ativar efeitos sonoros';
    control.setAttribute('aria-pressed', String(active));
    control.setAttribute('aria-label', active ? 'Desativar o som das teclas e do bichinho' : 'Ativar o som das teclas e do bichinho');
    control.dataset.audioState = !enabled ? 'off' : context?.state || 'waiting';
    control.disabled = !Context;
  }

  // Short noise transients plus a damped body make a mechanical clack, not a beep.
  function makeSample(variant, carriage = false) {
    const duration = carriage ? .12 : .055;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / context.sampleRate;
      const noise = Math.random() * 2 - 1;
      low = low * .58 + noise * .42;
      const attack = Math.min(1, t / .0012);
      const strike = (noise - low) * Math.exp(-t * (carriage ? 100 : 190)) * .4;
      const body = low * Math.exp(-t * (80 + variant * 5)) * .32;
      const release = t > .014 ? (noise - low) * Math.exp(-(t - .014) * 230) * .055 : 0;
      data[i] = Math.max(-1, Math.min(1, (strike + body + release) * attack));
    }
    return buffer;
  }

  function ensureContext() {
    if (context || !Context) return;
    try {
      usePlaybackSession();
      context = new Context({ latencyHint: 'interactive' });
      output = context.createGain();
      output.gain.value = enabled ? effectsVolume : 0;
      output.connect(context.destination);
      samples = [0, 1, 2, 3].map(variant => makeSample(variant));
      samples.push(makeSample(1, true));
      foley = { hoof: makeFoley('hoof'), bite: makeFoley('bite'), chew: makeFoley('chew'), paper: makeFoley('paper'), ready: makeFoley('ready') };
      context.addEventListener('statechange', render);
    } catch (_) {
      context = null;
    }
    render();
  }

  // Resume directly inside a touch/click so Safari and Chrome can unlock audio.
  function unlock() {
    if (!enabled || document.visibilityState !== 'visible') return Promise.resolve(false);
    ensureContext();
    if (!context) return Promise.resolve(false);
    usePlaybackSession();
    output.gain.setValueAtTime(effectsVolume, context.currentTime);
    if (context.state !== 'running') {
      // A one-sample primer supports touch-based Web Audio activation on iOS.
      const primer = context.createBufferSource();
      primer.buffer = context.createBuffer(1, 1, context.sampleRate);
      primer.connect(output);
      primer.onended = () => primer.disconnect();
      primer.start(context.currentTime);
      return context.resume().then(() => { render(); return context.state === 'running'; }, () => { render(); return false; });
    }
    render();
    return Promise.resolve(true);
  }

  function makeFoley(kind) {
    const duration = kind === 'paper' ? .7 : kind === 'ready' ? .38 : kind === 'hoof' ? .14 : kind === 'bite' ? .34 : .2;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    const fractures = kind === 'bite' ? [0, .022, .048, .079, .118, .17] : [.015, .07, .12];
    for (let i = 0; i < data.length; i++) {
      const t = i / context.sampleRate;
      const noise = Math.random() * 2 - 1;
      smooth = smooth * .82 + noise * .18;
      let value;
      if (kind === 'ready') {
        const first = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 19) * Math.min(1, t / .012);
        const second = t > .11 ? Math.sin(2 * Math.PI * 1174.66 * (t - .11)) * Math.exp(-(t - .11) * 18) * Math.min(1, (t - .11) / .012) : 0;
        value = (first + second) * .23;
      } else if (kind === 'paper') {
        const envelope = Math.pow(Math.sin(Math.PI * t / duration), 2);
        const folds = .35 + .65 * Math.pow(Math.sin(2 * Math.PI * 5.5 * t), 2);
        let creases = 0;
        for (const at of [.06, .19, .35, .51]) if (t >= at) creases += Math.exp(-(t - at) * 55) * .16;
        value = (smooth * 1.3 + noise * .25) * envelope * folds + (noise - smooth) * creases;
      } else if (kind === 'hoof') {
        const clop = Math.sin(2 * Math.PI * 205 * t) * Math.exp(-t * 65) * .65;
        const tap = (noise - smooth) * Math.exp(-t * 145) * .3;
        const leaves = t > .025 ? smooth * Math.exp(-(t - .025) * 35) * .5 : 0;
        value = clop + tap + leaves;
      } else {
        // Layer crisp little fractures over a softer mouth sound.
        let crackle = 0;
        for (const at of fractures) if (t >= at) crackle += Math.exp(-(t - at) * (kind === 'bite' ? 95 : 125));
        const body = Math.sin(2 * Math.PI * (kind === 'bite' ? 260 : 165) * t) * Math.exp(-t * 28);
        value = (noise - smooth * .7) * crackle * (kind === 'bite' ? .48 : .16) + smooth * Math.exp(-t * 16) * .8 + body * .13;
      }
      data[i] = Math.max(-1, Math.min(1, value * Math.min(1, t / .0005)));
    }
    return buffer;
  }

  function effect(kind, variation = 0) {
    if (!enabled || document.visibilityState !== 'visible' || context?.state !== 'running' || !foley[kind]) return;
    const source = context.createBufferSource();
    source.buffer = foley[kind];
    source.playbackRate.value = 1 + variation * .025;
    const gain = context.createGain();
    gain.gain.value = kind === 'ready' ? .75 : kind === 'paper' ? .95 : kind === 'hoof' ? .9 : kind === 'bite' ? 1.35 : .85;
    source.connect(gain);
    gain.connect(output);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(context.currentTime);
  }

  function strike(token) {
    if (!enabled || document.visibilityState !== 'visible' || context?.state !== 'running' || !samples.length) return;
    try {
      const source = context.createBufferSource();
      source.buffer = token === '\n' ? samples[4] : samples[strokes % 4];
      const gain = context.createGain();
      gain.gain.value = token === ' ' ? .25 : token === '\n' ? .45 : .65;
      source.connect(gain);
      gain.connect(output);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start(context.currentTime);
      strokes++;
    } catch (_) {
      // The text keeps typing if the browser interrupts the audio device.
    }
  }

  function gesture(event) {
    if (event.target instanceof Element && event.target.closest('#laura-keys-control')) return;
    unlock();
  }
  document.addEventListener('pointerdown', gesture, { capture: true, passive: true });
  document.addEventListener('pointerup', gesture, { capture: true, passive: true });
  document.addEventListener('touchend', gesture, { capture: true, passive: true });
  document.addEventListener('click', gesture, { capture: true, passive: true });
  document.addEventListener('keydown', gesture, { capture: true });
  control.addEventListener('click', () => {
    const active = enabled && context?.state === 'running';
    enabled = !active;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch (_) {}
    if (enabled) unlock();
    else if (context && output) output.gain.setValueAtTime(0, context.currentTime);
    render();
  });
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.visibilityState === 'hidden') {
      if (context.state === 'running') context.suspend().catch(() => {});
    } else if (enabled) {
      unlock();
    }
  });
  root.storyTypingSound = {
    strike, effect,
    start() {
      enabled = true;
      try { localStorage.setItem(preferenceKey, 'on'); } catch (_) {}
      return unlock();
    },
    get state() { return context?.state || 'waiting'; },
    get strokes() { return strokes; }
  };
  render();
  window.addEventListener('pageshow', () => { if (enabled) unlock(); });
  // Attempt playback on entry; any real touch resumes it if autoplay was blocked.
  if (enabled) unlock();
})();
