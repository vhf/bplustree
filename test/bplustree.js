/* eslint-env node, mocha */
const BPlusTree = require('../lib/bplustree');
const assert = require('assert');
import {log} from '../utils/log';

const setup = (n) => {
  const tree = new BPlusTree({ order: 4, debug: true });
  const data = [[1, 'z'], [2, 'b'], [3, 'c'], [3, 'c2'], [4, 'd'], [5, 'e'], [6, 'f'], [7, 'g'], [8, 'h'], [10, 'm'], [11, 'n'], [12, 'p']];
  for (let i = 0; i < ((n || n > data.length ? data.length : n) || data.length); i++) {
    tree.store(data[i][0], data[i][1]);
  }
  return tree;
};

describe('BPlusTree', () => {
  it('should be created', () => {
    const tree = new BPlusTree({ debug: true });
    assert.equal(tree.order, 4);
    assert.equal(tree.tree.k.length, 0);
    assert.equal(tree.tree.v.length, 0);
  });

  it('should insert and rebalance', () => {
    const tree = new BPlusTree({ order: 4, debug: true });
    let e = {};
    e = { t: 'leaf', k: [ 1 ], v: [ ['a'] ], n: null };
    tree.store(1, 'a');
    assert.deepEqual(tree.tree, e);
    e = { t: 'leaf', k: [ 1, 2 ], v: [ ['a'], ['b'] ], n: null };
    tree.store(2, 'b');
    assert.deepEqual(tree.tree, e);
    e = { t: 'leaf', k: [ 1, 2, 3 ], v: [ ['a'], ['b'], ['c'] ], n: null };
    tree.store(3, 'c');
    assert.deepEqual(tree.tree, e);
    e = { t: 'branch',
          k: [ 3 ],
          v:
           [ { t: 'leaf', k: [ 1, 2 ], v: [ ['a'], ['b'] ], n: 3 },
             { t: 'leaf', k: [ 3, 4 ], v: [ ['c'], ['d'] ], n: null } ],
          n: null };
    tree.store(4, 'd');
    assert.deepEqual(tree.tree, e);
  });

  it('should update values', () => {
    const tree = setup();
    tree.store(4, 'zz');
    assert.deepEqual(tree.fetch(4), ['d', 'zz']);
  });

  it('should fetch', () => {
    const tree = setup();
    assert.deepEqual(tree.fetch(1), ['z']);
    assert.deepEqual(tree.fetch(3), ['c', 'c2']);
    assert.deepEqual(tree.fetch(4), ['d']);
    assert.deepEqual(tree.fetch(5), ['e']);
    assert.deepEqual(tree.fetch(6), ['f']);
    assert.deepEqual(tree.fetch(7), ['g']);
    assert.equal(tree.fetch(300), false);
    assert.deepEqual(tree.fetch(8), ['h']);
    assert.deepEqual(tree.fetch(10), ['m']);
    assert.deepEqual(tree.fetch(11), ['n']);
    assert.deepEqual(tree.fetch(12), ['p']);
    assert.deepEqual(tree.fetch(12, { getLeaf: true }), { t: 'leaf', k: [ 10, 11, 12 ], v: [ ['m'], ['n'], ['p'] ], n: null });
    assert.deepEqual(tree.fetch(12, { getLeaf: true, root: tree.fetch(11, { getLeaf: true }) }), { t: 'leaf', k: [ 10, 11, 12 ], v: [ ['m'], ['n'], ['p'] ], n: null });
  });

  it('should range', () => {
    let tree = new BPlusTree({ order: 4, debug: true });
    tree.store(4, 'a');
    tree.store(4, 'a');
    tree.store(4, 'b');
    // assert.deepEqual(tree.fetchRange(1, 5), ['a']);
    assert.deepEqual(tree.fetchRange(4, 4), ['a', 'a', 'b']);

    tree = setup();
    assert.deepEqual(tree.fetchRange(2, 2), ['b']);
    assert.deepEqual(tree.fetchRange(4, 4), ['d']);
    assert.deepEqual(tree.fetchRange(4, -4), []);
    assert.deepEqual(tree.fetchRange(50, 50), []);
    assert.deepEqual(tree.fetchRange(50, -50), []);
    assert.deepEqual(tree.fetchRange(1, 2), ['z', 'b']);
    assert.deepEqual(tree.fetchRange(2, 3), ['b', 'c', 'c2']);
    assert.deepEqual(tree.fetchRange(1, 3), ['z', 'b', 'c', 'c2']);
    assert.deepEqual(tree.fetchRange(2, 4), ['b', 'c', 'c2', 'd']);
    assert.deepEqual(tree.fetchRange(1, 4), ['z', 'b', 'c', 'c2', 'd']);
    assert.deepEqual(tree.fetchRange(1, 5), ['z', 'b', 'c', 'c2', 'd', 'e']);
    assert.deepEqual(tree.fetchRange(2, 5), ['b', 'c', 'c2', 'd', 'e']);
    assert.deepEqual(tree.fetchRange(1, 4, { descending: true }), ['z', 'b', 'c', 'c2', 'd'].reverse());
  });

  it('should check', () => {
    const tree = setup();
    assert(tree.check());
  });

  it('should repr', () => {
    const tree = setup();
    assert.deepEqual(tree.repr(), { '1': ['z'], '2': ['b'], '3': ['c', 'c2'], '4': ['d'], '5': ['e'], '6': ['f'], '7': ['g'], '8': ['h'], '10': ['m'], '11': ['n'], '12': ['p'] });
  });

  it('should remove val', function testWithTimeout() {
    this.timeout(60000);
    let tree = setup();
    assert.equal(tree.remove(100), false);
    assert.equal(tree.remove(1, 'd'), false);
    assert.equal(tree.remove(3, 'd'), false);
    assert.equal(tree.remove(3), false);
    tree = setup(3);
    assert.equal(tree.remove(2), 'b');
    tree = setup(4);
    assert.equal(tree.remove(4), 'd');
    assert.equal(tree.remove(3, 'c'), 'c');
    tree.store(3, 'c');
    assert.equal(tree.remove(3, 'c2'), 'c2');
    tree = setup();
    const vals = [7, 11, 4, 1, 10, 8, 6, 2, 5, 12];
    for (let i = 0; i < vals.length; i++) {
      tree.remove(vals[i]);
    }
    tree.remove(3, 'c2');
    tree.remove(3, 'c');
    assert.deepEqual(tree.tree, { t: 'leaf', k: [], v: [], n: null });

    const r = (n) => Math.floor(Math.random() * n) + 1;
    const N = r(1000);
    const order = Math.floor(r(Math.floor(r(150) / 3)) * 2) + 2;
    let keys = [];
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    tree = new BPlusTree({ order: order, debug: true });
    for (let i = 0; i < N; i++) {
      let k;
      const v = alpha[r(alpha.length) - 1] + alpha[r(alpha.length) - 1] + alpha[r(alpha.length) - 1];
      k = r(N);
      keys.push(k);
      tree.store(k, v);
    }
    keys = keys.reverse();
    for (let i = 0; i < N; i++) {
      const ck = keys[i];
      const values = tree.fetch(ck);
      let valCount = values.length;
      // assert(valCount > 0);
      if (valCount === 1) {
        tree.remove(ck);
      } else {
        valCount--;
        while (valCount >= 0) {
          tree.remove(ck, values[valCount]);
          valCount--;
        }
      }
    }
    assert.deepEqual(tree.tree, { t: 'leaf', k: [], v: [], n: null });
  });
});
