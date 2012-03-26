/*
 *  ReplayGainAnalysis - analyzes input samples and give the recommended dB change
 *  Copyright (c) 2012 Cull TV, Inc. <jhurliman@cull.tv>
 *  Based on gain_analysis.c, copyright 2001 David Robinson and Glen Sawyer
 *  Improvements and optimizations added by Frank Klemm, and by Marcel Muller
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public
 *  License as published by the Free Software Foundation; either
 *  version 2.1 of the License, or (at your option) any later version.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public
 *  License along with this library; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 *  concept and filter values by David Robinson (David@Robinson.org)
 *    -- blame him if you think the idea is flawed
 *  original coding by Glen Sawyer (mp3gain@hotmail.com)
 *    -- blame him if you think this runs too slowly, or the coding is otherwise flawed
 *
 *  lots of code improvements by Frank Klemm ( http://www.uni-jena.de/~pfk/mpp/ )
 *    -- credit him for all the _good_ programming ;)
 *
 *  node.js implementation by John Hurliman <jhurliman@cull.tv>
 *    -- blame him if this version is broken
 *
 *  For an explanation of the concepts and the basic algorithms involved, go to:
 *    http://www.replaygain.org/
 */

var AB_YULE = [
  /* 20                 18                 16                 14                 12                 10                 8                  6                  4                  2                 0                 19                 17                 15                 13                 11                 9                  7                  5                  3                  1              */
  [ 0.00288463683916,  0.00012025322027,  0.00306428023191,  0.00594298065125, -0.02074045215285,  0.02161526843274, -0.01655260341619, -0.00009291677959, -0.00123395316851, -0.02160367184185, 0.03857599435200, 0.13919314567432, -0.86984376593551,  2.75465861874613, -5.87257861775999,  9.48293806319790,-12.28759895145294, 13.05504219327545,-11.34170355132042,  7.81501653005538, -3.84664617118067],
  [-0.00187763777362,  0.00674613682247, -0.00240879051584,  0.01624864962975, -0.02596338512915,  0.02245293253339, -0.00834990904936, -0.00851165645469, -0.00848709379851, -0.02911007808948, 0.05418656406430, 0.13149317958808, -0.75104302451432,  2.19611684890774, -4.39470996079559,  6.85401540936998, -8.81498681370155,  9.47693607801280, -8.54751527471874,  6.36317777566148, -3.47845948550071],
  [-0.00881362733839,  0.00651420667831, -0.01390589421898,  0.03174092540049,  0.00222312597743,  0.04781476674921, -0.05588393329856,  0.02163541888798, -0.06247880153653, -0.09331049056315, 0.15457299681924, 0.02347897407020, -0.05032077717131,  0.16378164858596, -0.45953458054983,  1.00595954808547, -1.67148153367602,  2.23697657451713, -2.64577170229825,  2.84868151156327, -2.37898834973084],
  [-0.02950134983287,  0.00205861885564, -0.00000828086748,  0.06276101321749, -0.00584456039913, -0.02364141202522, -0.00915702933434,  0.03282930172664, -0.08587323730772, -0.22613988682123, 0.30296907319327, 0.00302439095741,  0.02005851806501,  0.04500235387352, -0.22138138954925,  0.39120800788284, -0.22638893773906, -0.16276719120440, -0.25656257754070,  1.07977492259970, -1.61273165137247],
  [-0.01760176568150, -0.01635381384540,  0.00832043980773,  0.05724228140351, -0.00589500224440, -0.00469977914380, -0.07834489609479,  0.11921148675203, -0.11828570177555, -0.25572241425570, 0.33642304856132, 0.02977207319925, -0.04237348025746,  0.08333755284107, -0.04067510197014, -0.12453458140019,  0.47854794562326, -0.80774944671438,  0.12205022308084,  0.87350271418188, -1.49858979367799],
  [ 0.00541907748707, -0.03193428438915, -0.01863887810927,  0.10478503600251,  0.04097565135648, -0.12398163381748,  0.04078262797139, -0.01419140100551, -0.22784394429749, -0.14351757464547, 0.44915256608450, 0.03222754072173,  0.05784820375801,  0.06747620744683,  0.00613424350682,  0.22199650564824, -0.42029820170918,  0.00213767857124, -0.37256372942400,  0.29661783706366, -0.62820619233671],
  [-0.00588215443421, -0.03788984554840,  0.08647503780351,  0.00647310677246, -0.27562961986224,  0.30931782841830, -0.18901604199609,  0.16744243493672,  0.16242137742230, -0.75464456939302, 0.56619470757641, 0.01807364323573,  0.01639907836189, -0.04784254229033,  0.06739368333110, -0.33032403314006,  0.45054734505008,  0.00819999645858, -0.26806001042947,  0.29156311971249, -1.04800335126349],
  [-0.00749618797172, -0.03721611395801,  0.06920467763959,  0.01628462406333, -0.25344790059353,  0.15558449135573,  0.02377945217615,  0.17520704835522, -0.14289799034253, -0.53174909058578, 0.58100494960553, 0.01818801111503,  0.02442357316099, -0.02505961724053, -0.05246019024463, -0.23313271880868,  0.38952639978999,  0.14728154134330, -0.20256413484477, -0.31863563325245, -0.51035327095184],
  [-0.02217936801134,  0.04788665548180, -0.04060034127000, -0.11202315195388, -0.02459864859345,  0.14590772289388, -0.10214864179676,  0.04267842219415, -0.00275953611929, -0.42163034350696, 0.53648789255105, 0.04704409688120,  0.05477720428674, -0.18823009262115, -0.17556493366449,  0.15113130533216,  0.26408300200955, -0.04678328784242, -0.03424681017675, -0.43193942311114, -0.25049871956020]
];

