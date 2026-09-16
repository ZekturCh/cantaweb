const elements = {
  audio: document.querySelector("#song-audio"),
  monitorAudio: document.querySelector("#monitor-audio"),
  toneAudio: document.querySelector("#tone-audio"),
  songList: document.querySelector("#song-list"),
  trackKicker: document.querySelector("#track-kicker"),
  trackTitle: document.querySelector("#track-title"),
  trackArtist: document.querySelector("#track-artist"),
  playToggle: document.querySelector("#play-toggle"),
  previousSong: document.querySelector("#previous-song"),
  nextSong: document.querySelector("#next-song"),
  seek: document.querySelector("#seek"),
  currentTime: document.querySelector("#current-time"),
  totalTime: document.querySelector("#total-time"),
  micSelect: document.querySelector("#mic-select"),
  speakerSelect: document.querySelector("#speaker-select"),
  refreshDevices: document.querySelector("#refresh-devices"),
  micTest: document.querySelector("#mic-test"),
  speakerTest: document.querySelector("#speaker-test"),
  musicVolume: document.querySelector("#music-volume"),
  micVolume: document.querySelector("#mic-volume"),
  backingPan: document.querySelector("#backing-pan"),
  musicValue: document.querySelector("#music-value"),
  micValue: document.querySelector("#mic-value"),
  panValue: document.querySelector("#pan-value"),
  micMeter: document.querySelector("#mic-meter"),
  monitorToggle: document.querySelector("#monitor-toggle"),
  deviceSummary: document.querySelector("#device-summary"),
};

const fallbackSongs = [
  { id: "song-1", title: "Cancion 1", artist: "Demo", src: "songs/cancion-1.mp3", duration: "03:20" },
  { id: "song-2", title: "Cancion 2", artist: "Demo", src: "songs/cancion-2.mp3", duration: "03:05" },
  { id: "song-3", title: "Cancion 3", artist: "Demo", src: "songs/cancion-3.mp3", duration: "04:10" },
];

const state = {
  songs: fallbackSongs,
  currentIndex: 0,
  audioContext: null,
  songSource: null,
  songGain: null,
  panNode: null,
  micStream: null,
  micSource: null,
  micGain: null,
  micAnalyser: null,
  monitorDestination: null,
  toneDestination: null,
  meterFrame: 0,
  isReady: false,
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function setStatus(message) {
  elements.deviceSummary.textContent = message;
}

function updateFaderLabels() {
  elements.musicValue.textContent = `${Math.round(Number(elements.musicVolume.value) * 100)}%`;
  elements.micValue.textContent = `${Math.round(Number(elements.micVolume.value) * 100)}%`;
  const pan = Number(elements.backingPan.value);
  elements.panValue.textContent = Math.abs(pan) < 0.05 ? "Centro" : pan < 0 ? "Izq" : "Der";
}

async function loadSongs() {
  try {
    const response = await fetch("songs/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo leer el manifiesto");
    const songs = await response.json();
    state.songs = songs.slice(0, 3);
  } catch {
    state.songs = fallbackSongs;
  }
  renderSongs();
  selectSong(0);
}

function renderSongs() {
  elements.songList.innerHTML = "";
  state.songs.forEach((song, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "song-card";
    button.dataset.index = String(index);
    button.innerHTML = `
      <strong>${song.title}</strong>
      <span>${song.artist}</span>
      <span>${song.duration || ""}</span>
    `;
    button.addEventListener("click", () => selectSong(index, true));
    elements.songList.appendChild(button);
  });
}

function selectSong(index, startAfterSelect = false) {
  state.currentIndex = (index + state.songs.length) % state.songs.length;
  const song = state.songs[state.currentIndex];
  elements.audio.src = song.src;
  elements.trackKicker.textContent = `Pista ${state.currentIndex + 1} de ${state.songs.length}`;
  elements.trackTitle.textContent = song.title;
  elements.trackArtist.textContent = song.artist;
  document.querySelectorAll(".song-card").forEach((card, cardIndex) => {
    card.setAttribute("aria-current", cardIndex === state.currentIndex ? "true" : "false");
  });
  elements.seek.value = "0";
  elements.currentTime.textContent = "0:00";
  elements.totalTime.textContent = song.duration || "0:00";
  if (startAfterSelect) playSong();
}

async function ensureAudioGraph() {
  if (state.isReady) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    setStatus("Este navegador no soporta Web Audio.");
    return;
  }

  state.audioContext = new AudioContextClass({ latencyHint: "interactive" });
  state.songSource = state.audioContext.createMediaElementSource(elements.audio);
  state.songGain = state.audioContext.createGain();
  state.panNode = state.audioContext.createStereoPanner();
  state.songSource.connect(state.songGain).connect(state.panNode).connect(state.audioContext.destination);

  state.songGain.gain.value = Number(elements.musicVolume.value);
  state.panNode.pan.value = Number(elements.backingPan.value);
  state.toneDestination = state.audioContext.createMediaStreamDestination();
  elements.toneAudio.srcObject = state.toneDestination.stream;

  await state.audioContext.resume();
  state.isReady = true;
  elements.playToggle.textContent = "Reproducir";
  await refreshDevices();
}

