const BPlusTree = require('../lib/bplustree');

const magic = 524500 * 2;

// nocheck for speedup
const tree = new BPlusTree({ order: 4 });
for (let i = 0; i < magic; i++) {
  tree.store(i, 0);
}

tree.remove(524499);
