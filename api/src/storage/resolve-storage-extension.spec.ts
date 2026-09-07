import { describe, expect, test } from 'bun:test';
import { resolveStorageExtension } from './resolve-storage-extension';

describe('resolveStorageExtension', () => {
  test('maps PDF contracts to .pdf (not .bin)', () => {
    expect(resolveStorageExtension('application/pdf')).toBe('pdf');
  });

  test('maps common image types', () => {
    expect(resolveStorageExtension('image/jpeg')).toBe('jpg');
    expect(resolveStorageExtension('image/jpg')).toBe('jpg');
    expect(resolveStorageExtension('image/png')).toBe('png');
    expect(resolveStorageExtension('image/webp')).toBe('webp');
    expect(resolveStorageExtension('image/gif')).toBe('gif');
  });

  test('falls back to bin for unknown types', () => {
    expect(resolveStorageExtension(undefined)).toBe('bin');
    expect(resolveStorageExtension('application/octet-stream')).toBe('bin');
  });
});
