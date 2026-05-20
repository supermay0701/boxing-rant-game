type ChangeHandler = (name: string) => void;

export class NameField {
  private handler: ChangeHandler = () => {};
  private input: HTMLInputElement;

  constructor(root: HTMLElement, initial: string) {
    root.innerHTML = `
      <div class="field-block">
        <div class="field-label">
          <span>角色命名</span>
          <span class="disclaimer">⚠ 純屬虛構搞笑，與真實世界無關</span>
        </div>
        <input class="input-mock" type="text" maxlength="10" placeholder="輸入名字（1–10 字）" />
      </div>
    `;
    this.input = root.querySelector('input')!;
    this.input.value = initial;
    this.input.addEventListener('input', () => this.handler(this.input.value));
  }

  onChange(handler: ChangeHandler): void {
    this.handler = handler;
  }

  value(): string {
    return this.input.value;
  }
}
