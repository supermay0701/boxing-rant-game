export class Recorder {
  static isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined'
        && MediaRecorder.isTypeSupported('video/webm');
  }

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(private canvas: HTMLCanvasElement) {}

  start(): void {
    if (!Recorder.isSupported()) return;
    const stream = this.canvas.captureStream(30);
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.mediaRecorder.start(500);
  }

  async stop(): Promise<Blob | null> {
    if (!this.mediaRecorder) return null;
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        resolve(new Blob(this.chunks, { type: 'video/webm' }));
      };
      this.mediaRecorder!.stop();
    });
  }
}
