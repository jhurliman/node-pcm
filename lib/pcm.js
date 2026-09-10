var spawn = require('child_process').spawn;
var stream = require('stream');

/**
 * Takes a file containing an audio stream and returns raw PCM data
 * asynchronously using ffmpeg.
 * @param {String} filename file to extract audio from.
 * @param {Object} options optional object holding boolean stereo and integer
 *        sampleRate parameters.
 * @param {Function} sampleCallback(sample, channel) called each time a sample
 *        is read. sample ranges from [-1.0...1.0] and channel is 0 for left
 *        channel, 1 for right channel.
 * @param {Function} endCallback(err, output) called when all samples have been
 *        read or an error occurred. err is the ffmpeg error output or null, 
 *        output is the ffmpeg output on success.
 */
exports.getPcmData = function(filename, options, sampleCallback, endCallback) {
  var outputStr = '';
  var oddByte = null;
  var channel = 0;
  var gotData = false;
  var completed = false;
  function finish(err) {
    if (completed) return;
    completed = true;
    endCallback(err, err ? null : outputStr);
  }
  function emitSample(value) {
    sampleCallback(Math.max(-1, value / 32767.0), channel);
    channel = (channel + 1) % channels;
  }
  
  options = options || {};
  var channels = 2;
  if (typeof options.stereo !== 'undefined')
    channels = (options.stereo) ? 2 : 1;
  var sampleRate = 44100;
  if (typeof options.sampleRate !== 'undefined')
    sampleRate = options.sampleRate;
  var ffmpegPath = 'ffmpeg';
  if (typeof options.ffmpegPath !== 'undefined')
    ffmpegPath = options.ffmpegPath;
  
  // Extract signed 16-bit little endian PCM data with ffmpeg and pipe to
  // stdout
  var ffmpeg = spawn(ffmpegPath, ['-i',filename,'-f','s16le','-ac',channels,
    '-acodec','pcm_s16le','-ar',sampleRate,'-y','pipe:1']);
  
  ffmpeg.stdout.on('data', function(data) {
    if (data.length === 0 || completed) return;
    gotData = true;
    var i = 0;
    if (oddByte !== null) {
      emitSample((data.readInt8(i++) << 8) | oddByte);
      oddByte = null;
    }
    for (; i + 1 < data.length; i += 2) {
      emitSample(data.readInt16LE(i));
    }
    if (i < data.length) oddByte = data[i];
  });

  ffmpeg.stderr.on('data', function(data) {
    // Text info from ffmpeg is output to stderr
    outputStr += data.toString();
  });
  
  ffmpeg.on('error', function(err) {
    finish(err.message);
  });
  ffmpeg.on('close', function(code, signal) {
    if (code !== 0) {
      finish(outputStr || 'ffmpeg failed: ' + (signal || code));
    } else if (oddByte !== null) {
      finish('ffmpeg returned an incomplete PCM sample');
    } else if (!gotData) {
      finish(outputStr || 'ffmpeg returned no PCM data');
    } else {
      finish(null);
    }
  });
};

/**
 * Takes a file containing an audio stream and returns a stream that will emit
 * raw PCM data asynchronously using ffmpeg.
 * @param {String} filename file to extract audio from.
 * @param {Object} options optional object holding boolean stereo and integer
 *        sampleRate parameters.
 * @returns {Stream} readable stream. Emits a data event with (sample, channel)
 *          parameters. sample ranges from [-1.0...1.0] and channel is 0 for
 *          left channel, 1 for right channel. Also emits an end event with err
 *          and output string parameters.
 */
exports.getPcmStream = function(filename, options) {
  var sampleStream = new stream.Stream();
  sampleStream.readable = true;
  
  exports.getPcmData(filename, options,
    function(sample, channel) {
      sampleStream.emit('data', sample, channel);
    },
    function(err, output) {
      sampleStream.emit('end', err, output);
    }
  );
  
  return sampleStream;
};
