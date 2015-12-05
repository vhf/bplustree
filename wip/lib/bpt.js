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

export class BPTree {
  constructor(order, cmpFn) {
    this.order = order || 4;
    this.minKeys = Math.ceil(order / 2);
    this.maxKeys = order - 1;
    this.numKeys = 0;

    this.cmpFn = cmpFn || ((a, b) => {
      return (a < b) ? -1 : ((a > b) ? 1 : 0); // eslint-disable-line
    });

    this.tree = { t: 'leaf', k: [], v: [], n: null };
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

  fetchRange(lowerBound, upperBound, sortDescending) {
    let result = [];

    let leaf = this.fetch(lowerBound, true);
    if (!leaf) {
      return [];
    }

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
        result = result.concat(leaf.v.slice(index));
        leaf = this.fetch(leaf.n, true);
        index = 0;
      } else {
        let i = index;
        for (; i < leaf.k.length && leaf.k[i] <= upperBound; i++);
        result = result.concat(leaf.k.slice(0, i));
        break;
      }
    }

    if (sortDescending) {
      result.reverse();
    }

    return result;
  }

  check(node) {
    const ORDER = this.order;
    const MINKEYS = this.minKeys;
    const MAXKEYS = this.maxKeys;
    function checking(depth, currentNode, currentDepth, lo, hi) {
      const node = currentNode;

      if (node.k.length >= ORDER) { log('a', node); throw new Error('Overflowed node'); }

      for (let i = 0, kl = node.k.length - 1; i < kl; i++) {
        if (node.k[i] >= node.k[i + 1]) { log('a', node); throw new Error('Disordered or duplicate key'); }
      }

      if (!lo.length && lo[0] > node.k[0]) throw new Error('lo error');
      if (!hi.length && node.k[-1] >= hi[0]) throw new Error('hi error');

      if (node.t === 'branch') {
        const kids = node.v;
        if (currentDepth === 0) {
          if (kids.length < 2) { log('b', node); throw new Error('Underpopulated root'); }
          if (kids.length > MAXKEYS) { log('c', `(${kids.length} > ${MAXKEYS})`, node); throw new Error('Overpopulated root'); }
        } else {
          if (kids.length < MINKEYS) { log('d', node); throw new Error('Underpopulated branch'); }
          if (kids.length > MAXKEYS) { log('e', node); throw new Error('Overpopulated branch'); }
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
          if (MINKEYS > v.length) { log('f', node); throw new Error('Underpopulated leaf');}
        }
        if (lo.length && lo[0] !== node.k[0]) throw new Error('lo error (2)');
        if (hi.length && node.k[node.k.length - 1] >= hi[0]) throw new Error('hi error (2)');
      } else {
        throw new Error('Bad type');
      }
      return true;
    }

    let tree = node || this.tree;

    let depth = 0;
    while (tree.t === 'branch') {
      tree = tree.v[0];
      depth += 1;
    }

    return checking(depth, node || this.tree, 0, [], []);
  }

  fetch(needleKey, getLeaf, root, location) {
    let node = root || this.tree;

    let index;
    const path = [];
    while (node.t === 'branch') {
      index = 0;
      let found = false;
      for (let kl = node.k.length; index < kl; index++) {
        if (node.k[index] > needleKey) {
          found = true;
          break;
        }
      }
      if (!found) {
        index = node.v.length - 1;
      }
      node = node.v[index];
      path.push(index);
    }

    for (let j = 0, kl = node.k.length; j < kl; j++) {
      if (needleKey === node.k[j]) {
        if (location) {
          return { node: getLeaf ? node : node.v[j], path };
        }
        if (getLeaf) {
          return node;
        }
        return node.v[j];
      } else if (node.k[j] > needleKey) {
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
    this.numKeys += 1;

    if (node.k.length < this.order) {
      return;
    }

    // Otherwise split the now-overpacked leaf...
    const mid = Math.floor(this.order / 2);
    let tween = node.k[mid];
    let left = { t: 'leaf', k: node.k.slice(0, mid), v: node.v.slice(0, mid), n: node.k[mid] };
    let right = { t: 'leaf', k: node.k.slice(mid), v: node.v.slice(mid), n: null };

    // ...and propagate the split back up the path.
    while (path.length) {
      node = path.pop();
      node.k.splice(node.i, 0, tween);
      node.v[node.i] = left;
      node.v.splice(node.i + 1, 0, right);
      if (node.k.length < this.order - 1) {
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

  set(path, value) {
    let index = -1;
    const length = path.length;
    const lastIndex = length - 1;
    let nested = this.tree;

    while (nested && ++index < length) {
      const currentKey = path[index];
      let newValue = value;
      if (index !== lastIndex) {
        newValue = nested[currentKey];
      }
      if (newValue) {
        nested[currentKey] = newValue;
      }
      nested = nested[currentKey];
    }
  }

  get(path, node) {
    let object = node || this.tree;
    let index = 0;
    const length = path.length;

    while (object && index < length) {
      object = object.v[path[index++]];
    }
    return object;
  }

  pathToChildPath(path) {
    return path.map((p) => ['v', p]).reduce((a, b) => a.concat(b));
  }

  _removeKey(key) {
    const fetched = this.fetch(key, true, null, true);

    if (!fetched) {
      return false;
    }

    const index = fetched.node.k.indexOf(key);
    if (index !== -1) {
      fetched.node.k.splice(index, 1);
      fetched.node.v.splice(index, 1);
    }
    this.set(fetched.path, fetched.node);

    this.numKeys--;
    return { leaf: fetched.node, path: fetched.path };
  }

  _remove(key) {
    /*
    1. get leaf for key
    2. remove key from leaf
      1. if key in branch.k, replace it with new smallest key in leaf
      2. if leaf is at least half full, finish
      3. else borrow
        1. if rightSibling is more than half full, borrow leftmost value
        2. if leftSibling is more than half full, borrow rightmost value
        3. update branch.k
    */

    // 1, 2
    const removed = this._removeKey(key);
    const leaf = removed.leaf;
    const path = removed.path;

    // 2.1
    const parentPath = path.slice(0, path.length - 1);
    let parent = this.get(parentPath);
    let index = parent.k.indexOf(key);

    if (index !== -1) {
      this.set(this.pathToChildPath(parentPath).concat(['k', index]), leaf.k[0]);
    }

    // 2.2
    if (leaf.k.length >= this.minKeys) {
      return true;
    }

    const leafIndex = path[path.length - 1];

    // 2.3.1
    let canBorrowRight = false;
    // if current leaf has a right sibling
    if (leafIndex < parent.v.length - 1) {
      const rightSibling = parent.v[leafIndex + 1];
      if (rightSibling && rightSibling.k.length > this.minKeys) {
        // can borrow from right because it's more than half full
        canBorrowRight = true;
        const keyToBorrow = rightSibling.k.shift();
        const valBorrowed = rightSibling.v.shift();
        leaf.k.push(keyToBorrow);
        leaf.v.push(valBorrowed);
        leaf.n = rightSibling.k[0];
        const parentKeys = [];
        for (let i = parent.v.length - 2; i >= 0; i--) {
          const k = parent.v[i + 1].k[0];
          parent.v[i].n = k;
          parentKeys.unshift(k);
        }
        parent.k = parentKeys;
        parent.v[leafIndex] = leaf;
        parent.v[leafIndex + 1] = rightSibling;
      }
    }

    // 2.3.2
    let canBorrowLeft = false;
    if (leafIndex > 0) {
      const leftSibling = parent.v[leafIndex - 1];
      if (leftSibling && leftSibling.k.length > this.minKeys) {
        // can borrow from left because it's more than half full
        canBorrowLeft = true;
        leftSibling.k.pop();
        leftSibling.v.pop();
        const parentKeys = [];
        for (let i = parent.v.length - 2; i >= 0; i--) {
          const k = parent.v[i + 1].k[0];
          parent.v[i].n = k;
          parentKeys.unshift(k);
        }
        parent.k = parentKeys;
        parent.v[leafIndex] = leaf;
        parent.v[leafIndex - 1] = leftSibling;
      }
    }

    // 2.3.3 ??
    if (!canBorrowRight && !canBorrowLeft) {
      index = path[path.length - 1];
      let recurse = index !== undefined;
      while (recurse) {
        index = path.pop() || 0;
        if (parent.v[index - 1]) {
          // merging with left, deleting sibling
          parent.v[index] = this._mergeLeft(parent.v[index - 1], parent.v[index]);
          parent.v.splice(index, 1);
        } else if (parent.v[index + 1]) {
          // merging with right, deleting sibling
          parent.v[index] = this._mergeRight(parent.v[index + 1], parent.v[index]);
          parent.v.splice(index + 1, 1);
          const slice = parent.v.slice(1);
          if (slice.length) {
            parent.k = slice.map((n) => n.k[0]);
          }
        }
        parent = this.get(path);
        while (path.length && index < parent.v.length && parent.v[index].v[0].t !== 'branch') {
          path.pop();
          parent = this.get(path);
        }

        // underpopulated root
        if (this.tree.v.length < 2) {
          // need to split
          if (this.tree.v[index].v.length > this.maxKeys) {
            const mid = this.minKeys;
            const leftContent = this.tree.v[index].v.slice(0, mid);
            const rightContent = this.tree.v[index].v.slice(mid);
            const left = {t: 'branch', k: [leftContent[leftContent.length - 1].k[0]], v: leftContent};
            const right = {t: 'branch', k: [rightContent[rightContent.length - 1].k[0]], v: rightContent};
            this.tree.t = 'branch';
            this.tree.n = null;
            this.tree.k = [right.v[0].k[0]];
            this.tree.v = [left, right];
          } else { // need to hoist
            this.tree.t = 'leaf';
            this.tree = this.tree.v[index];
            const slice = this.tree.v.slice(1);
            if (slice.length && slice[0].t) {
              this.tree.k = slice.map((n) => n.k[0]);
            }
          }
        }
        if (index === undefined) {
          recurse = false;
          break;
        }
        recurse = false;
        for (let i = 0; i < parent.v.length; i++) {
          if (parent.v[i].v.length < this.minKeys) {
            recurse = true;
          }
        }
      }
    }
  }

  _mergeLeft(dest, src) {
    dest.k = dest.k.concat(src.k);
    dest.v = dest.v.concat(src.v);
    dest.n = src.n;
    return dest;
  }

  _mergeRight(dest, src) {
    if (src.t !== 'leaf') {
      src.v[src.v.length - 1].n = dest.v[0].k[0];
    }
    dest.k = src.k.concat(dest.k);
    dest.v = src.v.concat(dest.v);
    return dest;
  }
}
