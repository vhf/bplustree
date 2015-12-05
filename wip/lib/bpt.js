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
    log('numKeys=' + this.numKeys);
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
    const path = node.t === 'leaf' ? [0] : [];
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
    this.tree.v[fetched.location.branch].v[fetched.location.leaf] = fetched.node;
    this.numKeys--;
    return { leaf: fetched.node, branchPos: fetched.location.branch, leafPos: fetched.location.leaf };
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

    let node = this.tree;
    const path = [];
    // Find the leaf node for key, and the path down to it.
    while (node.t === 'branch') {
      let i = 0;
      let found = false;
      for (let nkl = node.k.length; i < nkl; i++) {
        if (key < node.k[i]) {
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
    log('path', path);

    // 1, 2
    const removed = this._removeKey(key);
    const leaf = removed.leaf;
    const branchPos = removed.branchPos;
    const leafPos = removed.leafPos;

    // 2.1
    const index = this.tree.v[branchPos].k.indexOf(key);

    if (index !== -1) {
      log(`found key int(${key}) in root.v[${branchPos}].k at index ${index}`);
      this.tree.v[branchPos].k[index] = leaf.k[0];
      log(`replace root.v[${branchPos}].k[${index}] with`, leaf.k[0]);
    } else {
      log(`NOT found key int(${key}) in root.v[${branchPos}].k`);
    }

    // 2.2
    if (leaf.k.length >= this.minKeys) {
      log('half full, over!');
      return true;
    }

    // 2.3.1
    let canBorrowRight = false;
    if (leafPos < (this.tree.v.length - 1)) {
      const rightSibling = this.tree.v[branchPos].v[leafPos + 1];
      if (rightSibling && rightSibling.k.length > this.minKeys + 1) {
        log(`borrowing from right ${rightSibling}`);
        canBorrowRight = true;
        const keyToBorrow = rightSibling.k[rightSibling.k.length + 1];
        const valBorrowed = rightSibling.v[rightSibling.k.indexOf(keyToBorrow)];
        log(`borrow leftmost (${keyToBorrow} => ${valBorrowed}) from right`, rightSibling);
        this.tree.v[branchPos].v[leafPos].k.push(keyToBorrow);
        this.tree.v[branchPos].v[leafPos].v.push(valBorrowed);
      }
    }

    // 2.3.2
    let canBorrowLeft = false;
    if (leafPos > 0) {
      const leftSibling = this.tree.v[branchPos].v[leafPos - 1];
      if (leftSibling && leftSibling.k.length > this.minKeys + 1) {
        log(`borrowing from left ${leftSibling}`);
        canBorrowLeft = true;
        const keyToBorrow = leftSibling.k[leftSibling.k.length - 1];
        const valBorrowed = leftSibling.v[leftSibling.k.indexOf(keyToBorrow)];
        log(`borrow rightmost (${keyToBorrow} => ${valBorrowed}) from left`, leftSibling);
        this.tree.v[branchPos].v[leafPos].k.unshift(keyToBorrow);
        this.tree.v[branchPos].v[leafPos].v.unshift(valBorrowed);
      }
    }

    // 2.3.3 ??
    if (canBorrowRight || canBorrowLeft) {
      log('2.3.3');
    } else {
      if (leafPos > 0) {
        let leftSibling = this.tree.v[branchPos].v[leafPos - 1];
        log('merge with left sibling', leftSibling);
        leftSibling = this._mergeLeft(leftSibling, leaf);
        this.tree.v[branchPos].v[leafPos - 1] = leftSibling;
        this.tree.v[branchPos].k.splice(0, 1);
        this.tree.v[branchPos].v.splice(leafPos, 1);
      } else if (leafPos < (this.tree.v.length - 1)) {
        let rightSibling = this.tree.v[branchPos].v[leafPos + 1];
        if (!rightSibling) {
          rightSibling = this.tree.v[branchPos + 1].v[0];
          if (rightSibling.k.length === this.order - 1) {
            log('overpacked');
          }
        }
        log('merge with right sibling', rightSibling);
        rightSibling = this._mergeRight(rightSibling, leaf);
        log('rightSibling once merged is now', rightSibling);
        this.tree.v[branchPos].v[leafPos] = rightSibling;
        this.tree.v[branchPos].k.splice(0, 1);
        this.tree.v[branchPos].v.splice(leafPos, 1);

        if (this.tree.v[branchPos].v.length < this.minKeys) {
          log('underpop branch');
          for (let i = this.tree.v[branchPos].v.length - 1; i >= 0; i--) {
            this.tree.v[branchPos + 1].v.unshift(this.tree.v[branchPos].v[i]);
          }
          this.tree.v.splice(branchPos, 1);
          if (this.tree.v.length < 2) {
            log('underpop root');
            if (this.tree.v[branchPos].v.length > 3) {
              log('split', this.tree.v[branchPos].v);
              const mid = this.minKeys;
              const leftContent = this.tree.v[branchPos].v.slice(0, mid);
              const rightContent = this.tree.v[branchPos].v.slice(mid);
              const left = {t: 'branch', k: [leftContent[leftContent.length - 1].k[0]], v: leftContent};
              const right = {t: 'branch', k: [rightContent[rightContent.length - 1].k[0]], v: rightContent};
              this.tree.t = 'branch';
              this.tree.n =
              this.tree.k = [right.v[0].k[0]];
              this.tree.v = [left, right];
            } else {
              log('hoist');
              this.tree.t = 'leaf';
              this.tree = this.tree.v[branchPos];
              this.tree.k = this.tree.v.slice(1).map((n) => n.k[0]);
            }
          }
        }
      }
    }
  }

  _mergeLeft(sibling, leaf) {
    sibling.k = sibling.k.concat(leaf.k);
    sibling.v = sibling.v.concat(leaf.v);
    sibling.n = leaf.n;
    return sibling;
  }

  _mergeRight(sibling, leaf) {
    sibling.k = leaf.k.concat(sibling.k);
    sibling.v = leaf.v.concat(sibling.v);
    return sibling;
  }
}