var AB_BUTTER = [
  /* 5                4                  3                  2                 1              */
  [0.98621192462708, 0.97261396931306, -1.97242384925416, -1.97223372919527, 0.98621192462708],
  [0.98500175787242, 0.97022847566350, -1.97000351574484, -1.96977855582618, 0.98500175787242],
  [0.97938932735214, 0.95920349965459, -1.95877865470428, -1.95835380975398, 0.97938932735214],
  [0.97531843204928, 0.95124613669835, -1.95063686409857, -1.95002759149878, 0.97531843204928],
  [0.97316523498161, 0.94705070426118, -1.94633046996323, -1.94561023566527, 0.97316523498161],
  [0.96454515552826, 0.93034775234268, -1.92909031105652, -1.92783286977036, 0.96454515552826],
  [0.96009142950541, 0.92177618768381, -1.92018285901082, -1.91858953033784, 0.96009142950541],
  [0.95856916599601, 0.91885558323625, -1.91713833199203, -1.91542108074780, 0.95856916599601],
  [0.94597685600279, 0.89487434461664, -1.89195371200558, -1.88903307939452, 0.94597685600279]
];

var PINK_REF = 64.82; // 298640883795 - calibration value for 89dB
var RMS_PERCENTILE = 0.95; // Percentile which is louder than the proposed level
var MAX_SAMP_FREQ = 48000; // Maximum allowed sample frequency [Hz]
var RMS_WINDOW_TIME_NUMERATOR = 1;
var RMS_WINDOW_TIME_DENOMINATOR = 20; // numerator / denominator = time slice size [s]
var STEPS_per_dB = 100; // Table entries per dB
var MAX_dB = 120; // Table entries for 0...MAX_dB (normal max. values are 70...80 dB)
var MAX_ORDER = 10;
var MAX_SAMPLES_PER_WINDOW = Math.floor(
  (MAX_SAMP_FREQ * RMS_WINDOW_TIME_NUMERATOR) / RMS_WINDOW_TIME_DENOMINATOR + 1);

/**
 * Create a new ReplayGain instance.
 * @param {Number} sampleRate Sampling rate of the audio data that will be fed
 *        to ReplayGain, such as 44100.
 */
var ReplayGain = function(sampleRate) {
  this.sampleRate = sampleRate;
  this.sampleWindow = Math.floor(
    (sampleRate * RMS_WINDOW_TIME_NUMERATOR + RMS_WINDOW_TIME_DENOMINATOR - 1) / RMS_WINDOW_TIME_DENOMINATOR);
  this.lsum = 0.0;
  this.rsum = 0.0;
  this.totsamp = 0;
  
  switch (sampleRate) {
    case 48000: this.freqindex = 0; break;
    case 44100: this.freqindex = 1; break;
    case 32000: this.freqindex = 2; break;
    case 24000: this.freqindex = 3; break;
    case 22050: this.freqindex = 4; break;
    case 16000: this.freqindex = 5; break;
    case 12000: this.freqindex = 6; break;
    case 11025: this.freqindex = 7; break;
    case  8000: this.freqindex = 8; break;
    default: throw 'INIT_GAIN_ANALYSIS_ERROR';
  }
  
  // Input samples, with pre-buffer
  this.linprebuf = new Float32Array(MAX_ORDER * 2);
  this.rinprebuf = new Float32Array(MAX_ORDER * 2);
  // Post first filter samples
  this.lstepbuf = new Float32Array(MAX_SAMPLES_PER_WINDOW + MAX_ORDER);
  this.rstepbuf = new Float32Array(MAX_SAMPLES_PER_WINDOW + MAX_ORDER);
  // Post second filter samples
  this.loutbuf = new Float32Array(MAX_SAMPLES_PER_WINDOW + MAX_ORDER);
  this.routbuf = new Float32Array(MAX_SAMPLES_PER_WINDOW + MAX_ORDER);
  // Final table with one entry per dB step
  this.A = new Int32Array(STEPS_per_dB * MAX_dB);
};

