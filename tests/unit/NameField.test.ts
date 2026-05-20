import { describe, it, expect, vi } from 'vitest';
import { NameField } from '../../src/setup/NameField';

describe('NameField', () => {
  it('renders input with placeholder', () => {
    const root = document.createElement('div');
    new NameField(root, '小明');
    expect(root.querySelector('input')).not.toBeNull();
    expect((root.querySelector('input') as HTMLInputElement).value).toBe('小明');
  });

  it('emits change on input', () => {
    const root = document.createElement('div');
    const onChange = vi.fn();
    const f = new NameField(root, '');
    f.onChange(onChange);
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = '阿德';
    input.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledWith('阿德');
  });

  it('truncates input to 10 chars', () => {
    const root = document.createElement('div');
    new NameField(root, '');
    const input = root.querySelector('input') as HTMLInputElement;
    expect(input.maxLength).toBe(10);
  });

  it('renders disclaimer badge', () => {
    const root = document.createElement('div');
    new NameField(root, '');
    expect(root.textContent).toContain('純屬虛構');
  });
});
