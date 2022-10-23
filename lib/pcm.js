"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPcmStream = exports.getPcmData = void 0;
let spawn = require('child_process').spawn;
let stream = require('stream');
/**
 * Takes a file containing an audio stream and returns raw PCM data
 * asynchronously using ffmpeg.
 * @param {String} filename file to extract audio from.
 * @param {PcmOptions} options optional object holding boolean stereo and integer
 *        sampleRate parameters.
 * @param {PcmSampleCallback} sampleCallback(sample, channel) called each time a sample
 *        is read. sample ranges from [-1.0...1.0] and channel is 0 for left
 *        channel, 1 for right channel.
 * @param {PcmEndCallback} endCallback(err, output) called when all samples have been
 *        read or an error occurred. err is the ffmpeg error output or null,
 *        output is the ffmpeg output on success.
 */
const getPcmData = (filename, options, sampleCallback, endCallback) => {
    let outputStr = '';
    let oddByte = null;
    let channel = 0;
    let gotData = false;
    options = options || {};
    let channels = 2;
    if ((options === null || options === void 0 ? void 0 : options.stereo) !== undefined) {
        channels = (options.stereo) ? 2 : 1;
    }
    let sampleRate = 44100;
    if (options === null || options === void 0 ? void 0 : options.sampleRate) {
        sampleRate = options.sampleRate;
    }
    let ffmpegPath = 'ffmpeg';
    if (options === null || options === void 0 ? void 0 : options.ffmpegPath) {
        ffmpegPath = options.ffmpegPath;
    }
    // Extract signed 16-bit little endian PCM data with ffmpeg and pipe to
    // stdout
    let ffmpeg = spawn(ffmpegPath, ['-i', filename, '-f', 's16le', '-ac', channels,
        '-acodec', 'pcm_s16le', '-ar', sampleRate, '-y', 'pipe:1']);
    ffmpeg.stdout.on('data', function (data) {
        gotData = true;
        let value;
        let i = 0;
        let dataLen = data.length;
        // If there is a leftover byte from the previous block, combine it with the
        // first byte from this block
        if (oddByte !== null) {
            value = ((data.readInt8(i++) << 8) | oddByte) / 32767.0;
            sampleCallback(value, channel);
            channel = ++channel % 2;
        }
        for (; i < dataLen; i += 2) {
            value = data.readInt16LE(i) / 32767.0;
            sampleCallback(value, channel);
            channel = ++channel % 2;
        }
        oddByte = (i < dataLen) ? data.readUInt8(i) : null;
    });
    ffmpeg.stderr.on('data', function (data) {
        // Text info from ffmpeg is output to stderr
        outputStr += data.toString();
    });
    ffmpeg.stderr.on('end', function () {
        if (gotData)
            endCallback(null, outputStr);
        else
            endCallback(outputStr, null);
    });
};
exports.getPcmData = getPcmData;
/**
 * Takes a file containing an audio stream and returns a stream that will emit
 * raw PCM data asynchronously using ffmpeg.
 * @param {String} filename file to extract audio from.
 * @param {PcmOptions} options optional object holding boolean stereo and integer
 *        sampleRate parameters.
 * @returns {Stream} readable stream. Emits a data event with (sample, channel)
 *          parameters. sample ranges from [-1.0...1.0] and channel is 0 for
 *          left channel, 1 for right channel. Also emits an end event with err
 *          and output string parameters.
 */
const getPcmStream = (filename, options) => {
    let sampleStream = new stream.Stream();
    sampleStream.readable = true;
    (0, exports.getPcmData)(filename, options, function (sample, channel) {
        sampleStream.emit('data', sample, channel);
    }, function (err, output) {
        sampleStream.emit('end', err, output);
    });
    return sampleStream;
};
exports.getPcmStream = getPcmStream;
