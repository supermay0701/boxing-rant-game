import { NameField } from './NameField';
import { AvatarUploader } from './AvatarUploader';
import { JerseyPicker } from './JerseyPicker';
import { TrashTalkEditor } from './TrashTalkEditor';
import type { SetupData, JerseyConfig } from './types';
import { saveSetup, loadSetup, type PersistedSetup, type PersistedJersey } from '../shared/Persistence';

export interface RawSetupState {
  puncherName: string;
  puncherAvatar: ImageBitmap | null;
  puncherJersey: JerseyConfig | null;
  puncherTalks: string[];
  victimName: string;
  victimAvatar: ImageBitmap | null;
  victimJersey: JerseyConfig | null;
}

export function validateSetupComplete(s: RawSetupState): { ok: boolean; missing?: string } {
  if (!s.puncherName.trim()) return { ok: false, missing: '扁人者名字' };
  if (!s.puncherAvatar)      return { ok: false, missing: '扁人者頭像' };
  if (!s.puncherJersey)      return { ok: false, missing: '扁人者服裝' };
  if (s.puncherTalks.length === 0) return { ok: false, missing: '至少 1 句嗆聲' };
  if (!s.victimName.trim())  return { ok: false, missing: '被扁者名字' };
  if (!s.victimAvatar)       return { ok: false, missing: '被扁者頭像' };
  if (!s.victimJersey)       return { ok: false, missing: '被扁者服裝' };
  return { ok: true };
}

type StartHandler = (data: SetupData) => void;

