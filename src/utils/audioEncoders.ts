// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { 
  Input, 
  BlobSource, 
  Output, 
  BufferTarget, 
  Mp3OutputFormat, 
  FlacOutputFormat,
  Conversion,
  ALL_FORMATS
} from 'mediabunny';
import { initMediaBunny } from './mediabunnyConfig';

export class AudioEncoders {
  /**
   * Convert AudioBuffer to MP3 using MediaBunny
   */
  static async audioBufferToMp3(audioBuffer: AudioBuffer, bitrate: number = 320): Promise<Blob> {
    initMediaBunny();
    const wavBlob = this.audioBufferToWav(audioBuffer);
    
    const input = new Input({
      source: new BlobSource(wavBlob),
      formats: ALL_FORMATS
    });

    const target = new BufferTarget();
    const output = new Output({
      target,
      format: new Mp3OutputFormat()
    });

    const conversion = await Conversion.init({
      input,
      output,
      audio: {
        codec: 'mp3',
        bitrate: bitrate * 1000
      }
    });

    await conversion.execute();

    if (!target.buffer) throw new Error("MP3 encoding failed");
    return new Blob([target.buffer], { type: 'audio/mpeg' });
  }

  /**
   * Convert AudioBuffer to FLAC using MediaBunny
   */
  static async audioBufferToFlac(audioBuffer: AudioBuffer): Promise<Blob> {
    const wavBlob = this.audioBufferToWav(audioBuffer);
    
    const input = new Input({
      source: new BlobSource(wavBlob),
      formats: ALL_FORMATS
    });

    const target = new BufferTarget();
    const output = new Output({
      target,
      format: new FlacOutputFormat()
    });

    const conversion = await Conversion.init({
      input,
      output,
      audio: {
        codec: 'flac'
      }
    });

    await conversion.execute();

    if (!target.buffer) throw new Error("FLAC encoding failed");
    return new Blob([target.buffer], { type: 'audio/flac' });
  }

  /**
   * Convert AudioBuffer to WAV
   */
  static audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = new Float32Array(audioBuffer.length * numberOfChannels);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < audioBuffer.length; i++) {
        data[i * numberOfChannels + channel] = channelData[i];
      }
    }

    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }
}