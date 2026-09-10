# pcm

[![CI](https://github.com/jhurliman/node-pcm/actions/workflows/ci.yml/badge.svg)](https://github.com/jhurliman/node-pcm/actions/workflows/ci.yml)

**Decode audio files into normalized samples in Node.js.** `pcm` runs ffmpeg and delivers each sample with its channel number, so you can build waveform summaries, measure signal levels, or feed your own audio analysis.

You choose the output sample rate and mono or stereo. ffmpeg handles input decoding and resampling; `pcm` converts its signed 16-bit output into JavaScript numbers between −1 and 1. Samples arrive incrementally rather than being collected into a complete audio buffer.

## Install

```sh
npm install pcm
ffmpeg -version
```

Install [ffmpeg](https://ffmpeg.org/download.html) separately and make it available on `PATH`, or pass `ffmpegPath`. This package does not download an ffmpeg binary. See [CHANGELOG.md](CHANGELOG.md) for API and compatibility changes.

## Measure an audio file

Save this as `levels.js`, then run `node levels.js audio.wav`:

```js
const pcm = require('pcm');
const filename = process.argv[2];
if (!filename) throw new Error('Usage: node levels.js <audio-file>');

let count = 0;
let peak = 0;
let sumSquares = 0;

pcm.getPcmData(filename, { stereo: false, sampleRate: 16000 },
  (sample, channel) => {
    // Mono samples always have channel 0.
    count += 1;
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
  },
  (error, diagnostics) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
      return;
    }
    console.log({ samples: count, peak, rms: Math.sqrt(sumSquares / count) });
  }
);
```

Keep sample callbacks lightweight: they run for every decoded sample on the Node.js event loop. Completion is reported after ffmpeg exits and its output has closed. A failed decode can have already delivered partial samples, so check the final error before treating results as complete.

## API

### `getPcmData(filename, options, onSample, onEnd)`

Start decoding a file. Returns `undefined`.

| Argument | Meaning |
| --- | --- |
| `filename` | Input path passed to ffmpeg. |
| `options` | Output settings below. Pass `{}`, `null`, or `undefined` for defaults; keep this argument position when using callbacks. |
| `onSample(sample, channel)` | Receives a normalized number and channel index. Stereo alternates 0 (left) and 1 (right); mono uses 0. |
| `onEnd(error, diagnostics)` | Called once on completion. On success, `error` is `null` and `diagnostics` contains ffmpeg's diagnostic text. On failure, `error` is a string and `diagnostics` is `null`. |

| Option | Default | Meaning |
| --- | --- | --- |
| `stereo` | `true` | `true` for two output channels; `false` for mono. |
| `sampleRate` | `44100` | Output samples per second per channel. |
| `ffmpegPath` | `'ffmpeg'` | Executable name or path to your ffmpeg binary. |

The source format is decoded through ffmpeg to signed 16-bit little-endian PCM. Returned numbers reflect that 16-bit conversion even if the source has higher precision. ffmpeg's text output is diagnostics, not PCM audio data.

### `getPcmStream(filename, options?)`

An event-based alternative using the same options:

```js
const pcm = require('pcm');
const filename = process.argv[2];
if (!filename) throw new Error('Usage: node events.js <audio-file>');

let count = 0;
const samples = pcm.getPcmStream(filename, { stereo: false });
samples.on('data', (sample, channel) => { count += 1; });
samples.on('end', (error, diagnostics) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
  } else {
    console.log({ samples: count });
  }
});
```

This is a legacy event-emitting `Stream`, not a modern `Readable` with buffering, backpressure or async iteration. Its `data` event carries `(sample, channel)`, and decode failures are delivered to `end(error, diagnostics)`. Use the callback API when you only need to process samples and handle completion.

## ESM and TypeScript

ESM consumers can use the CommonJS default export:

```js
import pcm from 'pcm';
```

TypeScript declarations and their Node type dependency are included. Named imports are available in TypeScript:

```ts
import { getPcmData, PcmOptions } from 'pcm';

const options: PcmOptions = { stereo: false, sampleRate: 16000 };
getPcmData('audio.wav', options, (sample, channel) => {
  // sample and channel are numbers.
}, (error, diagnostics) => {
  if (error) console.error(error);
});
```

## Development

With ffmpeg installed and Node.js 22 or newer:

```sh
npm ci
npm test
```

GitHub Actions exercises Node 22, 24 and 26. Tests cover real mono/stereo WAV decoding, split sample boundaries, normalization, subprocess failures, and installed CommonJS/ESM/TypeScript consumers. `npm publish` runs the suite through `prepublishOnly`.

## License

[MIT](LICENSE.txt). Originally developed at Cull TV.
