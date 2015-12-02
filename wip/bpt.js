export class BPTree {
  constructor(capacity, cmpFn) {
    this.capacity = capacity || 4;
    this.cmpFn = cmpFn || ((a, b) => {
      return (a < b) ? -1 : ((a > b) ? 1 : 0); // eslint-disable-line
    });
    this.n = 1;
    this.tree = { t: 'leaf', k: [], v: [], n: null };
    this.check();
  }

  repr() {
    const result = {};
    function walk(node) {
      if (node.t === 'branch') {
        const kids = node.v;
        for (let i = 0, kl = kids.length; i < kl; i++) {
          walk(kids[i]);
        }
      } else if (node.t === 'leaf') {
        for (let i = 0, nkl = node.k.length; i < nkl; i++) {
          result[node.k[i]] = node.v[i];
        }
      }
    }
    walk(this.tree);
    return result;
  }

  getRange(lowerBound, upperBound, sortDescending) {
    let result = [];

    let leaf = this.fetch(lowerBound, true);
    let index = leaf.k.indexOf(lowerBound);

    while (leaf.k[index] <= upperBound) {
      if (leaf.k[index] === upperBound) {
        result.push(leaf.v[index]);
        break;
      }
      if (leaf.k[leaf.k.length - 1] === upperBound) {
        result = result.concat(leaf.v);
        break;
      } else if (leaf.k[leaf.k.length - 1] < upperBound) {
        result = result.concat(leaf.v);
        leaf = this.fetch(leaf.n, true);
        index = 0;
      } else {
        for (let i = index; i < leaf.k.length && leaf.k[i] <= upperBound; i++) {
          result.push(leaf.k[i]);
        }
      }
    }

    if (sortDescending) {
      result.reverse();
    }

    return result;
  }

  check() {
    const CAPACITY = this.capacity;
    function checking(depth, currentNode, currentDepth, lo, hi) {
      const node = currentNode;

      if (node.k.length >= CAPACITY) throw new Error('Overflowed node capacity');

      for (let i = 0, kl = node.k.length - 1; i < kl; i++) {
        if (node.k[i] >= node.k[i + 1]) throw new Error('Disordered or duplicate key');
      }

      if (node.t === 'branch') {
        const kids = node.v;
        if (currentDepth === 0) {
          if (kids.length < 2) throw new Error('Underpopulated root');
        } else {
          if (Math.floor(CAPACITY / 2) > kids.length) throw new Error('Underpopulated branch');
        }
        if (node.k.length !== kids.length - 1) throw new Error('keys and kids don\'t correspond');
        if (lo.length && lo[0] >= node.k[0]) throw new Error('lo error');
        if (hi.length && node.k[node.k.length - 1] >= hi[0]) throw new Error('hi error');

        for (let i = 0; i < kids.length; i++) {
          const newLo = (i === 0 ? lo : [node.k[i - 1]]);
          const newHi = (i === node.k.length ? hi : [node.k[i]]);
          checking(depth, kids[i], currentDepth + 1, newLo, newHi);
        }
      } else if (node.t === 'leaf') {
        if (currentDepth !== depth) throw new Error('Leaves at different depths');
        const v = node.v;
        if (node.k.length !== v.length) throw new Error('keys and values don\'t correspond');
        if (currentDepth > 0) {
          if (Math.floor(CAPACITY / 2) > v.length) throw new Error('Underpopulated leaf');
        }
        if (lo.length && lo[0] !== node.k[0]) throw new Error('lo error (2)');
        if (hi.length && node.k[node.k.length - 1] >= hi[0]) throw new Error('hi error (2)');
      } else {
        throw new Error('Bad type');
      }
    }
    let node = this.tree;

    let depth = 0;
    while (node.t === 'branch') {
      node = node.v[0];
      depth += 1;
    }

    checking(depth, this.tree, 0, [], []);
  }

  fetch(needleKey, getLeaf) {
    let node = this.tree;

    while (node.t === 'branch') {
      let found = false;
      let i = 0;
      for (let kl = node.k.length; i < kl; i++) {
        if (node.k[i] > needleKey) {
          found = true;
          break;
        }
      }
      if (!found) {
        i = node.v.length - 1;
      }
      node = node.v[i];
    }

    let i = 0;
    for (let kl = node.k.length; i < kl; i++) {
      if (needleKey === node.k[i]) {
        if (getLeaf) {
          return node;
        }
        return node.v[i];
      } else if (node.k[i] > needleKey) {
        break; // just to finish quicker; not needed for correctness
      }
    }
    return null;
  }

  reallyStore(newKey, value) {
    const path = [];
    let node = this.tree;

    // Find the leaf node for newKey, and the path down to it.
    while (node.t === 'branch') {
      let i = 0;
      let found = false;
      for (let nkl = node.k.length; i < nkl; i++) {
        if (newKey < node.k[i]) {
          found = true;
          break;
        }
      }
      if (!found) {
        i = node.k.length;
      }
      path.push({ t: node.t, k: node.k, v: node.v, i: i });
      node = node.v[i];
    }

    // Find the index for newKey in the leaf node.
    let i = 0;
    let found = false;
    const nkl = node.k.length;
    for (; i < nkl; i++) {
      if (newKey === node.k[i]) {
        // newKey isn't actually new, so the structure goes unchanged.
        node.v[i] = value;
        return;
      } else if (newKey < node.k[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = nkl;
    }

    // We'll have to insert it in the leaf at i. If there's room, just do it:
    node.k.splice(i, 0, newKey);
    node.v.splice(i, 0, value);

    if (node.k.length < this.capacity) {
      return;
    }

    // Otherwise split the now-overpacked leaf...
    const mid = Math.floor(this.capacity / 2);
    let tween = node.k[mid];
    let left = { t: 'leaf', k: node.k.slice(0, mid), v: node.v.slice(0, mid), n: node.k[mid] };
    let right = { t: 'leaf', k: node.k.slice(mid), v: node.v.slice(mid), n: null };

    // ...and propagate the split back up the path.
    while (path.length) {
      node = path.pop();
      node.k.splice(node.i, 0, tween);
      node.v[node.i] = left;
      node.v.splice(node.i + 1, 0, right);
      if (node.k.length < this.capacity) {
        return;
      }
      tween = node.k[mid - 1];
      left = { t: 'branch', k: node.k.slice(0, mid - 1), v: node.v.slice(0, mid), n: node.k[mid] };
      right = { t: 'branch', k: node.k.slice(mid), v: node.v.slice(mid), n: null };
    }

    // If we got here, we need a new root.
    this.tree = { t: 'branch', k: [tween], v: [left, right], n: null };
  }

  store(newKey, value) {
    this.reallyStore(newKey, value);
    this.check();
  }

}
