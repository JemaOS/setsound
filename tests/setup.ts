import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock AudioContext
class MockAudioContext {
  sampleRate = 44100;
  destination = {};
  state = 'running';
  
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
      disconnect: () => {},
    };
  }
  
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: () => {} },
      connect: () => {},
      disconnect: () => {},
    };
  }
  
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: () => {},
      getByteTimeDomainData: () => {},
      connect: () => {},
      disconnect: () => {},
    };
  }
  
  decodeAudioData() {
    return Promise.resolve({
      sampleRate: 44100,
      numberOfChannels: 2,
      duration: 60,
      length: 44100 * 60,
      getChannelData: () => new Float32Array(44100 * 60),
    });
  }
  
  close() {
    return Promise.resolve();
  }
}

(window as any).AudioContext = MockAudioContext;
(window as any).webkitAudioContext = MockAudioContext;

// Mock URL.createObjectURL and URL.revokeObjectURL
URL.createObjectURL = () => 'blob:mock-url';
URL.revokeObjectURL = () => {};

// Mock fetch for FFmpeg
global.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(0),
    json: async () => ({}),
    text: async () => '',
  } as Response;
}) as typeof fetch;

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(window as any).ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(window as any).IntersectionObserver = MockIntersectionObserver;

// Suppress console errors during tests (optional)
// console.error = () => {};
