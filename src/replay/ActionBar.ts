export interface ActionHandlers {
  onNew: () => void;
  onRematch: () => void;
}

export class ActionBar {
  constructor(private root: HTMLElement) {}

  render(handlers: ActionHandlers): void {
    this.root.innerHTML = `
      <div class="action-row">
        <button class="action-new">🆕 再戰一場</button>
        <button class="action-rematch">↻ 重打上一位</button>
      </div>
    `;
    (this.root.querySelector('.action-new') as HTMLElement).addEventListener('click', handlers.onNew);
    (this.root.querySelector('.action-rematch') as HTMLElement).addEventListener('click', handlers.onRematch);
  }
}
