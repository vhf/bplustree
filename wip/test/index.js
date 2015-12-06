/* eslint-env node, mocha */
import {BPTree} from '../lib/bpt';
const assert = require('assert');
const util = require('util');

const log = (obj) => {
  console.log(util.inspect(obj, false, null));
};

const setup = () => {
  const tree = new BPTree(4);
  tree.store(1, 'z');
  tree.store(2, 'b');
  tree.store(3, 'c');
  tree.store(4, 'd');
  tree.store(5, 'e');
  tree.store(6, 'f');
  tree.store(7, 'g');
  tree.store(8, 'h');
  tree.store(10, 'm');
  tree.store(11, 'n');
  tree.store(12, 'p');
  return tree;
};

let tree = new BPTree(4);

describe('BPTree', () => {
  it('should be created empty', () => {
    assert.equal(tree.tree.k.length, 0);
    assert.equal(tree.tree.v.length, 0);
  });

  it('should insert and rebalance', () => {
    let e = {};
    e = { t: 'leaf', k: [ 1 ], v: [ 'a' ], n: null };
    tree.store(1, 'a');
    assert.deepEqual(tree.tree, e);
    e = { t: 'leaf', k: [ 1, 2 ], v: [ 'a', 'b' ], n: null };
    tree.store(2, 'b');
    assert.deepEqual(tree.tree, e);
    e = { t: 'leaf', k: [ 1, 2, 3 ], v: [ 'a', 'b', 'c' ], n: null };
    tree.store(3, 'c');
    assert.deepEqual(tree.tree, e);
    e = { t: 'branch',
          k: [ 3 ],
          v:
           [ { t: 'leaf', k: [ 1, 2 ], v: [ 'a', 'b' ], n: 3 },
             { t: 'leaf', k: [ 3, 4 ], v: [ 'c', 'd' ], n: null } ],
          n: null };
    tree.store(4, 'd');
    assert.deepEqual(tree.tree, e);
    tree = setup();
    tree.check();
  });

  it('should fetch', () => {
    tree = setup();
    assert.equal(tree.fetch(1), 'z');
    assert.equal(tree.fetch(3), 'c');
    assert.equal(tree.fetch(4), 'd');
    assert.equal(tree.fetch(5), 'e');
    assert.equal(tree.fetch(6), 'f');
    assert.equal(tree.fetch(7), 'g');
    assert.equal(tree.fetch(8), 'h');
    assert.equal(tree.fetch(10), 'm');
    assert.equal(tree.fetch(11), 'n');
    assert.equal(tree.fetch(12), 'p');
    assert.deepEqual(tree.fetch(12, true), { t: 'leaf', k: [ 10, 11, 12 ], v: [ 'm', 'n', 'p' ], n: null });
    assert.deepEqual(tree.fetch(12, tree.fetch(11, true)), { t: 'leaf', k: [ 10, 11, 12 ], v: [ 'm', 'n', 'p' ], n: null });
  });

  it('should range', () => {
    assert.deepEqual(tree.fetchRange(2, 2), ['b']);
    assert.deepEqual(tree.fetchRange(4, 4), ['d']);
    assert.deepEqual(tree.fetchRange(4, -4), []);
    assert.deepEqual(tree.fetchRange(50, 50), []);
    assert.deepEqual(tree.fetchRange(50, -50), []);
    assert.deepEqual(tree.fetchRange(1, 2), ['z', 'b']);
    assert.deepEqual(tree.fetchRange(2, 3), ['b', 'c']);
    assert.deepEqual(tree.fetchRange(1, 3), ['z', 'b', 'c']);
    assert.deepEqual(tree.fetchRange(2, 4), ['b', 'c', 'd']);
    assert.deepEqual(tree.fetchRange(1, 4), ['z', 'b', 'c', 'd']);
    assert.deepEqual(tree.fetchRange(1, 4, true), ['z', 'b', 'c', 'd'].reverse());
  });

  it('should check', () => {
    assert(tree.check());
  });

  it('should repr', () => {
    assert.deepEqual(tree.repr(), { '1': 'z', '2': 'b', '3': 'c', '4': 'd', '5': 'e', '6': 'f', '7': 'g', '8': 'h', '10': 'm', '11': 'n', '12': 'p' });
  });

  it('should remove val', () => {
    const vals = [7, 3, 11, 4, 1, 10, 8, 6, 2, 5, 12];
    for (let i = 0; i < vals.length; i++) {
      tree.remove(vals[i]);
    }
  });
});
