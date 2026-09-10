import { Stream } from "stream";
export interface PcmOptions {
  stereo?: boolean;
  sampleRate?: number;
  ffmpegPath?: string;
}
export type SampleCallback = (sample: number, channel: number) => void;
export type EndCallback = (error: string | null, output: string | null) => void;
export function getPcmData(filename: string, options: PcmOptions | null | undefined, sampleCallback: SampleCallback, endCallback: EndCallback): void;
/** Legacy event emitter: data receives (sample, channel), end receives (error, output). */
export interface PcmStream extends Stream {
  readable: boolean;
  on(event: 'data', listener: SampleCallback): this;
  on(event: 'end', listener: EndCallback): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
}
export function getPcmStream(filename: string, options?: PcmOptions | null): PcmStream;
