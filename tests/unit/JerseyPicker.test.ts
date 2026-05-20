import { describe, it, expect, vi } from 'vitest';
import { JerseyPicker } from '../../src/setup/JerseyPicker';
import { JERSEY_PRESETS } from '../../src/setup/jerseyPresets';

describe('JerseyPicker', () => {
  it('renders 6 preset swatches + 1 upload button', () => {
    const root = document.createElement('div');
    new JerseyPicker(root);
    expect(root.querySelectorAll('.preset-thumb').length).toBe(6);
    expect(root.querySelectorAll('.upload-jersey').length).toBe(1);
  });

  it('first preset selected by default', () => {
    const root = document.createElement('div');
    const p = new JerseyPicker(root);
    expect(p.value()).toEqual({ type: 'preset', primary: JERSEY_PRESETS[0].primary, secondary: JERSEY_PRESETS[0].secondary });
  });

  it('clicking a swatch updates value and emits change', () => {
    const root = document.createElement('div');
    const p = new JerseyPicker(root);
    const handler = vi.fn();
    p.onChange(handler);
    const thumbs = root.querySelectorAll('.preset-thumb');
    (thumbs[2] as HTMLElement).click();
    expect(handler).toHaveBeenCalledWith({ type: 'preset', primary: JERSEY_PRESETS[2].primary, secondary: JERSEY_PRESETS[2].secondary });
  });
});
