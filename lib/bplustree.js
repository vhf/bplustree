class BPlusTree {
  constructor(order, cmpFn, debug) {
    this.order = order || 4;
    if (this.order % 2 !== 0 || this.order < 4) {
      throw new Error('order must be even and greater than 4');
    }
    this.minKeys = Math.ceil(this.order / 2);
    this.maxKeys = this.order - 1;
    this.numKeys = 0;
    this.numVals = 0;
    this.debug = debug || false;

    this.cmpFn = cmpFn || ((a, b) => {
      return (a < b) ? -1 : ((a > b) ? 1 : 0); // eslint-disable-line
    });

    this.tree = { t: 'leaf', k: [], v: [], n: null };
  }

  repr(keys, values, sortDescending) {
    const result = (keys || values) ? [] : {};
    function walk(node) {
      if (node.t === 'branch') {
        const kids = node.v;
        for (let i = 0, kl = kids.length; i < kl; i++) {
          walk(kids[i]);
        }
      } else if (node.t === 'leaf') {
        for (let i = 0, nkl = node.k.length; i < nkl; i++) {
          if (values) {
            result.push(node.v[i]);
          } else if (keys) {
            result.push(node.k[i]);
          } else {
            result[node.k[i]] = node.v[i];
          }
        }
      }
    }
    walk(this.tree);
    if (sortDescending) {
      return result.reverse();
    }
    return result;
  }

  fetchRange(lowerBound, upperBound, sortDescending) {
    let result = [];

    let leaf = this.fetch(lowerBound, true);
    if (!leaf) {
      // should we look for a new lowerBound?
      return [];
    }

    let index = leaf.k.indexOf(lowerBound);

    while (leaf.k[index] <= upperBound) {
      if (this.cmpFn(leaf.k[index], upperBound) === 0) {
        result = result.concat(leaf.v[index]).reduce((a, b) => a.concat(b), []);
        break;
      }
      if (this.cmpFn(leaf.k[leaf.k.length - 1], upperBound) === 0) {
        result = result.concat(leaf.v).reduce((a, b) => a.concat(b), []);
        break;
      } else if (this.cmpFn(leaf.k[leaf.k.length - 1], upperBound) === -1) {
        result = result.concat(leaf.v.slice(index)).reduce((a, b) => a.concat(b), []);
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

  depth(node) {
    let tree = node || this.tree;
    let d = 0;
    while (tree.t === 'branch') {
      tree = tree.v[0];
      d += 1;
    }
    return d;
  }

  check(nodeToCheck) {
    const tree = nodeToCheck || this.tree;
    const depth = this.depth(tree);

    function assert(expr, msg) {
      if (!expr) {
        throw new Error(msg);
      }
    }

    function checking(self, currentNode, currentDepth, lo, hi) {
      const node = currentNode;
      const keysLength = node.k.length;

      assert(keysLength <= self.maxKeys, 'Overflowed node');

      for (let i = 0, kl = keysLength - 1; i < kl; i++) {
        assert(self.cmpFn(node.k[i], node.k[i + 1]) === -1, 'Disordered or duplicate key');
      }

      assert(lo.length === 0 || self.cmpFn(lo[0], node.k[0]) < 1, 'lo error');
      assert(hi.length === 0 || self.cmpFn(node.k[keysLength - 1], hi[0]) === -1, 'hi error');

      if (node.t === 'branch') {
        const kids = node.v;
        const kidsLength = kids.length;

        if (currentDepth === 0) {
          assert(kidsLength >= 2, 'Underpopulated root');
        } else {
          assert(kidsLength >= self.minKeys, 'Underpopulated branch');
        }

        assert(keysLength === kidsLength - 1, 'keys and kids don\'t correspond');

        for (let i = 0; i < kidsLength; i++) {
          const newLo = (i === 0 ? lo : [node.k[i - 1]]);
          const newHi = (i === keysLength ? hi : [node.k[i]]);
          checking(self, kids[i], currentDepth + 1, newLo, newHi);
        }
      } else if (node.t === 'leaf') {
        const v = node.v;
        assert(currentDepth === depth, 'Leaves at different depths');
        assert(keysLength === v.length, 'keys and values don\'t correspond');
        if (currentDepth > 0) {
          assert(v.length >= self.minKeys, 'Underpopulated leaf');
        }
      } else {
        assert(false, 'Bad type');
      }
      return true;
    }

    assert(this.repr(true).length === this.numKeys, 'leaf count does not match');

    return checking(this, tree, 0, [], []);
  }

  fetch(needleKey, getLeaf, root, location) {
    let node = root || this.tree;

    let index;
    const path = [];
    while (node.t === 'branch') {
      index = 0;
      let found = false;
      for (let kl = node.k.length; index < kl; index++) {
        if (this.cmpFn(node.k[index], needleKey) === 1) {
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
      if (this.cmpFn(needleKey, node.k[j]) === 0) {
        if (location) {
          return { val: node.v[j], node: node, path };
        }
        if (getLeaf) {
          return node;
        }
        return node.v[j];
      } else if (this.cmpFn(node.k[j], needleKey) === 1) {
        break; // just to finish quicker; not needed for correctness
      }
    }
    return false;
  }

  _doStore(key, value) {
    const path = [];
    let node = this.tree;

    // Find the leaf node for key, and the path down to it.
    while (node.t === 'branch') {
      let i = 0;
      let found = false;
      for (let nkl = node.k.length; i < nkl; i++) {
        if (this.cmpFn(key, node.k[i]) === -1) {
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

    // Find the index for key in the leaf node.
    let i = 0;
    let found = false;
    const nkl = node.k.length;
    for (; i < nkl; i++) {
      if (this.cmpFn(key, node.k[i]) === 0) {
        // key isn't actually new, so the structure goes unchanged.
        node.v[i].push(value);
        return;
      } else if (this.cmpFn(key, node.k[i]) === -1) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = nkl;
    }

    // We'll have to insert it in the leaf at i. If there's room, just do it:
    node.k.splice(i, 0, key);
    node.v.splice(i, 0, [value]);
    this.numKeys += 1;
    this.numVals += 1;

    if (node.k.length < this.order) {
      return;
    }

    // Otherwise split the now-overpacked leaf...
    const mid = Math.floor(this.order / 2);
    let tween = node.k[mid];
    let left = { t: 'leaf', k: node.k.slice(0, mid), v: node.v.slice(0, mid), n: node.k[mid] };
    let right = { t: 'leaf', k: node.k.slice(mid), v: node.v.slice(mid), n: node.n };

    // ...and propagate the split back up the path.
    while (path.length) {
      node = path.pop();
      node.k.splice(node.i, 0, tween);
      node.v[node.i] = left;
      node.v.splice(node.i + 1, 0, right);
      if (node.k.length < this.maxKeys) {
        return;
      }
      tween = node.k[mid - 1];
      left = { t: 'branch', k: node.k.slice(0, mid - 1), v: node.v.slice(0, mid), n: node.k[mid] };
      right = { t: 'branch', k: node.k.slice(mid), v: node.v.slice(mid), n: null };
    }

    // If we got here, we need a new root.
    this.tree = { t: 'branch', k: [tween], v: [left, right], n: null };
  }

  store(key, value) {
    this._doStore(key, value);
    if (this.debug) {
      this.check();
    }
  }

  _set(path, value) {
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

  _get(path, node) {
    let object = node || this.tree;
    let index = 0;
    const length = path.length;

    while (object && index < length) {
      object = object.v[path[index++]];
    }
    return object;
  }

  _pathToChildPath(path) {
    if (!path.length) {
      return path;
    }
    return path.map((p) => ['v', p]).reduce((a, b) => a.concat(b));
  }

  _genGetKeyFn(driller, depth) {
    if (depth === 0) {
      return (o) => driller(o).k[0];
    }
    return this._genGetKeyFn((o) => driller(o).v[0], depth - 1);
  }

  _getFirstKeyFn(depth) {
    const fn = [
      (o) => o,
      (o) => o.v[0],
      (o) => o.v[0].v[0],
      (o) => o.v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o) => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
    ];
    const length = fn.length;
    return (depth < length - 1 && ((o) => fn[depth](o).k[0])) || this._genGetKeyFn(fn[length - 1], depth - length + 1);
  }

  _fixKeys() {
    let result = [];
    function walk(node, depth, path) {
      if (node.t === 'branch') {
        const kids = node.v;
        for (let i = 0, kl = kids.length; i < kl; i++) {
          if (kids[i].t === 'branch') {
            const newPath = path.slice(0, depth).concat([i]);
            result.push(newPath);
            walk(kids[i], depth + 1, newPath);
          }
        }
      }
    }
    walk(this.tree, 0, []);
    result = result.sort((a, b) => (a.length > b.length) ? -1 : ((a.length < b.length) ? 1 : 0)); // eslint-disable-line

    result.forEach((path) => {
      const sub = this._get(path);
      sub.k = sub.v.slice(1).map(this._getFirstKeyFn(result[0].length - path.length));
    });

    if (this.tree.t !== 'leaf') {
      this.tree.k = this.tree.v.slice(1).map(this._getFirstKeyFn(result.length ? result[0].length : 0));
    }

    return result;
  }

  _removeKey(key, val) {
    const fetched = this.fetch(key, null, null, true);

    if (!fetched) {
      return false;
    }
    const keyIndex = fetched.node.k.indexOf(key);
    const valIndex = fetched.node.v[keyIndex].indexOf(val);
    const valCount = fetched.node.v[keyIndex].length;
    let removed;

    // key does not contain val
    if (val !== undefined && valIndex === -1) {
      return false;
    }

    // we only have one val, remove it together with its key
    if (valCount === 1 && keyIndex !== -1) {
      fetched.node.k.splice(keyIndex, 1);
      removed = fetched.node.v[keyIndex][0];
      fetched.node.v.splice(keyIndex, 1);
      this.numKeys--;
    } else
    if (val !== undefined) {
      // key does not contain said val
      if (valIndex === -1) {
        return false;
      }
      // key contains val, but we have other vals, only remove this val
      removed = fetched.node.v[keyIndex][valIndex];
      fetched.node.v[keyIndex].splice(valIndex, 1);
    } else {
      // key has several vals, we don't remove anything
      if (valCount > 1) {
        return false;
      }
    }

    // we lost one val
    this.numvals--;
    return { val: removed, leaf: fetched.node, path: fetched.path };
  }

  _doRemove(key, val) {
    // get leaf for key, remove key from leaf
    const numKeys = this.numKeys;
    const removed = this._removeKey(key, val);
    if (!removed) {
      return false;
    }
    const leaf = removed.leaf;
    const path = removed.path;

    // if key in branch.k, replace it with new smallest key in leaf
    const parentPath = path.slice(0, path.length - 1);
    let parent = this._get(parentPath);
    let index = parent.k.indexOf(key);

    // we lost a key, need to update parent keys !
    if (numKeys !== this.numKeys && index !== -1) {
      this._set(this._pathToChildPath(parentPath).concat(['k', index]), leaf.k[0]);
    }

    // if leaf is at least half full, terminate
    if (leaf.v.length >= this.minKeys) {
      return removed.val;
    }

    const leafIndex = path[path.length - 1];

    // else borrow

    // if rightSibling is more than half full, borrow leftmost value
    let canBorrowRight = false;
    if (leafIndex < parent.v.length - 1) {
      const rightSibling = parent.v[leafIndex + 1];
      if (rightSibling && rightSibling.k.length > this.minKeys) {
        // can borrow from right because it is more than half full
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

    // if leftSibling is more than half full, borrow rightmost value
    let canBorrowLeft = false;
    if (leafIndex > 0) {
      const leftSibling = parent.v[leafIndex - 1];
      if (leftSibling && leftSibling.k.length > this.minKeys) {
        // can borrow from left because it is more than half full
        canBorrowLeft = true;
        const keyToBorrow = leftSibling.k.pop();
        const valBorrowed = leftSibling.v.pop();
        leaf.k.unshift(keyToBorrow);
        leaf.v.unshift(valBorrowed);
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

    if (!canBorrowRight && !canBorrowLeft) {
      let again = true;
      let lastIndex;
      while (again) {
        parent = this._get(path);
        lastIndex = index;
        if (path.length) {
          index = path.pop();
        } else {
          index = 0;
          again = false;
        }

        const mergeNeeded = parent.t !== 'leaf' && parent.v[lastIndex].k.length < this.minKeys;

        if (mergeNeeded) {
          const leftExists = parent.v[lastIndex - 1];
          let leftSum = leftExists && parent.v[lastIndex - 1].k.length + parent.v[lastIndex].k.length;
          leftSum += parent.v[lastIndex].t === 'leaf' ? 0 : 1;
          const roomOnLeft = leftExists && leftSum && leftSum <= this.maxKeys;

          const rightExists = parent.v[lastIndex + 1];
          let rightSum = rightExists && parent.v[lastIndex + 1].k.length + parent.v[lastIndex].k.length;
          rightSum += parent.v[lastIndex].t === 'leaf' ? 0 : 1;
          const roomOnRight = rightExists && rightSum && rightSum <= this.maxKeys;

          let splitIndex = false;

          if ((leftExists && roomOnLeft) || (leftExists && !roomOnRight)) {
            if (!roomOnLeft) {
              splitIndex = lastIndex - 1;
            }
            // merging with left, deleting sibling
            // node becomes (sibling merged with node)
            parent.v[lastIndex] = this._mergeLeft(parent.v[lastIndex - 1], parent.v[lastIndex]);
            parent.v.splice(lastIndex, 1); // delete now merged sibling
          } else if (rightExists) {
            if (!roomOnRight) {
              splitIndex = lastIndex;
            }
            // merging with right, deleting sibling
            // node becomes (node merged with sibling)
            parent.v[lastIndex] = this._mergeRight(parent.v[lastIndex + 1], parent.v[lastIndex]);
            parent.v.splice(lastIndex + 1, 1); // delete now merged sibling
          }
          if (splitIndex !== false) {
            const branchToSplit = parent.v[splitIndex];
            const mid = this.minKeys;
            const leftContent = branchToSplit.v.slice(0, mid);
            const rightContent = branchToSplit.v.slice(mid);
            const childType = parent.t;
            const left = {t: childType, k: leftContent.slice(1).map((o) => o.k[0]), v: leftContent};
            const right = {t: childType, k: rightContent.slice(1).map((o) => o.k[0]), v: rightContent};
            parent.v.splice.apply(parent.v, [splitIndex, 1].concat([left, right]));
          }
        }
      }

      if (this.tree.t !== 'leaf' && this.tree.v.length < 2) {
        // underpopulated root
        if (this.tree.v[index].v.length > this.maxKeys) {
          // need to split
          const mid = this.minKeys;
          const leftContent = this.tree.v[index].v.slice(0, mid);
          const rightContent = this.tree.v[index].v.slice(mid);
          const left = {t: 'branch', k: [leftContent[leftContent.length - 1].k[0]], v: leftContent};
          const right = {t: 'branch', k: [rightContent[rightContent.length - 1].k[0]], v: rightContent};
          this.tree.t = 'branch';
          this.tree.n = null;
          this.tree.k = [right.v[0].k[0]];
          this.tree.v = [left, right];
        } else {
          // need to hoist
          this.tree.t = 'leaf';
          this.tree = this.tree.v[index];
          const slice = this.tree.v.slice(1);
          if (slice.length && slice[0].t) {
            this.tree.k = slice.map((n) => n.k[0]);
          }
        }
      }
      this._fixKeys();
    }
    return removed.val;
  }

  remove(key, val) {
    const removed = this._doRemove(key, val);
    if (this.debug) {
      this.check();
    }
    return removed;
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

module.exports = BPlusTree