/**
 * Feed new audio samples into ReplayGain.
 * @param {Array<Number>} An array containing audio samples in the 
 *        [-32767...32767] range for the mono or left stereo channel. Must
 *        contain at least ReplayGain.MIN_BUFSIZE (10) samples.
 * @param {Array<Number>} An optional array containing audio samples in the
 *        [-32767...32767] range for the right stereo channel. Must contain the
 *        same number of samples as the left parameter.
 */
ReplayGain.prototype.analyzeSamples = function(left, right) {
  if (!right) right = left;
  
  var leftlen = left.length;
  var rightlen = right.length;
  var cursamplepos = 0;
  var batchsamples = leftlen;
  var curleft, curright;
  var i;
  
  if (leftlen < MAX_ORDER || rightlen < MAX_ORDER)
    throw 'GAIN_ANALYSIS_ERROR';
  
  for (i = 0; i < MAX_ORDER; i++) {
    this.linprebuf[MAX_ORDER + i] = left[i];
    this.rinprebuf[MAX_ORDER + i] = right[i];
  }
  
  while (batchsamples > 0) {
    var cursamples = (batchsamples > this.sampleWindow - this.totsamp) ?
      this.sampleWindow - this.totsamp :
      batchsamples;
    
    var leftbuf, rightbuf;
    
    if (cursamplepos < MAX_ORDER) {
      leftbuf = this.linprebuf;
      rightbuf = this.rinprebuf;
      curleft = MAX_ORDER + cursamplepos;
      curright = MAX_ORDER + cursamplepos;
      if (cursamples > MAX_ORDER - cursamplepos)
        cursamples = MAX_ORDER - cursamplepos;
    } else {
      leftbuf = left;
      rightbuf = right;
      curleft = cursamplepos;
      curright = cursamplepos;
    }
    
    filterYule(leftbuf, curleft, this.lstepbuf, MAX_ORDER + this.totsamp, cursamples, AB_YULE[this.freqindex]);
    filterYule(rightbuf, curright, this.rstepbuf, MAX_ORDER + this.totsamp, cursamples, AB_YULE[this.freqindex]);
    
    filterButter(this.lstepbuf, MAX_ORDER + this.totsamp, this.loutbuf, MAX_ORDER + this.totsamp, cursamples, AB_BUTTER[this.freqindex]);
    filterButter(this.rstepbuf, MAX_ORDER + this.totsamp, this.routbuf, MAX_ORDER + this.totsamp, cursamples, AB_BUTTER[this.freqindex]);
    
    curleft = MAX_ORDER + this.totsamp;
    curright = MAX_ORDER + this.totsamp;
    
    i = cursamples % 8;
    while (i--) {
      this.lsum += this.loutbuf[curleft] * this.loutbuf[curleft++];
      this.rsum += this.routbuf[curright] * this.routbuf[curright++];
    }
    i = Math.floor(cursamples / 8);
    while (i--) {
      this.lsum += this.loutbuf[curleft] * this.loutbuf[curleft] +
        this.loutbuf[curleft+1] * this.loutbuf[curleft+1] +
        this.loutbuf[curleft+2] * this.loutbuf[curleft+2] +
        this.loutbuf[curleft+3] * this.loutbuf[curleft+3] +
        this.loutbuf[curleft+4] * this.loutbuf[curleft+4] +
        this.loutbuf[curleft+5] * this.loutbuf[curleft+5] +
        this.loutbuf[curleft+6] * this.loutbuf[curleft+6] +
        this.loutbuf[curleft+7] * this.loutbuf[curleft+7];
      curleft += 8;
      this.rsum += this.routbuf[curright] * this.routbuf[curright] +
        this.routbuf[curright+1] * this.routbuf[curright+1] +
        this.routbuf[curright+2] * this.routbuf[curright+2] +
        this.routbuf[curright+3] * this.routbuf[curright+3] +
        this.routbuf[curright+4] * this.routbuf[curright+4] +
        this.routbuf[curright+5] * this.routbuf[curright+5] +
        this.routbuf[curright+6] * this.routbuf[curright+6] +
        this.routbuf[curright+7] * this.routbuf[curright+7];
      curright += 8;
    }
    
    batchsamples -= cursamples;
    cursamplepos += cursamples;
    this.totsamp += cursamples;
    if (this.totsamp === this.sampleWindow) {
      var val = STEPS_per_dB * 10.0 * log10((this.lsum + this.rsum) / this.totsamp * 0.5 + 1e-37);
      var ival = (val <= 0) ? 0 : Math.floor(val);
      if (ival >= this.A.length) ival = this.A.length - 1;
      this.A[ival]++;
      
      this.lsum = 0.0;
      this.rsum = 0.0;
      for (i = 0; i < MAX_ORDER; i++) {
        this.loutbuf[i] = this.loutbuf[this.totsamp + i];
        this.routbuf[i] = this.routbuf[this.totsamp + i];
        this.lstepbuf[i] = this.lstepbuf[this.totsamp + i];
        this.rstepbuf[i] = this.rstepbuf[this.totsamp + i];
      }
      this.totsamp = 0;
    }
    if (this.totsamp > this.sampleWindow)
      throw 'GAIN_ANALYSIS_ERROR';
  }
  
  for (i = 0; i < MAX_ORDER; i++) {
    this.linprebuf[i] = left[leftlen - MAX_ORDER + i];
    this.rinprebuf[i] = right[rightlen - MAX_ORDER + i];
  }
};

