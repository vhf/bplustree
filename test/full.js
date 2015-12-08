const BPlusTree = require('../lib/bplustree');
const UniqueBPlusTree = require('../lib/uniquebplustree');

const magic = 524500 * 2;

// nocheck for speedup
let tree = new BPlusTree(4);
for (let i = 0; i < magic; i++) {
  tree.store(i, 0);
}
while (tree.numKeys) {
  tree.remove(524499);
}

// nocheck for speedup
tree = new UniqueBPlusTree(4);
for (let i = 0; i < magic; i++) {
  tree.store(i, 0);
}
while (tree.numKeys) {
  tree.remove(524499);
}
