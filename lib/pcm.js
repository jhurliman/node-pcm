var spawn = require('child_process').spawn;
var stream = require('stream');

/**
 * Takes a file containing an audio stream and returns a stream that
 * will emit raw PCM data asynchronously using ffmpeg.
 * @param {String} filename file to extract audio from.
 * @param {Object} options placeholder, currently unused.
 */
exports.getPcmData = function(filename, options) {
  var outputStr = '';
  var oddByte = null;
  var channel = 0;
  var gotData = false;
  var sampleStream = new stream.Stream();
  sampleStream.writeable = true;
  sampleStream.readable = true;
  
  // Extract signed 16-bit little endian PCM data with ffmpeg and pipe to
  // stdout
  var ffmpeg = spawn('ffmpeg', ['-i',filename,'-f','s16le','-ac','2',
    '-acodec','pcm_s16le','-ar','44100','-y','pipe:1']);
  
  ffmpeg.stdout.on('data', function(data) {
    gotData = true;
    
    var i = 0;
    var samples = Math.floor((data.length + (oddByte !== null ? 1 : 0)) / 2);
    
    // If there is a leftover byte from the previous block, combine it with the
    // first byte from this block
    if (oddByte !== null) {
      value = ((data.readInt8(i++) << 8) | oddByte) / 32767;
      sampleStream.emit('data', value, channel);
      channel = ++channel % 2;
    }
    
    for (; i < data.length; i += 2) {
      value = data.readInt16LE(i) / 32767;
      sampleStream.emit('data', value, channel);
      channel = ++channel % 2;
    }
    
    oddByte = (i < data.length) ? data.readUInt8(i) : null;
  });
  
  ffmpeg.stderr.on('data', function(data) {
    // Text info from ffmpeg is output to stderr
    outputStr += data.toString();
  });
  
  ffmpeg.stderr.on('end', function() {
    if (gotData)
      sampleStream.emit('end', null, outputStr);
    else
      sampleStream.emit('end', outputStr, null);
  });
  
  return sampleStream;
};
