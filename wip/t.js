import {BPTree} from './lib/bpt';
const util = require('util');

const log = (...obj) => {
  const result = [];
  for (let i = 0; i < obj.length; i++) {
    if (typeof obj[i] === 'string') {
      result.push(obj[i]);
    } else {
      result.push(util.inspect(obj[i], false, null));
    }
  }
  console.log(...result);
};

const setup = () => {
  const tree = new BPTree(4);
  tree.store(1, 'a');
  tree.store(2, 'b');
  tree.store(3, 'c');
  // log(tree.tree);
  tree.store(4, 'd');
  tree.store(5, 'e');
  tree.store(6, 'f');
  // log(tree.tree);
  tree.store(7, 'g');
  tree.store(8, 'h');
  tree.store(9, 'i');
  // log(tree.tree);
  tree.store(10, 'j');
  tree.store(11, 'k');
  return tree;
};

const tree = setup();
log('tree:', tree.tree);

log('r7');
tree._remove(7);
log('tree:', tree.tree);

// log('r2');
// tree._remove(2);
// tree.check();
// log(tree.tree);

// log('r1');
// tree._remove(1);
// tree.check();
// log(tree.tree);

// log('r3');
// tree._remove(3);
// tree.check();
// log(tree.tree);
