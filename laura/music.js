(() => {
  'use strict';
  const config = Object.freeze({ videoId: 'O3TP49DfkO0', startSeconds: 31 });
  const root = document.getElementById('laura-story-invite');
  const frame = document.getElementById('laura-youtube-player');
  const gate = document.getElementById('laura-music-gate');
  const panel = document.getElementById('laura-music-panel');
  const startButton = document.getElementById('laura-music-control');
  const continueButton = document.getElementById('laura-music-continue');
  const skipButton = document.getElementById('laura-music-skip');
  const status = document.getElementById('laura-music-status');
  if (!root || !frame || !gate || !panel || !startButton || !continueButton || !skipButton || !status) return;

  let player = null;
  let ready = false;
  let sdkFailed = false;
  let requested = false;
  let playing = false;
  let hasPlayed = false;
  let userStopped = false;
  let panelShown = false;
  let pendingOpen = null;
  let watchdog = 0;

  const params = new URLSearchParams({
    enablejsapi: '1', playsinline: '1', start: String(config.startSeconds),
    autoplay: '0', rel: '0', origin: location.origin
  });
  const videoUrl = 'https://www.youtube-nocookie.com/embed/' + config.videoId + '?' + params;
  frame.src = videoUrl;

  function say(message) { status.textContent = message; }
  function showGate() {
    gate.inert = false;
    gate.setAttribute('aria-hidden', 'false');
    gate.classList.add('is-open');
  }
  function hideGate() {
    gate.classList.remove('is-open', 'is-playing');
    gate.setAttribute('aria-hidden', 'true');
    gate.inert = true;
  }
  function showPlayer(message) {
    clearTimeout(watchdog);
    showGate();
    const firstReveal = !panelShown;
    panelShown = true;
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('is-shown');
    // Refresh the visible player at the requested point so its own play button
    // can be used if the browser rejected scripted playback.
    if (firstReveal && ready && player && !playing && !hasPlayed) {
      try { player.cueVideoById({ videoId: config.videoId, startSeconds: config.startSeconds }); } catch (_) {}
    }
    startButton.hidden = true;
    continueButton.hidden = ready;
    if (hasPlayed && !pendingOpen) {
      gate.classList.add('is-playing');
      skipButton.textContent = 'Parar música';
    }
    say(message || 'Toque no ▶ do vídeo para iniciar a música e abrir o convite.');
  }
  function beginStory() {
    const begin = pendingOpen;
    pendingOpen = null;
    if (!begin) return;
    if (panelShown && playing) {
      // The YouTube player remains visible when the guest had to start it directly.
      gate.classList.add('is-playing');
      skipButton.textContent = 'Parar música';
    } else {
      hideGate();
    }
    begin();
  }
  function requestPlayback() {
    if (!requested || userStopped) return;
    clearTimeout(watchdog);
    if (ready && player) {
      try {
        player.unMute();
        player.setVolume(85);
        player.playVideo();
      } catch (_) {
        showPlayer();
        return;
      }
    } else if (sdkFailed) {
      showPlayer('Toque no ▶ do vídeo. Depois, toque em abrir convite.');
      return;
    }
    say('Preparando a música...');
    watchdog = setTimeout(() => {
      if (!playing && requested && !userStopped) showPlayer();
    }, 5000);
  }

  // Opening the invitation first shows an explicit music-start button.
  root.openWithMusic = begin => {
    if (playing) { begin(); return; }
    pendingOpen = begin;
    userStopped = false;
    requested = false;
    panelShown = false;
    panel.classList.remove('is-shown');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    if (frame.getAttribute('src') === 'about:blank') frame.src = videoUrl;
    startButton.hidden = false;
    startButton.disabled = false;
    continueButton.hidden = true;
    skipButton.textContent = 'Continuar sem música';
    gate.classList.remove('is-playing');
    say('Toque no botão para começar nossa história com música.');
    showGate();
  };
  startButton.addEventListener('click', () => {
    requested = true;
    userStopped = false;
    root.dataset.musicPhase = 'opened';
    requestPlayback();
  });
  continueButton.addEventListener('click', () => {
    // Used when the YouTube API has not loaded enough to report playback.
    if (panelShown) { playing = true; hasPlayed = true; requested = true; }
    beginStory();
  });
  skipButton.addEventListener('click', () => {
    userStopped = true;
    requested = false;
    clearTimeout(watchdog);
    if (ready && player && playing) player.pauseVideo();
    else if (!ready && panelShown) frame.src = 'about:blank';
    playing = false;
    hideGate();
    beginStory();
  });

  function createPlayer() {
    if (player) return;
    player = new YT.Player('laura-youtube-player', {
      events: {
        onReady(event) {
          player = event.target;
          ready = true;
          if (playing && !pendingOpen) return;
          player.cueVideoById({ videoId: config.videoId, startSeconds: config.startSeconds });
          if (requested && !userStopped) requestPlayback();
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            if (!requested || userStopped) { player.pauseVideo(); return; }
            clearTimeout(watchdog);
            playing = true;
            hasPlayed = true;
            say('A música está tocando.');
            if (pendingOpen) beginStory();
          } else if (event.data === YT.PlayerState.ENDED) {
            playing = false;
            if (requested && !userStopped) {
              player.seekTo(config.startSeconds, true);
              requestPlayback();
            }
          } else if (event.data === YT.PlayerState.PAUSED) {
            playing = false;
            if (requested && !userStopped && pendingOpen) showPlayer('Toque no ▶ do vídeo para começar.');
            else if (requested && !userStopped && hasPlayed && document.visibilityState === 'visible') showPlayer('Toque no ▶ do vídeo para continuar.');
          } else if (event.data === YT.PlayerState.BUFFERING && pendingOpen) {
            say('Preparando a música...');
          }
        },
        onAutoplayBlocked() {
          playing = false;
          if (requested && !userStopped) showPlayer();
        },
        onError() {
          playing = false;
          if (requested && !userStopped) showPlayer('Não foi possível iniciar o vídeo. Você pode continuar sem música.');
        }
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && requested && hasPlayed && !playing && !userStopped) requestPlayback();
  });
  window.onYouTubeIframeAPIReady = createPlayer;
  if (window.YT && window.YT.Player) {
    createPlayer();
  } else {
    const sdk = document.createElement('script');
    sdk.src = 'https://www.youtube.com/iframe_api';
    sdk.async = true;
    sdk.onerror = () => {
      sdkFailed = true;
      if (requested && !userStopped) showPlayer('Toque no ▶ do vídeo. Depois, toque em abrir convite.');
    };
    document.head.appendChild(sdk);
  }
  window.LAURA_MUSIC_CONFIG = config;
})();
