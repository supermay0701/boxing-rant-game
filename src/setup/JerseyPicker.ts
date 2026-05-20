import { JERSEY_PRESETS } from './jerseyPresets';
import type { JerseyConfig } from './types';

type ChangeHandler = (cfg: JerseyConfig) => void;

export class JerseyPicker {
  private current: JerseyConfig;
  private handler: ChangeHandler = () => {};
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.current = { type: 'preset', primary: JERSEY_PRESETS[0].primary, secondary: JERSEY_PRESETS[0].secondary };
    this.render();
  }

  private render(): void {
    const swatches = JERSEY_PRESETS.map((p, i) => `
      <div class="preset-thumb${i === 0 ? ' selected' : ''}" data-idx="${i}"
           style="background:linear-gradient(135deg, ${p.primary} 0 50%, ${p.secondary} 50% 100%)"></div>
    `).join('');

    this.root.innerHTML = `
      <div class="field-block">
        <div class="field-label">服裝 — 選預設或上傳自製球衣圖</div>
        <div class="preset-row">
          ${swatches}
          <label class="upload-jersey" title="上傳自製球衣">＋
            <input type="file" accept="image/*" hidden />
          </label>
        </div>
      </div>
    `;

    this.root.querySelectorAll<HTMLElement>('.preset-thumb').forEach(el => {
      el.addEventListener('click', () => this.selectPreset(Number(el.dataset.idx)));
    });

    const fileInput = this.root.querySelector('input[type=file]') as HTMLInputElement;
    fileInput.addEventListener('change', () => this.handleUpload(fileInput.files?.[0]));
  }

  private selectPreset(idx: number): void {
    const p = JERSEY_PRESETS[idx];
    this.current = { type: 'preset', primary: p.primary, secondary: p.secondary };
    this.root.querySelectorAll<HTMLElement>('.preset-thumb').forEach(el => el.classList.remove('selected'));
    this.root.querySelectorAll<HTMLElement>('.preset-thumb')[idx].classList.add('selected');
    this.handler(this.current);
  }

  private async handleUpload(file?: File): Promise<void> {
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    this.current = { type: 'custom', bitmap };
    this.handler(this.current);
  }

  value(): JerseyConfig { return this.current; }
  onChange(h: ChangeHandler): void { this.handler = h; }
}
