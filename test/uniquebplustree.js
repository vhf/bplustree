/* eslint-env node, mocha */
const BPlusTree = require('../lib/uniquebplustree');
const assert = require('assert');

const setup = (n) => {
  const tree = new BPlusTree({ order: 4, debug: true });
  const data = [[1, 'z'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e'], [6, 'f'], [7, 'g'], [8, 'h'], [10, 'm'], [11, 'n'], [12, 'p']];
  for (let i = 0; i < ((n || n > data.length ? data.length : n) || data.length); i++) {
    tree.store(data[i][0], data[i][1]);
  }
  return tree;
};

describe('Unique BPlusTree', () => {
  it('should be created', () => {
    const tree = new BPlusTree({ debug: true });
    assert.equal(tree.order, 4);
    assert.equal(tree.tree.k.length, 0);
    assert.equal(tree.tree.v.length, 0);
  });

  it('should insert and rebalance', () => {
    const tree = new BPlusTree({ order: 4, debug: true });
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
  });

  it('should update values', () => {
    const tree = setup();
    tree.store(4, 'zz');
    assert.equal(tree.fetch(4), 'zz');
  });

  it('should fetch', () => {
    const tree = setup();
    assert.equal(tree.fetch(1), 'z');
    assert.equal(tree.fetch(3), 'c');
    assert.equal(tree.fetch(4), 'd');
    assert.equal(tree.fetch(5), 'e');
    assert.equal(tree.fetch(6), 'f');
    assert.equal(tree.fetch(7), 'g');
    assert.equal(tree.fetch(300), false);
    assert.equal(tree.fetch(8), 'h');
    assert.equal(tree.fetch(10), 'm');
    assert.equal(tree.fetch(11), 'n');
    assert.equal(tree.fetch(12), 'p');
    assert.deepEqual(tree.fetch(12, { getLeaf: true }), { t: 'leaf', k: [ 10, 11, 12 ], v: [ 'm', 'n', 'p' ], n: null });
    assert.deepEqual(tree.fetch(12, { getLeaf: true, root: tree.fetch(11, { getLeaf: true }) }), { t: 'leaf', k: [ 10, 11, 12 ], v: [ 'm', 'n', 'p' ], n: null });
  });

  it('should range', () => {
    let tree = new BPlusTree({ order: 4, debug: true });
    tree.store(4, 'a');
    // assert.deepEqual(tree.fetchRange(1, 5), ['a']);
    assert.deepEqual(tree.fetchRange(4, 4), ['a']);

    tree = setup();
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
    assert.deepEqual(tree.fetchRange(1, 5), ['z', 'b', 'c', 'd', 'e']);
    assert.deepEqual(tree.fetchRange(2, 5), ['b', 'c', 'd', 'e']);
    assert.deepEqual(tree.fetchRange(1, 4, { descending: true }), ['z', 'b', 'c', 'd'].reverse());
  });

  it('should check', () => {
    const tree = setup();
    assert(tree.check());
  });

  it('should repr', () => {
    const tree = setup();
    assert.deepEqual(tree.repr(), { '1': 'z', '2': 'b', '3': 'c', '4': 'd', '5': 'e', '6': 'f', '7': 'g', '8': 'h', '10': 'm', '11': 'n', '12': 'p' });
  });

  it('should remove val', function testWithTimeout() {
    this.timeout(60000);
    let tree = setup();
    assert.equal(tree.remove(100), false);
    tree = setup(3);
    assert.equal(tree.remove(2), 'b');
    tree = setup(4);
    assert.equal(tree.remove(4), 'd');
    tree = setup();
    const vals = [7, 3, 11, 4, 1, 10, 8, 6, 2, 5, 12];
    for (let i = 0; i < vals.length; i++) {
      tree.remove(vals[i]);
    }
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
      do {
        k = r(N);
      } while (keys.indexOf(k) > -1);
      keys.push(k);
      tree.store(k, v);
    }
    keys = keys.reverse();
    for (let i = 0; i < N; i++) {
      const ck = keys[i];
      assert.equal(tree.fetch(ck), tree.remove(ck));
    }
    assert.deepEqual(tree.tree, { t: 'leaf', k: [], v: [], n: null });
  });
});
