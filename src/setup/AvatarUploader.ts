import { applyCartoonFilter } from '../shared/CartoonFilter';

type ChangeHandler = (bitmap: ImageBitmap) => void;

const MAX_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): { ok: boolean; error?: string } {
  if (!VALID_TYPES.includes(file.type)) return { ok: false, error: '請選 jpg/png/webp' };
  if (file.size > MAX_SIZE) return { ok: false, error: '檔案需小於 5MB' };
  return { ok: true };
}

export class AvatarUploader {
  private handler: ChangeHandler = () => {};
  private error: HTMLElement;
  private preview: HTMLCanvasElement;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="field-block">
        <div class="field-label">頭像</div>
        <div style="display:flex;gap:10px;align-items:center">
          <canvas class="avatar-preview" width="64" height="64"></canvas>
          <label class="add-talk" style="flex:1;height:64px;cursor:pointer;display:flex;align-items:center;justify-content:center">
            ＋ 上傳照片
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden />
          </label>
        </div>
        <div class="error-text" style="color:#ff6b6b;font-size:11px;margin-top:6px" hidden></div>
      </div>
    `;
    this.preview = root.querySelector('canvas.avatar-preview')!;
    this.error = root.querySelector('.error-text') as HTMLElement;
    const input = root.querySelector('input[type=file]') as HTMLInputElement;
    input.addEventListener('change', () => this.handleFile(input.files?.[0]));
  }

  private async handleFile(file?: File): Promise<void> {
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.ok) { this.showError(v.error!); return; }
    this.hideError();
    try {
      const bitmap = await applyCartoonFilter(file);
      this.drawPreview(bitmap);
      this.handler(bitmap);
    } catch (e) {
      console.warn('[AvatarUploader] filter failed:', e);
      this.showError('影像處理失敗，請換一張');
    }
  }

  private drawPreview(bitmap: ImageBitmap): void {
    const ctx = this.preview.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(bitmap, 0, 0, 64, 64);
  }

  private showError(msg: string): void {
    this.error.textContent = msg;
    this.error.hidden = false;
  }

  private hideError(): void {
    this.error.hidden = true;
  }

  onChange(h: ChangeHandler): void { this.handler = h; }
}
