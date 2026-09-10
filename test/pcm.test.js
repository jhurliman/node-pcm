const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const childProcess = require('node:child_process');

function decode(chunks, options = {}, exitCode = 0, spawnError) {
  const original = childProcess.spawn;
  const process = new EventEmitter();
  process.stdout = new EventEmitter();
  process.stderr = new EventEmitter();
  childProcess.spawn = () => process;
  delete require.cache[require.resolve('../lib/pcm')];
  const pcm = require('../lib/pcm');
  const samples = [], completions = [];
  try {
    pcm.getPcmData('fixture.wav', options, (v, c) => samples.push([v, c]), (...args) => completions.push(args));
  } finally { childProcess.spawn = original; }
  if (spawnError) process.emit('error', spawnError);
  for (const chunk of chunks) process.stdout.emit('data', Buffer.from(chunk));
  process.stderr.emit('end');
  process.emit('close', exitCode, null);
  return { samples, completions };
}

test('decodes samples split across odd-sized chunks', () => {
  assert.deepEqual(decode([[255], [127, 0], [128]]).samples, [[1, 0], [-1, 1]]);
});
test('mono samples always use channel zero', () => {
  assert.deepEqual(decode([[0, 0, 255, 127]], { stereo: false }).samples, [[0, 0], [1, 0]]);
});
test('minimum signed sample stays inside documented range', () => {
  assert.equal(decode([[0, 128]]).samples[0][0], -1);
});
test('nonzero exit after output reports failure once', () => {
  const result = decode([[0, 0]], {}, 1);
  assert.equal(result.completions.length, 1);
  assert.ok(result.completions[0][0]);
});
test('missing executable reports failure once', () => {
  const result = decode([], {}, -2, new Error('spawn ENOENT'));
  assert.equal(result.completions.length, 1);
  assert.match(String(result.completions[0][0]), /ENOENT/);
});

test('empty chunks do not discard a pending byte', () => {
  assert.deepEqual(decode([[255], [], [127]]).samples, [[1, 0]]);
});
test('truncated samples and empty output report failure', () => {
  for (const chunks of [[[1]], []]) assert.ok(decode(chunks).completions[0][0]);
});
test('all byte boundaries preserve samples and stereo channels', () => {
  const bytes = [0, 0, 255, 127, 0, 128, 1, 0, 255, 255];
  const expected = decode([bytes]).samples;
  for (let split = 0; split <= bytes.length; split++) {
    assert.deepEqual(decode([bytes.slice(0, split), bytes.slice(split)]).samples, expected);
  }
});
test('real ffmpeg decodes mono and stereo WAV fixtures', async () => {
  const { spawnSync } = childProcess;
  assert.equal(spawnSync('ffmpeg', ['-version']).status, 0, 'ffmpeg must be installed');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcm-test-'));
  delete require.cache[require.resolve('../lib/pcm')];
  const pcm = require('../lib/pcm');
  try {
    for (const channels of [1, 2]) {
      const data = Buffer.alloc(8);
      [0, 32767, -32768, 1234].forEach((value, i) => data.writeInt16LE(value, i * 2));
      const header = Buffer.alloc(44);
      header.write('RIFF'); header.writeUInt32LE(36 + data.length, 4);
      header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20); header.writeUInt16LE(channels, 22);
      header.writeUInt32LE(44100, 24); header.writeUInt32LE(44100 * channels * 2, 28);
      header.writeUInt16LE(channels * 2, 32); header.writeUInt16LE(16, 34);
      header.write('data', 36); header.writeUInt32LE(data.length, 40);
      const file = path.join(dir, 'fixture.wav');
      fs.writeFileSync(file, Buffer.concat([header, data]));
      const samples = [];
      await new Promise((resolve, reject) => pcm.getPcmData(file, { stereo: channels === 2 },
        (value, channel) => samples.push([value, channel]), error => error ? reject(new Error(error)) : resolve()));
      assert.deepEqual(samples, [[0,0], [1,1 % channels], [-1,0], [1234/32767,1 % channels]]);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
