/******************************************************************************
 * Calculate the ReplayGain adjustment for a file containing an audio track.
 * See http://replaygain.org/ for more information.
 * http://github.com/jhurliman/node-pcm
 * Copyright (c) 2012 Cull TV, Inc. <jhurliman@cull.tv>
 *****************************************************************************/

var fs = require('fs');
var pcm = require('../lib/pcm');
var ReplayGain = require('../misc/replayGain');

var SAMPLE_RATE = 11025;
var CHANNELS = 2;

// Check command line args
if (process.argv.length !== 3) {
  console.error('Usage: node gain.js [input]. Input is anyfile with an audio ' +
    'track readable by ffmpeg');
  process.exit(-1);
}

var gainleftbuf = [];
var gainrightbuf = [];

var replayGain = new ReplayGain(SAMPLE_RATE);

console.log('Reading audio data...');
pcm.getPcmData(process.argv[2], { stereo: CHANNELS === 2, sampleRate: SAMPLE_RATE },
  function(sample, channel) {
    sample *= 32767.0;
    
    if (channel === 0)
      gainleftbuf.push(sample);
    else
      gainrightbuf.push(sample);
    
    if (gainleftbuf.length === ReplayGain.MIN_BUFSIZE && gainrightbuf.length === ReplayGain.MIN_BUFSIZE) {
      replayGain.analyzeSamples(gainleftbuf, gainrightbuf);
      gainleftbuf.length = 0;
      gainrightbuf.length = 0;
    }
  },
  function(err, output) {
    if (err) throw err;
    
    var gain = replayGain.getReplayGain();
    console.log('ReplayGain = ' + gain.toFixed(2) + 'dB');
  }
);
