# node-pcm #

Takes a file containing an audio stream and returns raw PCM data asynchronously
using ffmpeg.

## Installation ##

    npm install pcm

## Usage ##

    var pcm = require('pcm');
    
    var min = 1.0;
    var max = -1.0;
    
    pcm.getPcmData('test.mp3', { stereo: true, sampleRate: 44100 },
      function(sample, channel) {
        // Sample is from [-1.0...1.0], channel is 0 for left and 1 for right
        min = Math.min(min, sample);
        max = Math.max(max, sample);
      },
      function(err, output) {
        if (err)
          throw new Error(err);
        console.log('min=' + min + ', max=' + max);
      }
    );

## Sponsors ##

* [cull.tv](http://cull.tv/) - New music television

## License ##

(The MIT License)

Copyright (c) 2012 Cull TV, Inc. &lt;jhurliman@cull.tv&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
