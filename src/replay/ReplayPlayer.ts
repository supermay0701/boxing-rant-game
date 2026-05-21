export class ReplayPlayer {
  private url: string | null = null;
  constructor(private root: HTMLElement) {}

  render(blob: Blob | null): void {
    if (!blob) {
      this.root.innerHTML = `<div class="empty-replay">你的瀏覽器不支援錄影，所以沒有重播檔。</div>`;
      return;
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(blob);

    // Determine extension from blob.type or fallback
    const mimeType = blob.type || (window as any).__lastMimeType || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

    this.root.innerHTML = `
      <video src="${this.url}" controls autoplay class="replay-video"></video>
      <div class="replay-actions">
        <a class="replay-download" href="${this.url}" download="fight.${ext}">⬇ 下載 .${ext}</a>
      </div>
    `;
  }

  destroy(): void {
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
  }
}
