(() => {
  'use strict';
  const root = document.getElementById('laura-story-invite');
  if (!root) return;
  const records = new WeakMap();

  // Cancellable pauses keep returning to the cover from starting an old scene.
  function pause(ms, signal) {
    if (signal?.aborted) return Promise.resolve(false);
    return new Promise(resolve => {
      const finish = result => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        resolve(result);
      };
      const abort = () => finish(false);
      const timer = setTimeout(() => finish(true), ms);
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  function tokensFor(node) {
    if (node.nodeType === Node.TEXT_NODE) return Array.from(node.textContent);
    if (node.nodeName === 'BR') return ['\n'];
    return Array.from(node.childNodes).flatMap(tokensFor);
  }

  function prepare(element) {
    if (records.has(element)) return records.get(element);
    const original = Array.from(element.childNodes).map(node => node.cloneNode(true));
    const tokens = original.flatMap(tokensFor);
    const accessible = document.createElement('span');
    accessible.className = 'l-type-a11y';
    accessible.append(...original.map(node => node.cloneNode(true)));
    const space = document.createElement('span');
    space.className = 'l-type-space';
    space.setAttribute('aria-hidden', 'true');
    space.append(...original.map(node => node.cloneNode(true)));
    const ink = document.createElement('span');
    ink.className = 'l-type-ink';
    ink.setAttribute('aria-hidden', 'true');
    ink.append(...original.map(node => node.cloneNode(true)));
    const caret = document.createElement('span');
    caret.className = 'l-type-caret';
    caret.setAttribute('aria-hidden', 'true');
    element.classList.add('l-typewriter');
    element.replaceChildren(accessible, space, ink, caret);
    const positions = [];
    function mapLetters(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        let offset = 0;
        for (const token of Array.from(node.textContent)) {
          offset += token.length;
          positions.push({ node, end: offset, token });
        }
      } else if (node.nodeName === 'BR') positions.push({ node, token: '\n' });
      else Array.from(node.childNodes).forEach(mapLetters);
    }
    Array.from(ink.childNodes).forEach(mapLetters);
    const range = document.createRange();
    function reveal(index) {
      const letter = positions[index];
      if (!letter || letter.token === '\n') return;
      range.setStart(ink, 0);
      range.setEnd(letter.node, letter.end);
      const box = ink.getBoundingClientRect();
      const parentBox = element.getBoundingClientRect();
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
      const script = element.classList.contains('l-name') || element.classList.contains('l-letter-name');
      const bleed = script ? 24 : 2;
      // Reveal the complete, already-laid-out lines. Centered prefixes never reflow.
      const path = rects.map(rect => {
        const left = rect.left - box.left - bleed;
        const top = rect.top - box.top - 4;
        const right = rect.right - box.left + 2;
        const bottom = rect.bottom - box.top + (script ? 18 : 5);
        return `M${left.toFixed(2)} ${top.toFixed(2)}H${right.toFixed(2)}V${bottom.toFixed(2)}H${left.toFixed(2)}Z`;
      }).join(' ');
      ink.style.clipPath = path ? `path('${path}')` : 'inset(0 100% 0 0)';
      const last = rects.at(-1);
      if (last) {
        caret.style.left = last.right - parentBox.left + 1 + 'px';
        caret.style.top = last.top - parentBox.top + last.height * .1 + 'px';
        caret.style.height = last.height * .8 + 'px';
      }
    }
    function reset() {
      ink.style.clipPath = 'inset(0 100% 0 0)';
      element.dataset.written = '0';
      element.classList.remove('is-typing');
    }
    function show() {
      ink.style.clipPath = 'none';
      element.dataset.written = String(tokens.length);
      element.classList.remove('is-typing');
    }
    async function write(signal, speed) {
      reset();
      element.classList.add('is-typing');
      for (let i = 0; i < tokens.length; i++) {
        if (signal?.aborted) {
          element.classList.remove('is-typing');
          return false;
        }
        const token = tokens[i];
        reveal(i);
        element.dataset.written = String(i + 1);
        root.storyTypingSound?.strike(token);
        const punctuation = /[.!?]/.test(token) && tokens[i + 1] !== token ? 250 : token === ',' ? 120 : 0;
        if (!await pause((/\s/.test(token) ? speed * .6 : speed) + punctuation, signal)) {
          element.classList.remove('is-typing');
          return false;
        }
      }
      show();
      return true;
    }
    const record = { reset, show, write };
    records.set(element, record);
    return record;
  }

  async function sequence(elements, signal, { speed = 120, gap = 320 } = {}) {
    const list = Array.from(elements).filter(Boolean).map(prepare);
    list.forEach(record => record.reset());
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      list.forEach(record => record.show());
      return !signal?.aborted;
    }
    for (let i = 0; i < list.length; i++) {
      if (!await list[i].write(signal, speed)) return false;
      if (i < list.length - 1 && !await pause(gap, signal)) return false;
    }
    return !signal?.aborted;
  }
  root.storyWriter = { prepare, pause, sequence, show: elements => Array.from(elements).forEach(element => prepare(element).show()) };
})();
