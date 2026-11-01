(() => {
  'use strict';
  const config = Object.freeze({ videoId: 'O3TP49DfkO0', startSeconds: 31 });
  const root = document.getElementById('laura-story-invite');
  const frame = document.getElementById('laura-youtube-player');
  const panel = root?.querySelector('.music-panel');
  const control = document.getElementById('laura-music-control');
  const status = document.getElementById('laura-music-status');
  const opener = root?.querySelector('[data-scene="cover"] [data-go="invite"]');
  if (!root || !frame || !panel || !control || !status || !opener) return;

  let player = null;
  let ready = false;
  let openingRequested = false;
  let playbackRequested = false;
  let playing = false;
  let hasPlayed = false;
  let userPaused = false;
  let watchdog = 0;
  let recoveryTimer = 0;
  let recoveryAttempts = 0;

  const params = new URLSearchParams({
    enablejsapi: '1', playsinline: '1', start: String(config.startSeconds),
    autoplay: '0', rel: '0', origin: location.origin
  });
  frame.src = 'https://www.youtube-nocookie.com/embed/' + config.videoId + '?' + params;
  frame.setAttribute('tabindex', '-1');

  function say(message) { status.textContent = message; }
  function showRetry(message) {
    clearTimeout(watchdog);
    control.textContent = 'Tocar música';
    control.setAttribute('aria-pressed', 'false');
    say(message);
  }
  function requestPlayback() {
    if (!openingRequested || userPaused) return;
    playbackRequested = true;
    clearTimeout(watchdog);
    if (ready && player) {
      try {
        player.unMute();
        player.setVolume(85);
        // Called synchronously from the invitation button whenever the player is ready.
        player.playVideo();
      } catch (_) {
        showRetry('Toque no botão para ativar a música.');
        return;
      }
    }
    watchdog = setTimeout(() => {
      if (!playing && openingRequested && !userPaused) {
        showRetry('Toque no botão para ativar a música.');
      }
    }, 7000);
  }

  function startWithOpeningGesture() {
    openingRequested = true;
    userPaused = false;
    root.dataset.musicPhase = 'opened';
    if (!playing) requestPlayback();
  }
  // On phones pointerup is still part of the same tap, before click is
  // dispatched. Keyboard and older browsers keep the click fallback.
  opener.addEventListener('pointerup', event => {
    if (!opener.disabled && event.button === 0) startWithOpeningGesture();
  }, { capture: true });
  opener.addEventListener('click', startWithOpeningGesture, { capture: true });

  document.addEventListener('pointerdown', () => {
    // Reuse a later guest interaction if the browser blocked the first attempt.
    if (openingRequested && !playing && !userPaused) requestPlayback();
  }, { capture: true });
  control.addEventListener('click', () => {
    if (ready && playing) {
      userPaused = true;
      playbackRequested = false;
      player.pauseVideo();
    } else {
      userPaused = false;
      requestPlayback();
    }
  });

  function createPlayer() {
    if (player) return;
    player = new YT.Player('laura-youtube-player', {
      events: {
        onReady(event) {
          player = event.target;
          ready = true;
          // Prepare the video before the click, keeping the click available to iOS.
          player.cueVideoById({ videoId: config.videoId, startSeconds: config.startSeconds });
          if (playbackRequested && !userPaused) requestPlayback();
        },
        onStateChange(event) {
          const state = event.data;
          if (state === YT.PlayerState.PLAYING) {
            if (!openingRequested) { player.pauseVideo(); return; }
            clearTimeout(watchdog);
            playing = true;
            hasPlayed = true;
            playbackRequested = false;
            userPaused = false;
            recoveryAttempts = 0;
            control.textContent = 'Pausar música';
            control.setAttribute('aria-pressed', 'true');
            say('A música está tocando.');
          } else if (state === YT.PlayerState.ENDED) {
            playing = false;
            if (openingRequested && !userPaused) {
              // Restart at the same part of the song after every completed play.
              player.seekTo(config.startSeconds, true);
              requestPlayback();
            }
          } else if (state === YT.PlayerState.PAUSED) {
            playing = false;
            clearTimeout(watchdog);
            if (!userPaused && openingRequested) showRetry('Toque no botão para continuar a música.');
            if (!userPaused && hasPlayed && document.visibilityState === 'visible' && recoveryAttempts < 2) {
              recoveryAttempts += 1;
              clearTimeout(recoveryTimer);
              recoveryTimer = setTimeout(requestPlayback, 700);
            }
            control.textContent = 'Tocar música';
            control.setAttribute('aria-pressed', 'false');
          } else if (state === YT.PlayerState.BUFFERING) {
            say('Preparando a música...');
          }
        },
        onAutoplayBlocked() {
          playing = false;
          playbackRequested = false;
          clearTimeout(recoveryTimer);
          showRetry('Toque no botão para ativar a música.');
        },
        onError() {
          playing = false;
          playbackRequested = false;
          if (openingRequested) showRetry('Se necessário, abra a música no YouTube.');
        }
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && openingRequested && hasPlayed && !playing && !userPaused) {
      requestPlayback();
    }
  });
  window.onYouTubeIframeAPIReady = createPlayer;
  if (window.YT && window.YT.Player) {
    createPlayer();
  } else {
    const sdk = document.createElement('script');
    sdk.src = 'https://www.youtube.com/iframe_api';
    sdk.async = true;
    sdk.onerror = () => {
      if (openingRequested) showRetry('Não foi possível carregar o player. Abra a música no YouTube.');
    };
    document.head.appendChild(sdk);
  }
  window.LAURA_MUSIC_CONFIG = config;
})();
