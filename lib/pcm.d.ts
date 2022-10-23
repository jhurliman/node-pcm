export declare type PcmOptions = {
    stereo?: boolean;
    sampleRate?: number;
    ffmpegPath?: string;
};
export declare type PcmSampleCallback = (value: number, channel: number) => void;
export declare type PcmEndCallback = (err: string | null, output: string | null) => void;
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
export declare const getPcmData: (filename: string, options: PcmOptions | null | undefined, sampleCallback: PcmSampleCallback, endCallback: PcmEndCallback) => void;
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
export declare const getPcmStream: (filename: string, options: PcmOptions) => any;
