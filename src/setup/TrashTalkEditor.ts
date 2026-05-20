type ChangeHandler = (talks: string[]) => void;
const MAX_LINES = 5;
const MAX_CHARS = 15;

export class TrashTalkEditor {
  private lines: string[];
  private handler: ChangeHandler = () => {};
  private root: HTMLElement;

  constructor(root: HTMLElement, initial: string[]) {
    this.root = root;
    this.lines = initial.length > 0 ? initial.slice(0, MAX_LINES) : [''];
    this.render();
  }

  private render(): void {
    const lineHtml = this.lines.map((text, i) => `
      <div class="talk-line">
        <input class="talk" type="text" maxlength="${MAX_CHARS}" placeholder="第 ${i + 1} 句（最多 ${MAX_CHARS} 字）" value="${escapeHtml(text)}" data-idx="${i}" />
        <span class="count" data-count-for="${i}">${text.length}/${MAX_CHARS}</span>
      </div>
    `).join('');

    this.root.innerHTML = `
      <div class="field-block">
        <div class="field-label">嗆聲台詞（最多 ${MAX_LINES} 句、每句 ${MAX_CHARS} 字）</div>
        ${lineHtml}
        <button class="add-talk-btn" type="button">＋ 新增一句</button>
      </div>
    `;

    this.root.querySelectorAll<HTMLInputElement>('input.talk').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.idx);
        this.lines[idx] = input.value;
        const counter = this.root.querySelector(`[data-count-for="${idx}"]`);
        if (counter) counter.textContent = `${input.value.length}/${MAX_CHARS}`;
        this.handler(this.value());
      });
    });

    const addBtn = this.root.querySelector('.add-talk-btn') as HTMLButtonElement;
    if (this.lines.length >= MAX_LINES) addBtn.disabled = true;
    addBtn.addEventListener('click', () => {
      if (this.lines.length >= MAX_LINES) return;
      this.lines.push('');
      if (this.lines.length >= MAX_LINES) addBtn.disabled = true;
      this.render();
      this.handler(this.value());
    });
  }

  value(): string[] {
    return this.lines.map(s => s.trim()).filter(s => s.length > 0);
  }

  onChange(h: ChangeHandler): void { this.handler = h; }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