async function requestMic() {
  await ensureAudioGraph();
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("El navegador no permite usar microfono aqui.");
    return;
  }

  if (state.micStream) {
    state.micStream.getTracks().forEach((track) => track.stop());
  }

  const selectedMic = elements.micSelect.value;
  state.micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: selectedMic ? { exact: selectedMic } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  if (state.micSource) state.micSource.disconnect();
  state.micSource = state.audioContext.createMediaStreamSource(state.micStream);
  state.micGain = state.audioContext.createGain();
  state.micAnalyser = state.audioContext.createAnalyser();
  state.monitorDestination = state.audioContext.createMediaStreamDestination();

  state.micAnalyser.fftSize = 512;
  state.micGain.gain.value = Number(elements.micVolume.value);
  state.micSource.connect(state.micGain);
  state.micGain.connect(state.micAnalyser);
  state.micGain.connect(state.monitorDestination);
  elements.monitorAudio.srcObject = state.monitorDestination.stream;
  elements.monitorAudio.muted = !elements.monitorToggle.checked;
  await elements.monitorAudio.play().catch(() => {});
  readMeter();
  await refreshDevices();
  setStatus("Microfono activo. Ajusta volumen antes de cantar.");
}

async function refreshDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter((device) => device.kind === "audioinput");
  const audioOutputs = devices.filter((device) => device.kind === "audiooutput");

  fillSelect(elements.micSelect, audioInputs, "Microfono predeterminado");
  fillSelect(elements.speakerSelect, audioOutputs, "Salida predeterminada");

  const outputSupport =
    typeof elements.audio.setSinkId === "function" ||
    typeof state.audioContext?.setSinkId === "function";
  elements.speakerSelect.disabled = !outputSupport;
  if (!outputSupport) {
    elements.speakerSelect.innerHTML = `<option value="">Salida del sistema</option>`;
  }

  setStatus(`${audioInputs.length || 1} entrada(s), ${outputSupport ? audioOutputs.length || 1 : "salida del sistema"} disponible(s).`);
}

function fillSelect(select, devices, fallbackLabel) {
  const previous = select.value;
  select.innerHTML = "";
  const fallback = document.createElement("option");
  fallback.value = "";
  fallback.textContent = fallbackLabel;
  select.appendChild(fallback);

  devices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `${fallbackLabel} ${index + 1}`;
    select.appendChild(option);
  });

  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

async function setOutputDevice() {
  const sinkId = elements.speakerSelect.value;
  const audioElements = [elements.audio, elements.monitorAudio, elements.toneAudio];
  if (typeof state.audioContext?.setSinkId === "function") {
    await state.audioContext.setSinkId(sinkId);
  }
  await Promise.all(
    audioElements.map((audio) => {
      if (typeof audio.setSinkId === "function") return audio.setSinkId(sinkId);
      return Promise.resolve();
    }),
  );
}

