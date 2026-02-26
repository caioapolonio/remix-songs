import { Mp3Encoder } from '@breezystack/lamejs';

interface EncodeMessage {
  leftChannel: Float32Array;
  rightChannel: Float32Array | null;
  sampleRate: number;
  numChannels: number;
  kbps: number;
}

self.onmessage = (e: MessageEvent<EncodeMessage>) => {
  const { leftChannel, rightChannel, sampleRate, numChannels, kbps } = e.data;

  // Convert Float32 samples to Int16
  const convertToInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  const left = convertToInt16(leftChannel);
  const right = rightChannel ? convertToInt16(rightChannel) : left;

  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  const len = leftChannel.length;

  for (let i = 0; i < len; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right.subarray(i, i + sampleBlockSize);
    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const mp3End = encoder.flush();
  if (mp3End.length > 0) {
    mp3Data.push(new Uint8Array(mp3End));
  }

  const blob = new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
  self.postMessage({ blob });
};
