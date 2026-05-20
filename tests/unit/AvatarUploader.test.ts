import { describe, it, expect } from 'vitest';
import { validateImageFile } from '../../src/setup/AvatarUploader';

describe('validateImageFile', () => {
  it('rejects files > 5MB', () => {
    const f = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(f).ok).toBe(false);
  });

  it('rejects non-image files', () => {
    const f = new File(['x'], 'a.txt', { type: 'text/plain' });
    expect(validateImageFile(f).ok).toBe(false);
  });

  it('accepts small jpeg', () => {
    const f = new File([new Uint8Array(100)], 'small.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(f).ok).toBe(true);
  });

  it('accepts png and webp', () => {
    expect(validateImageFile(new File(['x'], 'a.png', { type: 'image/png' })).ok).toBe(true);
    expect(validateImageFile(new File(['x'], 'a.webp', { type: 'image/webp' })).ok).toBe(true);
  });
});
