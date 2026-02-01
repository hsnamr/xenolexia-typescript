/**
 * Unit tests for MemoryKeyValueStore (in-memory IKeyValueStore)
 */

import { memoryKeyValueStore } from '../../adapters';

describe('memoryKeyValueStore', () => {
  beforeEach(async () => {
    await memoryKeyValueStore.clear();
  });

  it('should set and get item', async () => {
    await memoryKeyValueStore.setItem('key1', 'value1');
    const value = await memoryKeyValueStore.getItem('key1');
    expect(value).toBe('value1');
  });

  it('should return null for missing key', async () => {
    const value = await memoryKeyValueStore.getItem('missing');
    expect(value).toBeNull();
  });

  it('should remove item', async () => {
    await memoryKeyValueStore.setItem('key1', 'value1');
    await memoryKeyValueStore.removeItem('key1');
    const value = await memoryKeyValueStore.getItem('key1');
    expect(value).toBeNull();
  });

  it('should clear all items', async () => {
    await memoryKeyValueStore.setItem('a', '1');
    await memoryKeyValueStore.setItem('b', '2');
    await memoryKeyValueStore.clear();
    expect(await memoryKeyValueStore.getItem('a')).toBeNull();
    expect(await memoryKeyValueStore.getItem('b')).toBeNull();
  });

  it('should return all keys from getAllKeys', async () => {
    await memoryKeyValueStore.setItem('k1', 'v1');
    await memoryKeyValueStore.setItem('k2', 'v2');
    const keys = await memoryKeyValueStore.getAllKeys!();
    expect(keys).toContain('k1');
    expect(keys).toContain('k2');
    expect(keys.length).toBe(2);
  });

  it('should support multiGet', async () => {
    await memoryKeyValueStore.setItem('a', '1');
    await memoryKeyValueStore.setItem('b', '2');
    const pairs = await memoryKeyValueStore.multiGet!(['a', 'b', 'c']);
    expect(pairs).toEqual([
      ['a', '1'],
      ['b', '2'],
      ['c', null],
    ]);
  });

  it('should support multiRemove', async () => {
    await memoryKeyValueStore.setItem('a', '1');
    await memoryKeyValueStore.setItem('b', '2');
    await memoryKeyValueStore.multiRemove!(['a']);
    expect(await memoryKeyValueStore.getItem('a')).toBeNull();
    expect(await memoryKeyValueStore.getItem('b')).toBe('2');
  });
});
