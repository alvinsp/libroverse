import { state } from '../../core/state.js';
import { showToast } from '../../utils/toast.js';

export function startAudioPlayer(book) {
  state.currentAudioBook = book;
  const bar = document.getElementById('audio-player-bar');
  const thumb = document.getElementById('audio-thumb-img');
  const title = document.getElementById('audio-title-text');
  const author = document.getElementById('audio-author-text');
  const totalTime = document.getElementById('audio-total-time');

  if (!bar || !book) return;

  bar.hidden = false;
  if (thumb) thumb.src = book.cover || '/assets/libroverse-logo.jpg';
  if (title) title.textContent = book.title;
  if (author) author.textContent = `${book.author} • Narasi Studio`;
  if (totalTime) totalTime.textContent = book.audioDuration || '05:20';

  playAudioNarrator();
  showToast(`Memutar narasi kosmik "${book.title}"`, '🎧');
}

export function playAudioNarrator() {
  const bar = document.getElementById('audio-player-bar');
  const playIcon = document.getElementById('audio-play-icon');
  const pauseIcon = document.getElementById('audio-pause-icon');

  if (!state.currentAudioBook) return;

  // Browser Speech Synthesis for Real Audio Experience
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Reset previous speech
    const textToRead = `${state.currentAudioBook.title}. Oleh ${state.currentAudioBook.author}. ${state.currentAudioBook.synopsis}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = state.currentAudioBook.language === 'en' ? 'en-US' : 'id-ID';
    utterance.rate = state.audioSpeed;
    utterance.volume = state.audioVolume;

    utterance.onend = () => {
      pauseAudioNarrator();
    };

    window.speechSynthesis.speak(utterance);
    state.speechUtterance = utterance;
  }

  state.isPlayingAudio = true;
  bar?.classList.add('playing');
  if (playIcon) playIcon.hidden = true;
  if (pauseIcon) pauseIcon.hidden = false;
}

export function pauseAudioNarrator() {
  const bar = document.getElementById('audio-player-bar');
  const playIcon = document.getElementById('audio-play-icon');
  const pauseIcon = document.getElementById('audio-pause-icon');

  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }

  state.isPlayingAudio = false;
  bar?.classList.remove('playing');
  if (playIcon) playIcon.hidden = false;
  if (pauseIcon) pauseIcon.hidden = true;
}

export function setupAudioPlayerControls() {
  const playToggle = document.getElementById('audio-play-toggle');
  const rewindBtn = document.getElementById('audio-rewind-btn');
  const forwardBtn = document.getElementById('audio-forward-btn');
  const speedBtn = document.getElementById('audio-speed-btn');
  const volSlider = document.getElementById('audio-volume-slider');
  const closeBtn = document.getElementById('audio-bar-close');

  playToggle?.addEventListener('click', () => {
    if (state.isPlayingAudio) pauseAudioNarrator();
    else playAudioNarrator();
  });

  rewindBtn?.addEventListener('click', () => {
    showToast('Mundur 15 detik', '⏪');
  });

  forwardBtn?.addEventListener('click', () => {
    showToast('Maju 15 detik', '⏩');
  });

  speedBtn?.addEventListener('click', () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(state.audioSpeed);
    state.audioSpeed = speeds[(currentIndex + 1) % speeds.length];
    speedBtn.textContent = `${state.audioSpeed.toFixed(1)}x`;

    if ('speechSynthesis' in window && state.isPlayingAudio) {
      playAudioNarrator();
    }
  });

  volSlider?.addEventListener('input', (e) => {
    state.audioVolume = parseFloat(e.target.value);
  });

  closeBtn?.addEventListener('click', () => {
    pauseAudioNarrator();
    const bar = document.getElementById('audio-player-bar');
    if (bar) bar.hidden = true;
  });
}

export function toggleAmbientSpaceAudio() {
  const btn = document.getElementById('ambient-audio-btn');
  if (!state.isAmbientPlaying) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!state.audioContext) state.audioContext = new AudioCtx();
      if (state.audioContext.state === 'suspended') state.audioContext.resume();

      // Synthesize celestial harmony chord (root, fifth, octave: D minor space chord)
      const freqs = [146.83, 220.0, 293.66, 440.0, 659.25];
      state.ambientOscillators = freqs.map((f, i) => {
        const osc = state.audioContext.createOscillator();
        const gain = state.audioContext.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, state.audioContext.currentTime);

        // Soft celestial volume
        gain.gain.setValueAtTime(0.015, state.audioContext.currentTime);

        // Lowpass space filter
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800 + i * 200, state.audioContext.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(state.audioContext.destination);
        osc.start();
        return { osc, gain };
      });

      state.isAmbientPlaying = true;
      btn?.classList.add('active');
      showToast('Musik kosmik santai dinyalakan (Sintesis Semesta)', '🪐');
    } catch (e) {
      console.warn('AudioContext not allowed yet:', e);
    }
  } else {
    (state.ambientOscillators || []).forEach(({ osc, gain }) => {
      try {
        gain.gain.setTargetAtTime(0, state.audioContext.currentTime, 0.5);
        setTimeout(() => osc.stop(), 500);
      } catch (_) {}
    });
    state.ambientOscillators = [];
    state.isAmbientPlaying = false;
    btn?.classList.remove('active');
    showToast('Musik kosmik dijeda', '🌙');
  }
}
