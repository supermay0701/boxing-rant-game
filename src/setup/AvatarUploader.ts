import { applyCartoonFilter } from '../shared/CartoonFilter';

type ChangeHandler = (bitmap: ImageBitmap) => void;

const MAX_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RECENT_KEY = 'boxing-rant-game:recent-avatars-v1';
const MAX_RECENT = 6;

export function validateImageFile(file: File): { ok: boolean; error?: string } {
  if (!VALID_TYPES.includes(file.type)) return { ok: false, error: '請選 jpg/png/webp' };
  if (file.size > MAX_SIZE) return { ok: false, error: '檔案需小於 5MB' };
  return { ok: true };
}

// --- Recent avatar localStorage helpers ---

function loadRecentAvatars(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch { return []; }
}

function saveRecentAvatars(list: string[]): void {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); }
  catch (e) { console.warn('[AvatarUploader] recent-save failed:', e); }
}

function addToRecentAvatars(dataUrl: string): void {
  const list = loadRecentAvatars().filter(u => u !== dataUrl);
  list.unshift(dataUrl);
  saveRecentAvatars(list.slice(0, MAX_RECENT));
}

function removeFromRecentAvatars(dataUrl: string): void {
  const list = loadRecentAvatars().filter(u => u !== dataUrl);
  saveRecentAvatars(list);
}

function bitmapToDataUrl(bitmap: ImageBitmap): string {
  const c = document.createElement('canvas');
  c.width = bitmap.width; c.height = bitmap.height;
  c.getContext('2d')!.drawImage(bitmap, 0, 0);
  return c.toDataURL('image/png');
}

// ---

export class AvatarUploader {
  private handler: ChangeHandler = () => {};
  private error: HTMLElement;
  private preview: HTMLCanvasElement;
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div class="field-block">
        <div class="field-label">頭像</div>
        <div class="recent-avatars"></div>
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
    this.renderRecents();
  }

  private renderRecents(): void {
    const container = this.root.querySelector('.recent-avatars') as HTMLElement;
    const recents = loadRecentAvatars();
    if (recents.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = `
      <div style="margin-bottom:8px">
        <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px;font-weight:700">最近上傳</div>
        <div class="recent-row" style="display:flex;gap:6px;flex-wrap:wrap"></div>
      </div>
    `;
    const row = container.querySelector('.recent-row')!;
    for (const url of recents) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;width:40px;height:40px;cursor:pointer;';
      wrapper.innerHTML = `
        <canvas width="40" height="40" style="width:40px;height:40px;border-radius:50%;border:2px solid rgba(245,158,11,0.4);display:block;"></canvas>
        <button style="
          position:absolute;top:-4px;right:-4px;width:16px;height:16px;
          background:#dc2626;color:#fff;border:none;border-radius:50%;
          font-size:9px;cursor:pointer;display:none;align-items:center;justify-content:center;
          line-height:1;padding:0;
        ">×</button>
      `;
      const cvs = wrapper.querySelector('canvas') as HTMLCanvasElement;
      const delBtn = wrapper.querySelector('button') as HTMLButtonElement;

      // Draw thumbnail
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const ctx = cvs.getContext('2d')!;
        ctx.save();
        ctx.beginPath(); ctx.arc(20, 20, 20, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, 0, 0, 40, 40);
        ctx.restore();
      };

      // Hover show delete button
      wrapper.addEventListener('mouseenter', () => {
        (cvs as HTMLCanvasElement).style.opacity = '0.65';
        delBtn.style.display = 'flex';
      });
      wrapper.addEventListener('mouseleave', () => {
        (cvs as HTMLCanvasElement).style.opacity = '1';
        delBtn.style.display = 'none';
      });

      // Click thumbnail → use this avatar
      cvs.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.hideError();
        try {
          const bitmap = await createImageBitmap(img);
          this.drawPreview(bitmap);
          this.handler(bitmap);
        } catch {
          this.showError('無法載入，請重新上傳');
        }
      });

      // Delete
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromRecentAvatars(url);
        this.renderRecents();
      });

      row.appendChild(wrapper);
    }
  }

  private async handleFile(file?: File): Promise<void> {
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.ok) { this.showError(v.error!); return; }
    this.hideError();
    try {
      const bitmap = await applyCartoonFilter(file);
      this.drawPreview(bitmap);
      // Save to recents as dataURL
      addToRecentAvatars(bitmapToDataUrl(bitmap));
      this.renderRecents();
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

  setInitialBitmap(bitmap: ImageBitmap): void {
    this.drawPreview(bitmap);
  }
}
