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
    this.root.innerHTML = `
      <video src="${this.url}" controls autoplay class="replay-video"></video>
      <div class="replay-actions">
        <a class="replay-download" href="${this.url}" download="fight.webm">⬇ 下載 .webm</a>
      </div>
    `;
  }

  destroy(): void {
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
  }
}