function readMeter() {
  if (!state.micAnalyser) return;
  const data = new Uint8Array(state.micAnalyser.frequencyBinCount);
  const tick = () => {
    state.micAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) {
      const centered = value - 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / data.length);
    const percentage = Math.min(100, Math.round(rms * 3.2));
    elements.micMeter.style.width = `${percentage}%`;
    state.meterFrame = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(state.meterFrame);
  tick();
}

async function playSong() {
  await ensureAudioGraph();
  await elements.audio.play().catch(() => {
    setStatus("No encontre el archivo de audio. Revisa dist/songs/manifest.json.");
  });
  elements.playToggle.textContent = elements.audio.paused ? "Reproducir" : "Pausar";
}

async function togglePlayback() {
  await ensureAudioGraph();
  if (elements.audio.paused) {
    await playSong();
  } else {
    elements.audio.pause();
    elements.playToggle.textContent = "Reproducir";
  }
}

async function playTone() {
  await ensureAudioGraph();
  await setOutputDevice();
  const now = state.audioContext.currentTime;
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  oscillator.connect(gain).connect(state.toneDestination);
  oscillator.start(now);
  oscillator.stop(now + 0.5);
  await elements.toneAudio.play().catch(() => {});
}

elements.playToggle.addEventListener("click", togglePlayback);
elements.previousSong.addEventListener("click", () => selectSong(state.currentIndex - 1, !elements.audio.paused));
elements.nextSong.addEventListener("click", () => selectSong(state.currentIndex + 1, !elements.audio.paused));
elements.refreshDevices.addEventListener("click", refreshDevices);
elements.micTest.addEventListener("click", requestMic);
elements.speakerTest.addEventListener("click", playTone);
elements.micSelect.addEventListener("change", requestMic);
elements.speakerSelect.addEventListener("change", setOutputDevice);
elements.monitorToggle.addEventListener("change", () => {
  elements.monitorAudio.muted = !elements.monitorToggle.checked;
  elements.monitorToggle.closest(".switch-row").classList.toggle("is-live", elements.monitorToggle.checked);
});

elements.musicVolume.addEventListener("input", () => {
  if (state.songGain) state.songGain.gain.value = Number(elements.musicVolume.value);
  updateFaderLabels();
});

elements.micVolume.addEventListener("input", () => {
  if (state.micGain) state.micGain.gain.value = Number(elements.micVolume.value);
  updateFaderLabels();
});

elements.backingPan.addEventListener("input", () => {
  if (state.panNode) state.panNode.pan.value = Number(elements.backingPan.value);
  updateFaderLabels();
});

elements.audio.addEventListener("loadedmetadata", () => {
  elements.totalTime.textContent = formatTime(elements.audio.duration);
});

elements.audio.addEventListener("timeupdate", () => {
  elements.currentTime.textContent = formatTime(elements.audio.currentTime);
  if (Number.isFinite(elements.audio.duration) && elements.audio.duration > 0) {
    elements.seek.value = String(Math.round((elements.audio.currentTime / elements.audio.duration) * 1000));
  }
});

elements.audio.addEventListener("ended", () => {
  elements.playToggle.textContent = "Reproducir";
  selectSong(state.currentIndex + 1, false);
});

elements.audio.addEventListener("error", () => {
  setStatus("No pude cargar esta pista. Revisa que exista en dist/songs.");
  elements.playToggle.textContent = "Reproducir";
});

elements.seek.addEventListener("input", () => {
  if (!Number.isFinite(elements.audio.duration)) return;
  elements.audio.currentTime = (Number(elements.seek.value) / 1000) * elements.audio.duration;
});

window.addEventListener("beforeunload", () => {
  if (state.micStream) {
    state.micStream.getTracks().forEach((track) => track.stop());
  }
});

updateFaderLabels();
loadSongs();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
