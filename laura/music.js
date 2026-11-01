(() => {
  'use strict';
  const config = Object.freeze({ videoId: 'O3TP49DfkO0', startSeconds: 31 });
  const root = document.getElementById('laura-story-invite');
  const entry = document.getElementById('laura-entry');
  const enter = document.getElementById('laura-enter');
  const experience = document.getElementById('laura-experience');
  const frame = document.getElementById('laura-youtube-player');
  const applauseFrame = document.getElementById('laura-applause-player');
  const opener = root?.querySelector('[data-scene="cover"] [data-go="invite"]');
  if (!root || !entry || !enter || !experience || !frame || !opener) return;

  let player = null;
  let ready = false;
  let priming = false;
  let requested = false;
  let playing = false;
  let startPositionSet = false;
  let hasPlayed = false;
  let applausePlayer = null;
  let applauseReady = false;
  let applausePriming = false;
  let applauseRequested = false;
  let applauseTimeout = null;
  root.dataset.musicState = 'loading';

  const params = new URLSearchParams({
    enablejsapi: '1', playsinline: '1', start: String(config.startSeconds),
    autoplay: '0', rel: '0', origin: location.origin
  });
  frame.src = 'https://www.youtube-nocookie.com/embed/' + config.videoId + '?' + params;
  frame.setAttribute('tabindex', '-1');
  if (applauseFrame) {
    const applauseParams = new URLSearchParams({enablejsapi:'1', playsinline:'1', autoplay:'0', rel:'0', origin:location.origin});
    applauseFrame.src = 'https://www.youtube-nocookie.com/embed/t676JzkQSHU?' + applauseParams;
    applauseFrame.setAttribute('tabindex', '-1');
  }

  function primeApplause() {
    if (!applauseReady || !applausePlayer || applauseRequested) return;
    try {
      applausePriming = true;
      applausePlayer.mute();
      applausePlayer.playVideo();
    } catch (_) { applausePriming = false; }
  }

  function fallbackApplause(reason) {
    if (!applauseRequested) return;
    applauseRequested = false;
    applausePriming = false;
    clearTimeout(applauseTimeout);
    root.dataset.applauseState = reason;
    try { applausePlayer?.stopVideo(); } catch (_) {}
    if (root.dataset.storyScene === 'thanks') root.storyTypingSound?.effect('applause');
    if (requested && hasPlayed && !playing) requestPlayback();
  }

  root.playCelebrationApplause = () => {
    clearTimeout(applauseTimeout);
    applauseRequested = true;
    applausePriming = false;
    root.dataset.applauseState = 'starting';
    if (!applauseReady || !applausePlayer) { fallbackApplause('unavailable'); return; }
    try {
      applausePlayer.unMute();
      applausePlayer.setVolume(100);
      applausePlayer.seekTo(0, true);
      applauseTimeout = setTimeout(() => fallbackApplause('blocked'), 2500);
      applausePlayer.playVideo();
    } catch (_) { fallbackApplause('error'); }
  };

  function primePlayer() {
    if (!ready || !player || requested) return;
    try {
      // The first invitation tap can prepare media without giving away the surprise.
      priming = true;
      root.dataset.musicState = 'preparing';
      player.mute();
      player.playVideo();
    } catch (_) {
      priming = false;
    }
  }
  function requestPlayback() {
    if (!requested || !ready || !player || playing) return;
    try {
      priming = false;
      player.unMute();
      player.setVolume(85);
      if (!startPositionSet) {
        player.seekTo(config.startSeconds, true);
        startPositionSet = true;
      }
      player.playVideo();
    } catch (_) {}
  }
  function beginMusic() {
    if (!requested) {
      requested = true;
      root.dataset.musicPhase = 'opened';
      root.dataset.musicState = 'starting';
    }
    requestPlayback();
  }

  enter.addEventListener('click', () => {
    primePlayer();
    primeApplause();
    root.dataset.entryComplete = 'true';
    experience.inert = false;
    entry.hidden = true;
    if (typeof root.beginCover === 'function') root.beginCover();
  });
  enter.disabled = false;

  // Attempt playback in the same tap that sends the birds into flight.
  opener.addEventListener('pointerup', event => {
    if (entry.hidden && !opener.disabled && event.button === 0) beginMusic();
  }, { capture: true });
  root.openWithMusic = begin => {
    beginMusic();
    begin();
  };
  document.addEventListener('pointerdown', () => {
    if (requested && !playing) requestPlayback();
  }, { capture: true });

  function createPlayer() {
    if (player) return;
    player = new YT.Player('laura-youtube-player', {
      events: {
        onReady(event) {
          player = event.target;
          ready = true;
          if (!requested) root.dataset.musicState = 'ready';
          player.cueVideoById({ videoId: config.videoId, startSeconds: config.startSeconds });
          if (requested) requestPlayback();
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            if (priming && !requested) {
              priming = false;
              root.dataset.musicState = 'prepared';
              player.pauseVideo();
              player.seekTo(config.startSeconds, true);
              return;
            }
            if (!requested) { player.pauseVideo(); return; }
            priming = false;
            playing = true;
            hasPlayed = true;
            root.dataset.musicState = 'playing';
          } else if (event.data === YT.PlayerState.ENDED) {
            playing = false;
            if (requested) {
              startPositionSet = false;
              requestPlayback();
            }
          } else if (event.data === YT.PlayerState.PAUSED) {
            playing = false;
            root.dataset.musicState = 'paused';
          }
        },
        onAutoplayBlocked() { priming = false; playing = false; root.dataset.musicState = 'blocked'; },
        onError() { priming = false; playing = false; root.dataset.musicState = 'error'; }
      }
    });
    if (applauseFrame) applausePlayer = new YT.Player('laura-applause-player', {
      events: {
        onReady(event) {
          applausePlayer = event.target;
          applauseReady = true;
          applausePlayer.cueVideoById({videoId:'t676JzkQSHU', startSeconds:0});
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            if (applausePriming && !applauseRequested) {
              applausePriming = false;
              applausePlayer.pauseVideo();
              applausePlayer.seekTo(0, true);
            } else if (applauseRequested) {
              clearTimeout(applauseTimeout);
              root.dataset.applauseState = 'playing';
            } else applausePlayer.pauseVideo();
          } else if (event.data === YT.PlayerState.ENDED && applauseRequested) {
            applauseRequested = false;
            root.dataset.applauseState = 'ended';
            if (requested && hasPlayed && !playing) requestPlayback();
          }
        },
        onAutoplayBlocked() { applausePriming = false; fallbackApplause('blocked'); },
        onError() { applauseReady = false; applausePriming = false; fallbackApplause('error'); }
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && requested && hasPlayed && !playing) requestPlayback();
  });
  window.onYouTubeIframeAPIReady = createPlayer;
  if (window.YT && window.YT.Player) createPlayer();
  else {
    const sdk = document.createElement('script');
    sdk.src = 'https://www.youtube.com/iframe_api';
    sdk.async = true;
    sdk.onerror = () => { root.dataset.musicState = 'error'; };
    document.head.appendChild(sdk);
  }
  window.LAURA_MUSIC_CONFIG = config;
})();
