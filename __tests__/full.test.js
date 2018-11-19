const BPlusTree = require('../lib/bplustree');

const magic = 524500 * 2;
const tree = new BPlusTree({ order: 4 });

describe('Big BPlusTree', () => {
  beforeAll(() => {
    // nocheck for speedup
    for (let i = 0; i < magic; i++) {
      tree.store(i, 0);
    }
  });

  test('should have the correct depth', () => {
    expect(tree.depth()).toBe(19);
  });
});
tree.remove(524499);