/**
 * Fetch the gain adjustment in decibels for the samples given.
 */
ReplayGain.prototype.getReplayGain = function() {
  return analyzeResult(this.A);
};

ReplayGain.MIN_BUFSIZE = MAX_ORDER;

module.exports = ReplayGain;

/*****************************************************************************/

function filterYule(input, inputIdx, output, outputIdx, numSamples, kernel) {
  while (numSamples--) {
    var y0 =  input[inputIdx-10] * kernel[ 0];
    var y2 =  input[inputIdx -9] * kernel[ 1];
    var y4 =  input[inputIdx -8] * kernel[ 2];
    var y6 =  input[inputIdx -7] * kernel[ 3];
    var s00 = y0 + y2 + y4 + y6;
    var y8 =  input[inputIdx -6] * kernel[ 4];
    var yA =  input[inputIdx -5] * kernel[ 5];
    var yC =  input[inputIdx -4] * kernel[ 6];
    var yE =  input[inputIdx -3] * kernel[ 7];
    var s01 = y8 + yA + yC + yE;
    var yG =  input[inputIdx -2] * kernel[ 8] + input[inputIdx -1] * kernel[ 9];
    var yK =  input[inputIdx -0] * kernel[10];
    
    var s1 = s00 + s01 + yG + yK;
    
    var x1 = output[outputIdx-10] * kernel[11] + output[outputIdx -9] * kernel[12];
    var x5 = output[outputIdx -8] * kernel[13] + output[outputIdx -7] * kernel[14];
    var x9 = output[outputIdx -6] * kernel[15] + output[outputIdx -5] * kernel[16];
    var xD = output[outputIdx -4] * kernel[17] + output[outputIdx -3] * kernel[18];
    var xH = output[outputIdx -2] * kernel[19] + output[outputIdx -1] * kernel[20];
    
    var s2 = x1 + x5 + x9 + xD + xH;
    
    output[outputIdx] = s1 - s2;
    
    ++outputIdx;
    ++inputIdx;
  }
}

function filterButter(input, inputIdx, output, outputIdx, numSamples, kernel) {
  while (numSamples--) {
    var s1 =  input[inputIdx-2] * kernel[0] +  input[inputIdx-1] * kernel[2] +  input[inputIdx] * kernel[4];
    var s2 = output[outputIdx-2] * kernel[1] + output[outputIdx-1] * kernel[3];
    output[outputIdx] = s1 - s2;
    ++outputIdx;
    ++inputIdx;
  }
}

function analyzeResult(array) {
  var elems = 0;
  var i;
  
  for (i = 0; i < array.length; i++)
    elems += array[i];
  if (!elems)
    return 'GAIN_NOT_ENOUGH_SAMPLES';
  
  var upper = Math.ceil(elems * (1.0 - RMS_PERCENTILE));
  var sum = 0;
  for (i = array.length; i-- > 0;) {
    sum += array[i];
    if (sum >= upper)
      break;
  }
  
  return PINK_REF - i / STEPS_per_dB;
}

function log10(arg) {
  return Math.log(arg) / Math.LN10;
}
