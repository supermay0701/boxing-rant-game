const TRY_MIMES = [
  'video/mp4;codecs=h264,opus',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export class Recorder {
  static isSupported(): boolean {
    if (typeof MediaRecorder === 'undefined') return false;
    return TRY_MIMES.some(m => MediaRecorder.isTypeSupported(m));
  }

  static pickMimeType(): string | null {
    if (typeof MediaRecorder === 'undefined') return null;
    return TRY_MIMES.find(m => MediaRecorder.isTypeSupported(m)) ?? null;
  }

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType: string = 'video/webm';

  constructor(private canvas: HTMLCanvasElement, private audioStream?: MediaStream) {}

  start(): void {
    const mime = Recorder.pickMimeType();
    if (!mime) return;
    this.mimeType = mime;
    this.chunks = [];

    const canvasStream = this.canvas.captureStream(30);
    let combined: MediaStream;
    if (this.audioStream && this.audioStream.getAudioTracks().length > 0) {
      combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...this.audioStream.getAudioTracks(),
      ]);
    } else {
      combined = canvasStream;
    }

    this.mediaRecorder = new MediaRecorder(combined, {
      mimeType: mime,
      videoBitsPerSecond: 5_000_000,   // 5 Mbps for better quality
    });
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.mediaRecorder.start(500);
  }

  async stop(): Promise<{ blob: Blob; mimeType: string } | null> {
    if (!this.mediaRecorder) return null;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Safety: if onstop never fires, resolve with whatever chunks we have
        resolve({ blob: new Blob(this.chunks, { type: this.mimeType }), mimeType: this.mimeType });
      }, 3000);
      this.mediaRecorder!.onstop = () => {
        clearTimeout(timeout);
        resolve({ blob: new Blob(this.chunks, { type: this.mimeType }), mimeType: this.mimeType });
      };
      this.mediaRecorder!.stop();
    });
  }
}
