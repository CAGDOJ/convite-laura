(() => {
  'use strict';
  const root = document.getElementById('laura-story-invite');
  const paper = root?.querySelector('.l-paper');
  const opener = root?.querySelector('[data-scene="cover"] [data-go="invite"]');
  const cover = root?.querySelector('[data-scene="cover"]');
  if (!root || !paper || !opener) return;
  const writer = root.storyWriter;
  if (!writer) return;
  root.dataset.storyScene = 'cover';
  root.dataset.storyWorld = 'forest';
  // Birds reach the sky, the fawn eats the apple, then the letter opens.
  const timing = {
    flight: 4400, messageAt: 200, envelopeAt: 4600,
    fawnAt: 6000, nibbleAt: 8400, openAt: 10500,
    letterAt: 11000, leaveAt: 11000, readAt: 15400
  };
  for (const [name, value] of Object.entries(timing)) {
    paper.style.setProperty('--l-sky-' + name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), value + 'ms');
  }
  const sky = document.createElement('div');
  sky.className = 'l-sky-backdrop';
  sky.setAttribute('aria-hidden', 'true');
  sky.innerHTML = '<span class="l-cloud l-cloud-one"></span><span class="l-cloud l-cloud-two"></span><span class="l-cloud l-cloud-three"></span><span class="l-cloud l-cloud-four"></span>';
  paper.prepend(sky);
  const birds = document.createElement('div');
  birds.className = 'l-birds';
  birds.setAttribute('aria-hidden', 'true');
  birds.innerHTML = '<span class="l-flying-bird l-bird-left"><img src="assets/bluebird.png" width="74" height="65" alt=""></span><span class="l-flying-bird l-bird-right"><img src="assets/bluebird.png" width="68" height="60" alt=""></span>';
  paper.appendChild(birds);
  const stage = document.createElement('div');
  stage.className = 'l-envelope-stage';
  stage.hidden = true;
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-label', 'Abertura do convite no céu');
  stage.setAttribute('aria-live', 'off');
  stage.innerHTML = `
    <div class="l-flight-forest" aria-hidden="true"></div>
    <p class="l-envelope-intro">Uma história especial<br>está prestes a começar...</p>
    <div class="l-envelope-shell" aria-hidden="true">
      <div class="l-envelope-back"></div>
      <div class="l-envelope-pocket"><div class="l-envelope-letter">
        <p class="l-letter-kicker">Um convite encantado</p>
        <p class="l-letter-name">Laura</p><p class="l-letter-age">1 ano</p>
        <div class="l-art"></div>
      </div></div>
      <div class="l-envelope-flap"></div><div class="l-envelope-side left"></div>
      <div class="l-envelope-side right"></div><div class="l-envelope-bottom"></div>
      <div class="l-envelope-seal">
        <svg class="l-seal-apple" viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="l-apple-color" cx="30%" cy="22%" r="80%"><stop stop-color="#F88C72"/><stop offset=".42" stop-color="#D94A3B"/><stop offset="1" stop-color="#98232A"/></radialGradient>
            <mask id="l-apple-bites" maskUnits="userSpaceOnUse" x="0" y="0" width="80" height="90">
              <rect width="80" height="90" fill="white"/>
              <g class="l-apple-bite l-apple-bite-one" fill="black"><circle cx="71" cy="38" r="13"/><circle cx="69" cy="49" r="10"/></g>
              <g class="l-apple-bite l-apple-bite-two" fill="black"><circle cx="63" cy="54" r="16"/><circle cx="67" cy="67" r="11"/></g>
            </mask>
          </defs>
          <path d="M40 26c-1-9 1-14 6-20" fill="none" stroke="#71523C" stroke-width="5" stroke-linecap="round"/>
          <path d="M43 19c3-12 16-15 23-12-2 11-11 17-23 12" fill="#7B9A5D"/>
          <g mask="url(#l-apple-bites)"><path d="M40 28c-12-10-29-3-31 14-3 20 7 41 20 41 5 0 7-3 11-3s7 3 12 3c13 0 24-21 21-41-2-17-20-24-33-14Z" fill="url(#l-apple-color)"/><path d="M20 46c0-7 3-11 8-12" stroke="#FFE2CB" stroke-opacity=".65" stroke-width="4" stroke-linecap="round" fill="none"/></g>
        </svg>
      </div>
      <div class="l-fawn-visitor"><span class="l-fawn-cloud"></span><img src="assets/fawn-visitor.webp" width="240" height="270" alt="" decoding="async"></div>
    </div>
    <p class="l-envelope-signature">Com carinho, Laura</p>
    <button class="l-envelope-continue" type="button" hidden>Ver meu convite</button>`;
  paper.appendChild(stage);
  if (window.lucide) window.lucide.createIcons();
  let opening = false;
  let revealInvitation = null;
  let openingTimers = [];
  let sceneWriting = null;
  let openingWriting = null;
  const continueButton = stage.querySelector('.l-envelope-continue');
  const coverText = Array.from(cover.querySelectorAll('.l-once,.l-kicker,.l-name,.l-age,.l-copy'));
  const inviteText = Array.from(root.querySelectorAll('[data-scene="invite"] .l-invite-frame .l-kicker,[data-scene="invite"] .l-invite-frame .l-name,[data-scene="invite"] .l-invite-frame .l-age,[data-scene="invite"] .l-invite-frame .l-copy'));
  const introText = stage.querySelector('.l-envelope-intro');
  const letterText = Array.from(stage.querySelectorAll('.l-letter-kicker,.l-letter-name,.l-letter-age,.l-envelope-signature'));
  [introText, ...letterText].forEach(element => writer.prepare(element).reset());

  root.startSceneWriting = function (name) {
    sceneWriting?.abort();
    sceneWriting = new AbortController();
    const signal = sceneWriting.signal;
    root.dataset.reading = 'false';
    if (name !== 'cover' && name !== 'invite') return;
    const elements = name === 'cover' ? coverText : inviteText;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      writer.show(elements);
      opener.disabled = false;
      return;
    }
    root.dataset.reading = 'true';
    if (name === 'cover') opener.disabled = true;
    (async () => {
      if (!await writer.sequence(elements, signal, { speed: 120, gap: 380 })) return;
      // Text is complete before the next motion or opening control is available.
      if (!await writer.pause(name === 'cover' ? 2400 : 1800, signal)) return;
      root.dataset.reading = 'false';
      if (name === 'cover') {
        opener.disabled = false;
        root.storyTypingSound?.effect('ready');
      }
    })();
  };

  function finishOpening() {
    if (!opening) return;
    openingTimers.forEach(clearTimeout);
    openingTimers = [];
    openingWriting?.abort();
    openingWriting = null;
    stage.hidden = true;
    stage.classList.remove('is-reading', 'is-opening', 'is-exiting', 'has-first-bite', 'has-second-bite');
    continueButton.hidden = true;
    continueButton.disabled = false;
    opening = false;
    opener.disabled = false;
    cover.inert = false;
    opener.removeAttribute('aria-busy');
    paper.style.removeProperty('height');
    const reveal = revealInvitation;
    revealInvitation = null;
    if (reveal) {
      reveal();
      const title = root.querySelector('[data-scene="invite"] h1');
      title?.setAttribute('tabindex', '-1');
      title?.focus({ preventScroll: true });
    }
  }
  continueButton.addEventListener('click', () => {
    if (!opening || continueButton.disabled) return;
    continueButton.disabled = true;
    stage.classList.add('is-exiting');
    openingTimers.push(setTimeout(finishOpening, 900));
  });
  root.openInvitation = function (reveal) {
    if (opening) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.storyWorld = 'sky';
      reveal();
      return;
    }
    opening = true;
    sceneWriting?.abort();
    openingWriting = new AbortController();
    const signal = openingWriting.signal;
    revealInvitation = reveal;
    opener.disabled = true;
    cover.inert = true;
    opener.setAttribute('aria-busy', 'true');
    paper.style.height = paper.getBoundingClientRect().height + 'px';
    stage.classList.remove('is-opening', 'is-exiting', 'has-first-bite', 'has-second-bite');
    stage.hidden = false;
    continueButton.hidden = true;
    letterText.forEach(element => writer.prepare(element).reset());
    writer.show([introText]);
    (() => {
      if (!opening || signal.aborted) return;
      root.dataset.reading = 'false';
      root.dataset.storyScene = 'opening';
      root.dataset.storyWorld = 'sky';
      // Birds and the music both start from the opening click.
      requestAnimationFrame(() => {
        if (signal.aborted) return;
        stage.classList.add('is-opening');
        openingTimers = [
          setTimeout(() => stage.classList.add('has-first-bite'), timing.nibbleAt + 450),
          setTimeout(() => stage.classList.add('has-second-bite'), timing.nibbleAt + 1050),
          setTimeout(async () => {
            root.dataset.reading = 'true';
            if (!await writer.sequence(letterText, signal, { speed: 120, gap: 380 })) return;
            root.dataset.reading = 'false';
            continueButton.hidden = false;
            root.storyTypingSound?.effect('ready');
          }, timing.readAt)
        ];
        openingTimers.push(setTimeout(() => root.storyTypingSound?.effect('paper'), timing.openAt + 200));
        openingTimers.push(setTimeout(() => root.storyTypingSound?.effect('paper'), timing.letterAt + 900));
        // The footsteps follow the approach; bites match the apple disappearing.
        for (let step = 0; step < 6; step++) {
          openingTimers.push(setTimeout(() => root.storyTypingSound?.effect('hoof', step % 3 - 1), timing.fawnAt + 300 + step * 400));
        }
        for (let step = 0; step < 5; step++) {
          openingTimers.push(setTimeout(() => root.storyTypingSound?.effect('hoof', step % 3 - 1), timing.leaveAt + 200 + step * 400));
        }
        for (const offset of [450, 1050]) {
          openingTimers.push(setTimeout(() => root.storyTypingSound?.effect('bite'), timing.nibbleAt + offset));
        }
        for (const offset of [150, 750, 1350, 1650]) {
          openingTimers.push(setTimeout(() => root.storyTypingSound?.effect('chew'), timing.nibbleAt + offset));
        }
      });
    })();
  };
  root.dataset.storyStarted = 'true';
  root.startSceneWriting('cover');
})();
