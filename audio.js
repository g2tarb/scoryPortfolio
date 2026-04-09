/**
 * SCORY — audio.js
 * Son ambiant + visualiseur frequences + slider volume.
 * Module autonome — zero dependance externe.
 */

const BARS = 12;

/**
 * Initialise le systeme audio ambiant.
 * Cree le visualiseur, le slider volume, et gere le toggle play/pause.
 */
export function initAudio() {
  const soundToggle = document.getElementById("sound-toggle");
  if (!soundToggle) return;

  let audio = null;
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let soundOn = false;
  let vizRaf = 0;

  const iconOff = soundToggle.querySelector(".sound-icon--off");
  const iconOn = soundToggle.querySelector(".sound-icon--on");

  // Barres de visualisation
  const vizContainer = document.createElement("div");
  vizContainer.className = "sound-viz";
  for (let i = 0; i < BARS; i++) {
    const bar = document.createElement("span");
    bar.className = "sound-viz__bar";
    bar.style.setProperty("--i", i);
    vizContainer.appendChild(bar);
  }
  soundToggle.appendChild(vizContainer);

  // Slider volume
  const volSlider = document.createElement("input");
  volSlider.type = "range";
  volSlider.min = "0";
  volSlider.max = "100";
  volSlider.value = "30";
  volSlider.className = "sound-volume";
  volSlider.setAttribute("aria-label", "Volume");
  soundToggle.parentElement.appendChild(volSlider);
  volSlider.style.display = "none";

  function createAudio() {
    if (audio) return;
    audio = new Audio();
    const canM4a = audio.canPlayType("audio/mp4; codecs=mp4a.40.2");
    audio.src = canM4a ? "./audio/boheme-light.m4a" : "./audio/La Bohème - Charles Aznavour.mp3";
    audio.loop = true;
    audio.volume = volSlider.value / 100;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      sourceNode = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch {
      analyser = null;
    }
  }

  const barEls = vizContainer.querySelectorAll(".sound-viz__bar");

  function vizLoop() {
    if (!soundOn) return;
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < BARS; i++) {
        const val = data[Math.floor(i * data.length / BARS)] / 255;
        barEls[i].style.transform = `rotate(${i * 30}deg) scaleY(${0.3 + val * 1.2})`;
        barEls[i].style.opacity = 0.3 + val * 0.7;
      }
    } else {
      const t = Date.now() * 0.003;
      for (let i = 0; i < BARS; i++) {
        const val = 0.3 + Math.abs(Math.sin(t + i * 0.5)) * 0.7;
        barEls[i].style.transform = `rotate(${i * 30}deg) scaleY(${val})`;
        barEls[i].style.opacity = 0.3 + val * 0.4;
      }
    }
    vizRaf = requestAnimationFrame(vizLoop);
  }

  soundToggle.addEventListener("click", () => {
    createAudio();
    if (!audio) return;
    soundOn = !soundOn;
    if (soundOn) {
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      audio.currentTime = 0;
      audio.play().catch(() => { soundOn = false; });
      volSlider.style.display = "block";
      vizLoop();
    } else {
      audio.pause();
      audio.currentTime = 0;
      cancelAnimationFrame(vizRaf);
      volSlider.style.display = "none";
      barEls.forEach((b, i) => {
        b.style.transform = `rotate(${i * 30}deg) scaleY(0.3)`;
        b.style.opacity = "0";
      });
    }
    soundToggle.setAttribute("aria-pressed", String(soundOn));
    iconOff.style.display = soundOn ? "none" : "block";
    iconOn.style.display = soundOn ? "block" : "none";
  });

  volSlider.addEventListener("input", () => {
    if (audio) audio.volume = volSlider.value / 100;
  });
}
