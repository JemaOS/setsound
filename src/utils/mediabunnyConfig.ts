import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

let initialized = false;

export function initMediaBunny() {
  if (initialized) return;
  
  try {
    registerMp3Encoder();
    console.log('MediaBunny MP3 encoder registered');
    
    initialized = true;
  } catch (error) {
    console.error('Failed to register MediaBunny encoders:', error);
  }
}
