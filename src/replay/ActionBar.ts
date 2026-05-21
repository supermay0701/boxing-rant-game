export interface ActionHandlers {
  onNew: () => void;
  onRematch: () => void;
  onSwap: () => void;
}

export class ActionBar {
  constructor(private root: HTMLElement) {}

  render(handlers: ActionHandlers): void {
    this.root.innerHTML = `
      <div class="action-row">
        <button class="action-new">🆕 再戰一場</button>
        <button class="action-rematch">↻ 重打上一位</button>
        <button class="action-swap">🔄 角色互換</button>
      </div>
    `;
    (this.root.querySelector('.action-new') as HTMLElement).addEventListener('click', handlers.onNew);
    (this.root.querySelector('.action-rematch') as HTMLElement).addEventListener('click', handlers.onRematch);
    (this.root.querySelector('.action-swap') as HTMLElement).addEventListener('click', handlers.onSwap);
  }
}
