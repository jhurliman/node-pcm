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
  
  options = options || {};
  var channels = 2;
  if (typeof options.stereo !== 'undefined')
    channels = (options.stereo) ? 2 : 1;
  var sampleRate = 44100;
  if (typeof options.sampleRate !== 'undefined')
    sampleRate = options.sampleRate;
  
  // Extract signed 16-bit little endian PCM data with ffmpeg and pipe to
  // stdout
  var ffmpeg = spawn('ffmpeg', ['-i',filename,'-f','s16le','-ac',channels,
    '-acodec','pcm_s16le','-ar',sampleRate,'-y','pipe:1']);
  
  ffmpeg.stdout.on('data', function(data) {
    gotData = true;
    
    var value;
    var i = 0;
    var dataLen = data.length;
    
    // If there is a leftover byte from the previous block, combine it with the
    // first byte from this block
    if (oddByte !== null) {
      value = ((data.readInt8(i++, true) << 8) | oddByte) / 32767.0;
      sampleCallback(value, channel);
      channel = ++channel % 2;
    }
    
    for (; i < dataLen; i += 2) {
      value = data.readInt16LE(i, true) / 32767.0;
      sampleCallback(value, channel);
      channel = ++channel % 2;
    }
    
    oddByte = (i < dataLen) ? data.readUInt8(i, true) : null;
  });
  
  ffmpeg.stderr.on('data', function(data) {
    // Text info from ffmpeg is output to stderr
    outputStr += data.toString();
  });
  
  ffmpeg.stderr.on('end', function() {
    if (gotData)
      endCallback(null, outputStr);
    else
      endCallback(outputStr, null);
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
