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

  // Crop state
  private cropActive = false;
  private cropX = 0;   // circle center x in display coords
  private cropY = 0;   // circle center y in display coords
  private cropR = 0;   // circle radius in display coords
  private isDragging = false;
  private dragOffX = 0;
  private dragOffY = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div class="field-block">
        <div class="field-label">頭像</div>
        <div class="recent-avatars"></div>
        <div class="avatar-upload-row" style="display:flex;gap:10px;align-items:center">
          <canvas class="avatar-preview" width="64" height="64"></canvas>
          <label class="add-talk" style="flex:1;height:64px;cursor:pointer;display:flex;align-items:center;justify-content:center">
            ＋ 上傳照片
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden />
          </label>
        </div>
        <div class="crop-ui" hidden></div>
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
    if (recents.length === 0) {
      container.innerHTML = `<div style="font-size:10px;color:rgba(156,163,175,0.45);margin-bottom:6px;font-style:italic;">上傳後可在此快速重複選取</div>`;
      return;
    }
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
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const ctx = cvs.getContext('2d')!;
        ctx.save();
        ctx.beginPath(); ctx.arc(20, 20, 20, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, 0, 0, 40, 40);
        ctx.restore();
      };
      wrapper.addEventListener('mouseenter', () => { (cvs as HTMLElement).style.opacity = '0.65'; delBtn.style.display = 'flex'; });
      wrapper.addEventListener('mouseleave', () => { (cvs as HTMLElement).style.opacity = '1'; delBtn.style.display = 'none'; });
      cvs.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.hideError();
        try { const b = await createImageBitmap(img); this.drawPreview(b); this.handler(b); }
        catch { this.showError('無法載入，請重新上傳'); }
      });
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); removeFromRecentAvatars(url); this.renderRecents(); });
      row.appendChild(wrapper);
    }
  }

  private async handleFile(file?: File): Promise<void> {
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.ok) { this.showError(v.error!); return; }
    this.hideError();
    try {
      const originalBitmap = await createImageBitmap(file);
      this.showCropUI(originalBitmap);
    } catch {
      this.showError('影像讀取失敗，請換一張');
    }
  }

  // ---- CROP UI ----

  private showCropUI(originalBitmap: ImageBitmap): void {
    this.cropActive = true;
    const DISPLAY_SIZE = 240;
    const scale = DISPLAY_SIZE / Math.max(originalBitmap.width, originalBitmap.height);
    const dispW = Math.round(originalBitmap.width * scale);
    const dispH = Math.round(originalBitmap.height * scale);

    // Initial circle: for portrait photos put circle at top 25% (face area)
    const isPortrait = dispH > dispW * 1.1;
    this.cropR = Math.round(Math.min(dispW, dispH) * 0.32);  // smaller = 32%
    this.cropX = dispW / 2;
    this.cropY = isPortrait ? Math.round(dispH * 0.25) : Math.round(dispH / 2);

    const cropContainer = this.root.querySelector('.crop-ui') as HTMLElement;
    cropContainer.hidden = false;
    (this.root.querySelector('.avatar-upload-row') as HTMLElement).style.display = 'none';
    (this.root.querySelector('.recent-avatars') as HTMLElement).style.display = 'none';

    cropContainer.innerHTML = `
      <div style="font-size:11px;color:#9ca3af;margin-bottom:6px;text-align:center;">拖曳圓圈到臉部，滑桿調大小</div>
      <div style="text-align:center;">
        <span class="crop-canvas-wrap" style="position:relative;display:inline-block;line-height:0;">
          <canvas class="crop-photo" width="${dispW}" height="${dispH}" style="border-radius:4px;max-width:100%;display:block;"></canvas>
          <canvas class="crop-overlay" width="${dispW}" height="${dispH}" style="position:absolute;top:0;left:0;cursor:grab;width:100%;height:100%;"></canvas>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
        <span style="font-size:10px;color:#9ca3af;white-space:nowrap;">圓圈大小</span>
        <input class="crop-size-slider" type="range"
          min="${Math.round(Math.min(dispW, dispH) * 0.18)}"
          max="${Math.round(Math.min(dispW, dispH) * 0.52)}"
          value="${this.cropR}"
          style="flex:1;accent-color:#f59e0b;cursor:pointer;" />
      </div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button class="crop-confirm" style="flex:1;padding:8px;background:#f59e0b;color:#111;border:none;border-radius:4px;font-weight:900;font-size:13px;cursor:pointer;">✓ 確認裁切</button>
        <button class="crop-cancel" style="flex:0 0 auto;padding:8px 12px;background:#374151;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;">取消</button>
      </div>
    `;

    const photoCvs = cropContainer.querySelector('.crop-photo') as HTMLCanvasElement;
    const overlayCvs = cropContainer.querySelector('.crop-overlay') as HTMLCanvasElement;
    const photoCtx = photoCvs.getContext('2d')!;
    photoCtx.drawImage(originalBitmap, 0, 0, dispW, dispH);

    const drawOverlay = () => {
      const ctx = overlayCvs.getContext('2d')!;
      ctx.clearRect(0, 0, dispW, dispH);
      // Dark mask
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, dispW, dispH);
      // Clear circle
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(this.cropX, this.cropY, this.cropR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Circle border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.arc(this.cropX, this.cropY, this.cropR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    drawOverlay();

    // Canvas-relative mouse pos helper
    const getPos = (e: MouseEvent | Touch, cvs: HTMLCanvasElement) => {
      const rect = cvs.getBoundingClientRect();
      const scaleX = cvs.width / rect.width;
      const scaleY = cvs.height / rect.height;
      return {
        x: (('clientX' in e ? e.clientX : (e as Touch).clientX) - rect.left) * scaleX,
        y: (('clientY' in e ? e.clientY : (e as Touch).clientY) - rect.top) * scaleY,
      };
    };

    const clamp = (v: number, mn: number, mx: number) => Math.min(Math.max(v, mn), mx);

    const onStart = (x: number, y: number) => {
      const dx = x - this.cropX; const dy = y - this.cropY;
      if (Math.sqrt(dx * dx + dy * dy) <= this.cropR + 12) {
        this.isDragging = true;
        this.dragOffX = dx; this.dragOffY = dy;
        overlayCvs.style.cursor = 'grabbing';
      }
    };
    const onMove = (x: number, y: number) => {
      if (!this.isDragging) return;
      this.cropX = clamp(x - this.dragOffX, this.cropR, dispW - this.cropR);
      this.cropY = clamp(y - this.dragOffY, this.cropR, dispH - this.cropR);
      drawOverlay();
    };
    const onEnd = () => { this.isDragging = false; overlayCvs.style.cursor = 'grab'; };

    overlayCvs.addEventListener('mousedown', (e) => { const p = getPos(e, overlayCvs); onStart(p.x, p.y); });
    overlayCvs.addEventListener('mousemove', (e) => { const p = getPos(e, overlayCvs); onMove(p.x, p.y); });
    overlayCvs.addEventListener('mouseup', onEnd);
    overlayCvs.addEventListener('mouseleave', onEnd);
    overlayCvs.addEventListener('touchstart', (e) => { e.preventDefault(); const p = getPos(e.touches[0], overlayCvs); onStart(p.x, p.y); }, { passive: false });
    overlayCvs.addEventListener('touchmove', (e) => { e.preventDefault(); const p = getPos(e.touches[0], overlayCvs); onMove(p.x, p.y); }, { passive: false });
    overlayCvs.addEventListener('touchend', onEnd);

    // Size slider
    const slider = cropContainer.querySelector('.crop-size-slider') as HTMLInputElement;
    slider.addEventListener('input', () => {
      this.cropR = parseInt(slider.value, 10);
      // Re-clamp position so circle stays within image
      this.cropX = clamp(this.cropX, this.cropR, dispW - this.cropR);
      this.cropY = clamp(this.cropY, this.cropR, dispH - this.cropR);
      drawOverlay();
    });

    // Confirm: crop from photo canvas, apply cartoon filter
    (cropContainer.querySelector('.crop-confirm') as HTMLButtonElement).addEventListener('click', async () => {
      const cropSize = this.cropR * 2;
      const cropCvs = document.createElement('canvas');
      cropCvs.width = cropCvs.height = 256;
      const cCtx = cropCvs.getContext('2d')!;
      // Scale from display coords back to display canvas coords (photoCvs already at dispW×dispH)
      cCtx.save();
      cCtx.beginPath(); cCtx.arc(128, 128, 128, 0, Math.PI * 2); cCtx.clip();
      cCtx.drawImage(photoCvs,
        this.cropX - this.cropR, this.cropY - this.cropR, cropSize, cropSize,
        0, 0, 256, 256
      );
      cCtx.restore();

      // Apply cartoon filter to cropped region
      const croppedBlob = await new Promise<Blob>(r => cropCvs.toBlob(b => r(b!), 'image/png'));
      const croppedFile = new File([croppedBlob], 'crop.png', { type: 'image/png' });
      this.hideCropUI();
      try {
        const bitmap = await applyCartoonFilter(croppedFile);
        this.drawPreview(bitmap);
        addToRecentAvatars(bitmapToDataUrl(bitmap));
        this.renderRecents();
        this.handler(bitmap);
      } catch {
        this.showError('影像處理失敗，請換一張');
      }
    });

    (cropContainer.querySelector('.crop-cancel') as HTMLButtonElement).addEventListener('click', () => {
      this.hideCropUI();
    });
  }

  private hideCropUI(): void {
    if (!this.cropActive) return;
    this.cropActive = false;
    const cropContainer = this.root.querySelector('.crop-ui') as HTMLElement;
    cropContainer.hidden = true;
    cropContainer.innerHTML = '';
    (this.root.querySelector('.avatar-upload-row') as HTMLElement).style.display = 'flex';
    (this.root.querySelector('.recent-avatars') as HTMLElement).style.display = '';
  }

  // ---- END CROP UI ----

  private drawPreview(bitmap: ImageBitmap): void {
    const ctx = this.preview.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(bitmap, 0, 0, 64, 64);
  }
  private showError(msg: string): void { this.error.textContent = msg; this.error.hidden = false; }
  private hideError(): void { this.error.hidden = true; }
  onChange(h: ChangeHandler): void { this.handler = h; }
  setInitialBitmap(bitmap: ImageBitmap): void { this.drawPreview(bitmap); }
}
