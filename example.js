var pcm = require('pcm');

var min = 1.0;
var max = -1.0;

var pcmStream = pcm.getPcmData('test.mp3')

pcmStream
  .on('data', function(sample, channel) {
    // Sample is from [-1.0...1.0], channel is 0 for left and 1 for right
    min = Math.min(min, sample);
    max = Math.max(max, sample);
  })
  .on('end', function(err, output) {
    if (err)
      throw new Error(err);
    console.log('min=' + min + ', max=' + max);
  })