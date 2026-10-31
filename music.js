(() => {
  'use strict';
  const config = Object.freeze({ videoId: 'O3TP49DfkO0', startSeconds: 33 });
  const frame = document.getElementById('laura-youtube-player');
  const control = document.getElementById('laura-music-control');
  const status = document.getElementById('laura-music-status');
  const opener = document.querySelector('[data-scene="cover"] [data-go="invite"]');
  if (!frame || !control || !status || !opener) return;
  const root = document.getElementById('laura-story-invite');
  const soundToggle = document.createElement('button');
  soundToggle.type = 'button';
  soundToggle.className = 'l-sound-toggle';
  soundToggle.textContent = 'Música ao abrir';
  soundToggle.setAttribute('aria-label', 'Ativar ou pausar a música do convite');
  soundToggle.setAttribute('aria-pressed', 'false');
  control.parentElement.appendChild(soundToggle);
  soundToggle.disabled = true;
  control.disabled = true;
  frame.inert = true;
  frame.style.pointerEvents = 'none';
  frame.setAttribute('tabindex', '-1');
  root.dataset.musicPhase = 'waiting';
  let openingRequested = false;
  let player = null;
  let ready = false;
  let playing = false;
  let playbackRequested = false;
  let loadedForPlayback = false;
  let loadingWatchdog;

  const origin = location.origin;
  const params = new URLSearchParams({ enablejsapi: '1', playsinline: '1', start: String(config.startSeconds), autoplay: '0', rel: '0', origin });
  frame.src = 'https://www.youtube-nocookie.com/embed/' + config.videoId + '?' + params;

  function say(message) { status.textContent = message; }
  function soundState(state) {
    soundToggle.dataset.sound = state;
    soundToggle.textContent = state === 'playing' ? 'Som ligado' : state === 'loading' ? 'Carregando...' : 'Ativar som';
    soundToggle.setAttribute('aria-pressed', String(state === 'playing'));
  }
  function requestPlayback() {
    if (!openingRequested) return false;
    playbackRequested = true;
    if (!ready || !player) {
      soundState('loading');
      say('Preparando a música. Se necessário, toque no play do vídeo abaixo.');
      return false;
    }
    // The opening click must reach this code synchronously, before the envelope animation.
    // Load-and-play is atomic, avoiding a race between cueVideoById, seekTo and playVideo.
    clearTimeout(loadingWatchdog);
    soundState('loading');
    player.unMute();
    player.setVolume(85);
    if (!loadedForPlayback) {
      loadedForPlayback = true;
      player.loadVideoById({ videoId: config.videoId, startSeconds: config.startSeconds });
    } else {
      player.playVideo();
    }
    loadingWatchdog = setTimeout(() => {
      if (playing) return;
      soundState('blocked');
      say('O som ainda não começou. Toque diretamente no play do vídeo ou use Ouvir no YouTube.');
    }, 9000);
    return true;
  }
  opener.addEventListener('click', () => {
    openingRequested = true;
    root.dataset.musicPhase = 'opened';
    soundToggle.disabled = false;
    control.disabled = false;
    frame.inert = false;
    frame.style.pointerEvents = '';
    frame.removeAttribute('tabindex');
    requestPlayback();
  }, { capture: true });
  control.addEventListener('click', () => {
    if (ready && playing) player.pauseVideo();
    else requestPlayback();
  });
  soundToggle.addEventListener('click', () => {
    if (ready && playing) player.pauseVideo();
    else requestPlayback();
  });

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('laura-youtube-player', {
      events: {
        onReady(event) {
          ready = true;
          say(openingRequested ? 'A música começa em 0:33.' : 'Primeiro, a história com o som das teclas. A música começa ao abrir o convite.');
          if (playbackRequested) requestPlayback();
        },
        onStateChange(event) {
          playing = event.data === YT.PlayerState.PLAYING;
          if (playing) {
            if (!openingRequested) { player.pauseVideo(); return; }
            clearTimeout(loadingWatchdog);
            playbackRequested = false;
            loadedForPlayback = true;
            soundState('playing');
            control.textContent = 'Pausar música';
            control.setAttribute('aria-pressed', 'true');
            say('A trilha da Laura está tocando.');
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            clearTimeout(loadingWatchdog);
            playbackRequested = false;
            soundState('paused');
            if (event.data === YT.PlayerState.ENDED) {
              loadedForPlayback = false;
            }
            control.textContent = 'Tocar música';
            control.setAttribute('aria-pressed', 'false');
            say('Toque para continuar ouvindo.');
          } else if (event.data === YT.PlayerState.BUFFERING) {
            soundState('loading');
            say('Carregando a trilha a partir de 0:33...');
          }
        },
        onAutoplayBlocked() {
          clearTimeout(loadingWatchdog);
          playbackRequested = false;
          soundState('blocked');
          say('Seu navegador pediu um toque para liberar o som. Use Ativar som ou o play do vídeo.');
          control.textContent = 'Tocar música';
          control.setAttribute('aria-pressed', 'false');
        },
        onError(event) {
          clearTimeout(loadingWatchdog);
          loadedForPlayback = false;
          soundState('blocked');
          const unavailable = [100, 101, 150].includes(event.data);
          say(unavailable ? 'Este vídeo não está disponível no player. Use Ouvir no YouTube.' : 'Se o player não carregar, use Ouvir no YouTube.');
          control.textContent = 'Tentar tocar música';
        }
      }
    });
  };
  const sdk = document.createElement('script');
  sdk.src = 'https://www.youtube.com/iframe_api';
  sdk.async = true;
  sdk.onerror = () => say('Não foi possível carregar o player. Use Ouvir no YouTube.');
  document.head.appendChild(sdk);
  window.LAURA_MUSIC_CONFIG = config;
})();
