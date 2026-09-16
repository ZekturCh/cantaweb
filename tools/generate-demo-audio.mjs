import { writeFileSync } from "node:fs";
import { join } from "node:path";

const sampleRate = 44100;
const durationSeconds = 18;
const tracks = [
  ["pulso-solar.wav", 110, 220, 330],
  ["ruta-neon.wav", 123.47, 246.94, 369.99],
  ["cabina-azul.wav", 98, 196, 293.66],
];

function writeUInt16(buffer, value, offset) {
  buffer.writeUInt16LE(value, offset);
}

function writeUInt32(buffer, value, offset) {
  buffer.writeUInt32LE(value, offset);
}

function makeTrack(fileName, root, fifth, octave) {
  const totalSamples = sampleRate * durationSeconds;
  const channels = 2;
  const bytesPerSample = 2;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  writeUInt32(buffer, 36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  writeUInt32(buffer, 16, 16);
  writeUInt16(buffer, 1, 20);
  writeUInt16(buffer, channels, 22);
  writeUInt32(buffer, sampleRate, 24);
  writeUInt32(buffer, sampleRate * channels * bytesPerSample, 28);
  writeUInt16(buffer, channels * bytesPerSample, 32);
  writeUInt16(buffer, 16, 34);
  buffer.write("data", 36);
  writeUInt32(buffer, dataSize, 40);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const beat = Math.floor(t * 2) % 4 === 0 ? 0.85 : 0.48;
    const envelope = Math.min(1, t / 0.08) * Math.min(1, (durationSeconds - t) / 0.5);
    const chord =
      Math.sin(2 * Math.PI * root * t) * 0.28 +
      Math.sin(2 * Math.PI * fifth * t) * 0.18 +
      Math.sin(2 * Math.PI * octave * t) * 0.11;
    const click = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-((t * 2) % 1) * 12) * 0.18;
    const value = Math.max(-1, Math.min(1, (chord * beat + click) * envelope));
    const sample = Math.round(value * 32767);
    const offset = 44 + i * channels * bytesPerSample;
    buffer.writeInt16LE(sample, offset);
    buffer.writeInt16LE(sample, offset + 2);
  }

  writeFileSync(join("dist", "songs", fileName), buffer);
}

for (const track of tracks) {
  makeTrack(...track);
}
