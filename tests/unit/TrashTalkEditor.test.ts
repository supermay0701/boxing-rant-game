import { describe, it, expect, vi } from 'vitest';
import { TrashTalkEditor } from '../../src/setup/TrashTalkEditor';

describe('TrashTalkEditor', () => {
  it('starts with one empty line', () => {
    const root = document.createElement('div');
    new TrashTalkEditor(root, []);
    expect(root.querySelectorAll('input.talk').length).toBe(1);
  });

  it('add button creates new line up to 5', () => {
    const root = document.createElement('div');
    new TrashTalkEditor(root, []);
    const add = root.querySelector('.add-talk-btn') as HTMLButtonElement;
    add.click(); add.click(); add.click(); add.click();
    expect(root.querySelectorAll('input.talk').length).toBe(5);
    expect(add.disabled).toBe(true);
  });

  it('input caps at 15 chars via maxlength', () => {
    const root = document.createElement('div');
    new TrashTalkEditor(root, []);
    const input = root.querySelector('input.talk') as HTMLInputElement;
    expect(input.maxLength).toBe(15);
  });

  it('value() returns non-empty trimmed talks', () => {
    const root = document.createElement('div');
    const e = new TrashTalkEditor(root, ['雷包', '', '罰球不進  ']);
    expect(e.value()).toEqual(['雷包', '罰球不進']);
  });

  it('emits change when input fires', () => {
    const root = document.createElement('div');
    const e = new TrashTalkEditor(root, ['初始']);
    const handler = vi.fn();
    e.onChange(handler);
    const input = root.querySelector('input.talk') as HTMLInputElement;
    input.value = '改了';
    input.dispatchEvent(new Event('input'));
    expect(handler).toHaveBeenCalledWith(['改了']);
  });
});
