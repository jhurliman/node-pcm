export interface PcmOptions {
  stereo?: boolean;
  sampleRate?: number;
  ffmpegPath?: string;
}
export type SampleCallback = (sample: number, channel: number) => void;
export type EndCallback = (error: string | null, output: string | null) => void;
export function getPcmData(filename: string, options: PcmOptions | null | undefined, sampleCallback: SampleCallback, endCallback: EndCallback): void;
/** Legacy event emitter: data receives (sample, channel), end receives (error, output). */
export interface PcmStream {
  readable: boolean;
  on(event: 'data', listener: SampleCallback): this;
  on(event: 'end', listener: EndCallback): this;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}
export function getPcmStream(filename: string, options?: PcmOptions | null): PcmStream;