export class SetupPanel {
  private state: RawSetupState = {
    puncherName: '', puncherAvatar: null, puncherJersey: null, puncherTalks: [],
    victimName: '',  victimAvatar: null,  victimJersey: null,
  };
  private activeTab: 'puncher' | 'victim' = 'puncher';
  private handler: StartHandler = () => {};
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();
  }

  async hydrateFromLocalStorage(): Promise<void> {
    const saved = loadSetup();
    if (!saved) return;
    this.state.puncherName = saved.puncher.name;
    this.state.victimName  = saved.victim.name;
    this.state.puncherTalks = saved.puncher.talks ?? [];
    if (saved.puncher.avatarDataUrl) this.state.puncherAvatar = await dataUrlToBitmap(saved.puncher.avatarDataUrl);
    if (saved.victim.avatarDataUrl)  this.state.victimAvatar  = await dataUrlToBitmap(saved.victim.avatarDataUrl);
    this.state.puncherJersey = await rehydrateJersey(saved.puncher.jersey);
    this.state.victimJersey  = await rehydrateJersey(saved.victim.jersey);
    this.render();
  }

  persistCurrentState(): void {
    if (!this.state.puncherAvatar || !this.state.victimAvatar) return;
    const persisted: PersistedSetup = {
      puncher: {
        name: this.state.puncherName,
        avatarDataUrl: bitmapToDataUrl(this.state.puncherAvatar),
        jersey: jerseyToPersisted(this.state.puncherJersey!),
        talks: this.state.puncherTalks,
      },
      victim: {
        name: this.state.victimName,
        avatarDataUrl: bitmapToDataUrl(this.state.victimAvatar),
        jersey: jerseyToPersisted(this.state.victimJersey!),
      },
    };
    saveSetup(persisted);
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="setup-container">
        <div class="demo-frame">
          <div class="tabs">
            <div class="tab${this.activeTab === 'puncher' ? ' active' : ''}" data-tab="puncher">🥊 扁人</div>
            <div class="tab${this.activeTab === 'victim'  ? ' active' : ''}" data-tab="victim">😵 被扁</div>
          </div>
          <div class="tab-content"></div>
          <button class="start-btn" disabled>🥊 開扁！</button>
          <div class="start-hint" style="font-size:11px;color:#ff6b6b;text-align:center;margin-top:6px"></div>
        </div>
      </div>
    `;

    this.root.querySelectorAll<HTMLElement>('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab as 'puncher' | 'victim';
        this.render();
      });
    });

    const tabContent = this.root.querySelector('.tab-content') as HTMLElement;
    this.renderActiveTab(tabContent);
    this.updateStartButton();

    const startBtn = this.root.querySelector('.start-btn') as HTMLButtonElement;
    startBtn.addEventListener('click', () => this.tryStart());
  }

  private renderActiveTab(container: HTMLElement): void {
    container.innerHTML = '<div data-slot="name"></div><div data-slot="avatar"></div><div data-slot="jersey"></div><div data-slot="talks"></div>';

    const nameRoot   = container.querySelector('[data-slot=name]')   as HTMLElement;
    const avatarRoot = container.querySelector('[data-slot=avatar]') as HTMLElement;
    const jerseyRoot = container.querySelector('[data-slot=jersey]') as HTMLElement;
    const talksRoot  = container.querySelector('[data-slot=talks]')  as HTMLElement;

    const tab = this.activeTab;
    const nameField   = new NameField(nameRoot, tab === 'puncher' ? this.state.puncherName : this.state.victimName);
    const avatarField = new AvatarUploader(avatarRoot);
    const existingJersey = tab === 'puncher' ? this.state.puncherJersey : this.state.victimJersey;
    const jerseyField = new JerseyPicker(jerseyRoot, existingJersey);

    const existingAvatar = tab === 'puncher' ? this.state.puncherAvatar : this.state.victimAvatar;
    if (existingAvatar) avatarField.setInitialBitmap(existingAvatar);

    nameField.onChange(v => {
      if (tab === 'puncher') this.state.puncherName = v; else this.state.victimName = v;
      this.updateStartButton();
    });
    avatarField.onChange(b => {
      if (tab === 'puncher') this.state.puncherAvatar = b; else this.state.victimAvatar = b;
      this.updateStartButton();
    });
    jerseyField.onChange(j => {
      if (tab === 'puncher') this.state.puncherJersey = j; else this.state.victimJersey = j;
      this.updateStartButton();
    });

    // Initialize jersey default
    if (tab === 'puncher' && !this.state.puncherJersey) this.state.puncherJersey = jerseyField.value();
    if (tab === 'victim'  && !this.state.victimJersey)  this.state.victimJersey  = jerseyField.value();

    if (tab === 'puncher') {
      const talksField = new TrashTalkEditor(talksRoot, this.state.puncherTalks);
      talksField.onChange(t => { this.state.puncherTalks = t; this.updateStartButton(); });
    } else {
      talksRoot.innerHTML = '';
    }
  }

  private updateStartButton(): void {
    const v = validateSetupComplete(this.state);
    const btn = this.root.querySelector('.start-btn') as HTMLButtonElement;
    const hint = this.root.querySelector('.start-hint') as HTMLElement;
    btn.disabled = !v.ok;
    hint.textContent = v.ok ? '' : `請先完成：${v.missing}`;
    if (v.ok) this.persistCurrentState();
  }

  private tryStart(): void {
    const v = validateSetupComplete(this.state);
    if (!v.ok) return;
    const data: SetupData = {
      puncher: { name: this.state.puncherName, avatar: this.state.puncherAvatar!, jersey: this.state.puncherJersey!, talks: this.state.puncherTalks },
      victim:  { name: this.state.victimName,  avatar: this.state.victimAvatar!,  jersey: this.state.victimJersey! },
      duration: 60_000,
    };
    this.handler(data);
  }

  onStart(h: StartHandler): void { this.handler = h; }
}

function bitmapToDataUrl(b: ImageBitmap): string {
  const c = document.createElement('canvas');
  c.width = b.width; c.height = b.height;
  c.getContext('2d')!.drawImage(b, 0, 0);
  return c.toDataURL('image/png');
}
async function dataUrlToBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  const blob = await res.blob();
  return createImageBitmap(blob);
}
function jerseyToPersisted(j: JerseyConfig): PersistedJersey {
  if (j.type === 'preset') return { type: 'preset', primary: j.primary, secondary: j.secondary };
  return { type: 'custom', primary: '#000', secondary: '#fff', bitmapDataUrl: bitmapToDataUrl(j.bitmap) };
}
async function rehydrateJersey(p: PersistedJersey): Promise<JerseyConfig> {
  if (p.type === 'preset') return { type: 'preset', primary: p.primary, secondary: p.secondary };
  return { type: 'custom', bitmap: await dataUrlToBitmap(p.bitmapDataUrl!) };
}
