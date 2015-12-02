const util = require('util');
import {BPTree} from './bpt';

const log = function(obj) {
  console.log(util.inspect(obj, false, null));
};

function test(expected, actual) {
  function deepEqual(x, y) {
    return (x && y && typeof x === 'object' && typeof y === 'object') ?
      (Object.keys(x).length === Object.keys(y).length) &&
        Object.keys(x).reduce(function eq(isEqual, key) {
          return isEqual && deepEqual(x[key], y[key]);
        }, true) : (x === y);
  }
  if (!deepEqual(expected, actual)) {
    console.log(expected, ' !== ', actual);
  } else {
    // console.log(typeof expected === 'object' ? '{...}' : expected, ' === ', typeof actual === 'object' ? '{...}' : actual);
  }
}

const tests = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12];

function run() {
  const tree = new BPTree(4);
  tree.store(1, 'a'); log(tree.tree);
  tree.store(2, 'b'); log(tree.tree);
  tree.store(3, 'c'); log(tree.tree);
  tree.store(4, 'd'); log(tree.tree);
  tree.store(5, 'e'); log(tree.tree);
  tree.store(6, 'f'); log(tree.tree);
  tree.store(7, 'g'); log(tree.tree);
  tree.store(8, 'h'); log(tree.tree);
  tree.store(10, 'm'); log(tree.tree);
  tree.store(11, 'n'); log(tree.tree);
  tree.store(12, 'p'); log(tree.tree);

  test(['a', 'b'], tree.getRange(1, 2));
  test(['c', 'd', 'e', 'f', 'g', 'h', 'm'], tree.getRange(3, 10));

  let result = '';
  for (let i = 0, tl = tests.length; i < tl; i++) {
    result += tree.fetch(tests[i]);
  }
  // log(tree.repr());
  return result;
}

run();
// if (test() !== 'abcdefghmnp') {
//   throw new Error('failed');
// }
