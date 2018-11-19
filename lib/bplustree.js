// @flow

type Tree = { t: string; k: number[]; v: any[]; n?: ?number };
type CmpFn = ((a: any, b: any) => number);

/** Class representing a B+ Tree. */
class BPlusTree {
  order: number;
  debug: boolean;
  cmpFn: CmpFn;
  minKeys: number;
  maxKeys: number;
  numKeys: number;
  numVals: number;
  tree: Tree;

  /**
   * @param {Object} options
   * @param {number} [options.order=6] - The tree order (or branching factor or node capacity)
   * @param {boolean} [options.debug=false] - Check tree invariants after each insert / remove
   * @param {string} [options.cmpFn=numericComparison] - Comparison function to use
   */
  constructor({
    order = 6,
    debug = false,
    cmpFn = ((a: any, b: any): number => ((a < b) ? -1 : ((a > b) ? 1 : 0))) // eslint-disable-line
  }: {
      order?: number;
      debug?: boolean;
      cmpFn?: CmpFn
    } = {}) {
    this.order = order;
    this.debug = debug;
    this.cmpFn = cmpFn;

    if (this.order % 2 !== 0 || this.order < 4) {
      throw new Error('order must be even and greater than 4');
    }
    this.minKeys = Math.ceil(this.order / 2);
    this.maxKeys = this.order - 1;
    this.numKeys = 0;
    this.numVals = 0;

    this.tree = {
      t: 'leaf',
      k: [],
      v: [],
      n: null,
    };
  }

  /**
   * Get a {k1: v1, k2: v2, ...} object representing the stored data
   * @param {Object} options
   * @param {BPTree.tree} [options.root=this.tree] - Tree to check
   * @param {boolean} [options.getKeys=false] - Instead of an object, get a list of all keys
   * @param {boolean} [options.getValues=false] - Instead of an object, get a list of all values
   * @param {boolean} [options.descending=false] - Get it reversed (only works if options.getKeys or options.getValues)
   * @return {{keys: values}|Keys[]|Values[]}
   */
  repr({
    root, getKeys = false, getValues = false, descending = false,
  }: { root?: Tree; getKeys?: boolean; getValues?: boolean; descending?: boolean } = {}): Object | any[] {
    const tree = root || this.tree;
    let resultArray = [];
    const resultObject = {};

    function walk(node: Tree) {
      if (node.t === 'branch') {
        const kids = node.v;
        for (let i = 0, kl = kids.length; i < kl; i++) {
          walk(kids[i]);
        }
      } else if (node.t === 'leaf') {
        for (let i = 0, nkl = node.k.length; i < nkl; i++) {
          if (getKeys) {
            resultArray.push(node.k[i]);
          } else if (getValues) {
            resultArray.push(node.v[i]);
          } else {
            resultObject[node.k[i]] = node.v[i];
          }
        }
      }
    }
    walk(tree);
    // if (Array.isArra)
    if (resultArray.length && resultArray[0].length) {
      resultArray = Array.prototype.concat.apply([], resultArray);
    }

    if (resultArray.length && descending) {
      return resultArray.reverse();
    }
    if (resultArray.length) {
      return resultArray;
    }
    return resultObject;
  }

  /**
   * Get all values between keys `lowerBound` and `upperBound`
   * @param {number} lowerBound
   * @param {number} upperBound
   * @param {Object} options
   * @param {boolean} [options.descending=false] - Get it reversed (only works if options.keys or options.values)
   * @return {Values[]} A flat array of values, or empty array.
   */
  fetchRange(lowerBound: number, upperBound: number, { descending = false }: { descending: boolean } = {}): any[] {
    const hi = upperBound;
    let lo = lowerBound;

    let result = [];

    let leaf = this.fetch(lo, { getLeaf: true });
    if (!leaf) { // look for a new lower bound, which is quite slow
      // check if lo is bigger than highest key in tree
      leaf = this.tree;
      while (leaf.t === 'branch') {
        leaf = leaf.v[leaf.v.length - 1];
      }
      if (this.cmpFn(lo, leaf.k[leaf.k.length - 1]) === 1) {
        return [];
      }
      // ok, now this is REALLY suboptimal (and ugly)
      const keys = this.repr({ getKeys: true });
      for (let i = 0; i < this.numKeys; i++) {
        if (this.cmpFn(keys[i], lo) === 1) {
          lo = keys[i];
          leaf = this.fetch(lo, { getLeaf: true });
          break;
        }
      }
    }

    let index = leaf.k.indexOf(lo);

    while (leaf.k[index] <= hi) {
      if (this.cmpFn(leaf.k[index], hi) === 0) {
        // if key at current index is upper bound, concat all vals and stop
        result.push(leaf.v[index]);
        break;
      }
      if (this.cmpFn(leaf.k[leaf.k.length - 1], hi) === 0) {
        // if last key is upper bound, concat all vals and stop
        result.push(leaf.v.slice(index));
        break;
      } else if (this.cmpFn(leaf.k[leaf.k.length - 1], hi) === -1) {
        // if last key is smaller than upper bound, fetch next leaf and iterate
        result.push(leaf.v.slice(index));
        if (leaf.n !== null) {
          leaf = this.fetch(leaf.n, { getLeaf: true });
          index = 0;
        } else {
          break;
        }
      } else {
        // if last key is bigger than upper bound, concat until upper bound
        let i = index;
        for (; leaf.k[i] <= hi; i++);
        result.push(leaf.v.slice(0, i));
        break;
      }
    }

    if (Array.isArray(result[0])) {
      result = Array.prototype.concat.apply([], Array.prototype.concat.apply([], result));
    } else {
      result = Array.prototype.concat.apply([], result);
    }

    if (descending) {
      result.reverse();
    }

    return result;
  }

  /**
   * Tree values generator. It will start generating values from a certain key
   * until the end of the tree OR until `target` is found OR until `limit`
   * is reached OR until there are no elements anymore.
   *
   * In other words:
   *
   * - if `target` is found before `limit`, it'll stop
   * - if `limit` is reached before `target` was found, it'll stop
   * - `target` and `limit` are both optional: use none of them, one of them, or both
   * - `keyNotFound` is optional, it lets you decide which key to prefer when the key is not found
   *
   * @param {Object} options
   * @param {Key} [options.key] - Key at which to start generating.
   * @param {boolean} [options.target] - Stop generating when this value is found.
   * @param {number} [options.limit] - Generate at max this number of values.
   * @param {string} [options.keyNotFound] - See `notFound` of `BPlusTree.fetch`
   * @return {Generator} - e.g. `{ value: { k: 6, v: ['f', 'g'] }, done: false }`
   */
  * values({
    key, target, limit = Infinity, keyNotFound,
  }: { key: any; target: any; limit: number; keyNotFound: ?string } = {}): Generator<any, ?Object, void> {
    let returned = 0;
    let leaf;
    let _key = key;
    let _keyNotFound = keyNotFound;
    if (typeof _key === 'undefined') {
      _key = -Infinity;
      _keyNotFound = 'right';
    }
    leaf = this.fetch(_key, { getLeaf: true, notFound: _keyNotFound });

    if (!leaf) {
      return undefined;
    }

    while (true) { // eslint-disable-line no-constant-condition
      let index = leaf.k.indexOf(_key);
      if (index === -1) {
        index = 0;
      }
      for (let i = index; i < leaf.v.length; i++) {
        const length = leaf.v[i].length;
        returned += length;
        if (returned >= limit) {
          const remainder = length - (returned - limit);
          if (remainder >= 0) {
            return { k: leaf.k[i], v: leaf.v[i].slice(0, remainder) };
          }
        }
        if (target === leaf.v[i][0]) {
          return { k: leaf.k[i], v: leaf.v[i] };
        }
        if (leaf.n === null && i + 1 === leaf.v.length) {
          return { k: leaf.k[i], v: leaf.v[i] };
        }
        yield { k: leaf.k[i], v: leaf.v[i] };
      }
      if (leaf.n !== null) {
        leaf = this.fetch(leaf.n, { getLeaf: true, notFound: _keyNotFound });
      } else {
        break;
      }
    }
    return undefined;
  }

  /**
   * Get tree depth (or height)
   * @param {Object} options
   * @param {BPTree.tree} [options.root=this.tree] - Tree to use
   * @return {number} Computed depth
   */
  depth({ root = this.tree }: { root: Tree } = {}): number {
    let tree = root;
    let d = 0;
    while (tree.t === 'branch') {
      tree = tree.v[0];
      d += 1;
    }
    return d;
  }

  /**
   * Check tree invariants
   * @param {Object} options
   * @param {BPTree.tree} [options.root=this.tree] - Tree to check
   * @return {boolean} Returns `true` or throws an `Error()`
   */
  check({ root = this.tree }: { root: Tree } = {}): boolean {
    const depth = this.depth({ root });

    function assert(expr: boolean, msg: string) {
      if (!expr) {
        throw new Error(msg);
      }
    }

    function checking(self: BPlusTree, currentNode: Tree, currentDepth: number, lo: any[], hi: any[]): boolean {
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

    return checking(this, root, 0, [], []);
  }

  /**
   * Fetch the value(s) stored at `key`.
   *
   * - `getLeaf` returns the whole leaf
   * - `getPath` returns the path from the root to this leaf
   * - when defined, `notFound` can be either 'left' or 'right', it controls which key to return when it wasn't found
   *
   * @param {Key} key
   * @param {Object} options
   * @param {BPTree.tree} [options.root=this.tree] - Tree to search in
   * @param {boolean} [options.getLeaf=false] - Return the leaf containing the value(s)
   * @param {boolean} [options.getPath=false] - Return {val: value(s), leaf: leaf, path: pathFromRootToLeaf}
   * @param {string} [options.notFound] - either 'left' or 'right' - Return what was found left or right from key which doesn't exist
   * @return {Value|Value[]|Leaf|Object|Boolean}
   */
  fetch(key: any, {
    root = this.tree, getLeaf = false, getPath = false, notFound,
  }: { root?: Tree; getLeaf?: boolean; getPath?: boolean; notFound?: ?string } = {}): any {
    let node = root;

    let index;
    const path = [];
    while (node.t === 'branch') {
      index = 0;
      let found = false;
      for (let kl = node.k.length; index < kl; index++) {
        if (this.cmpFn(node.k[index], key) === 1) {
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
      const cmp = this.cmpFn(key, node.k[j]);
      if (cmp === 0) {
        const val = node.v[j];
        if (getPath) {
          return { val, leaf: node, path };
        }
        if (getLeaf) {
          return node;
        }
        return val;
      }
      if (notFound) {
        if (notFound === 'right' && !(cmp < 0)) {
          return this.fetch(node.n, { root, getLeaf, getPath });
        }
        node = this._get(path);
        let val;
        if (notFound === 'left' && !(cmp < 0)) {
          val = node.v[node.v.length - 1];
        } else if (notFound === 'right') {
          val = node.v[0];
        }
        if (val) {
          if (getPath) {
            return { val, leaf: node, path };
          }
          if (getLeaf) {
            return node;
          }
          return val;
        }
      } else if (this.cmpFn(node.k[j], key) === 1) {
        break; // just to finish quicker; not needed for correctness
      }
    }
    return false;
  }

  _doStore(key: any, value: any) {
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
      path.push({
        t: node.t,
        k: node.k,
        v: node.v,
        i,
      });
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
      }
      if (this.cmpFn(key, node.k[i]) === -1) {
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
    let left = {
      t: 'leaf',
      k: node.k.slice(0, mid),
      v: node.v.slice(0, mid),
      n: node.k[mid],
    };
    let right = {
      t: 'leaf',
      k: node.k.slice(mid),
      v: node.v.slice(mid),
      n: node.n,
    };

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
      left = {
        t: 'branch',
        k: node.k.slice(0, mid - 1),
        v: node.v.slice(0, mid),
        n: node.k[mid],
      };
      right = {
        t: 'branch',
        k: node.k.slice(mid),
        v: node.v.slice(mid),
        n: null,
      };
    }

    // If we got here, we need a new root.
    this.tree = {
      t: 'branch', k: [tween], v: [left, right], n: null,
    };
  }

  /**
   * Insert value at key key
   * @param {Key} key
   * @param {Value} value
   * @return {boolean} true
   */
  store(key: any, value: any): boolean {
    this._doStore(key, value);
    if (this.debug) {
      this.check();
    }
    return true;
  }

  _get(path: number[], node?: Tree = this.tree): Object {
    let object = node;
    let index = 0;
    const length = path.length;

    while (object && index < length) {
      object = object.v[path[index++]];
    }
    return object;
  }

  _genGetKeyFn(driller: (tree: Tree) => any, depth: number): (tree: Tree) => any {
    if (depth === 0) {
      return (o: Tree): any => driller(o).k[0];
    }
    return this._genGetKeyFn((o: Tree): any => driller(o).v[0], depth - 1);
  }

  _getFirstKeyFn(depth: number): (tree: Tree) => any {
    const fn = [
      (o: Tree): any => o,
      (o: Tree): any => o.v[0],
      (o: Tree): any => o.v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
      (o: Tree): any => o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0],
    ];
    const length = fn.length;
    return (depth < length - 1 && ((o: Tree): any => fn[depth](o).k[0])) || this._genGetKeyFn(fn[length - 1], (depth - length) + 1);
  }

  _fixKeys(): any {
    const result = [];
    function walk(node: Tree, depth: number, path: any) {
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
    result.sort((a, b) => (a.length > b.length) ? -1 : ((a.length < b.length) ? 1 : 0)); // eslint-disable-line

    result.forEach((path: any) => {
      const sub = this._get(path);
      sub.k = sub.v.slice(1).map(this._getFirstKeyFn(result[0].length - path.length));
    });

    if (this.tree.t !== 'leaf') {
      this.tree.k = this.tree.v.slice(1).map(this._getFirstKeyFn(result.length ? result[0].length : 0));
    }

    return result;
  }

  _removeKey(key: any, val: any): boolean | Object {
    const fetched = this.fetch(key, { getPath: true });

    if (!fetched) {
      return false;
    }

    const keyIndex = fetched.leaf.k.indexOf(key);
    const valIndex = fetched.leaf.v[keyIndex].indexOf(val);

    // key does not contain val
    if (val !== undefined && valIndex === -1) {
      return false;
    }

    const valCount = fetched.leaf.v[keyIndex].length;
    let removed;

    // we only have one val, remove it together with its key
    if (valCount === 1 && keyIndex !== -1) {
      fetched.leaf.k.splice(keyIndex, 1);
      removed = fetched.leaf.v[keyIndex][0];
      fetched.leaf.v.splice(keyIndex, 1);
      this.numKeys--;
    } else if (val !== undefined) {
      // key contains val, but we have other vals, only remove this val
      removed = fetched.leaf.v[keyIndex][valIndex];
      fetched.leaf.v[keyIndex].splice(valIndex, 1);
    } else {
      // key has several vals, we don't remove anything
      return false;
    }

    // we lost one val
    this.numVals--;
    return { val: removed, leaf: fetched.leaf, path: fetched.path };
  }

  _doRemove(key: any, val: any): boolean | any {
    // get leaf for key, remove key from leaf
    const removed = this._removeKey(key, val);
    if (typeof removed === 'boolean') {
      return false;
    }
    const leaf = removed.leaf;
    const path = removed.path;

    // if key in branch.k, replace it with new smallest key in leaf
    const parentPath = path.slice(0, path.length - 1);
    let parent = this._get(parentPath);
    let index = parent.k.indexOf(key);

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
        parent.k = parent.v.slice(1).map((o: Object): any => o.k[0]);
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
        parent.k = parent.v.slice(1).map((o: Object): any => o.k[0]);
        parent.v[leafIndex] = leaf;
        parent.v[leafIndex - 1] = leftSibling;
      }
    }

    if (!canBorrowRight && !canBorrowLeft) {
      let again = true;
      let lastIndex = -1;
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
            parent.v[lastIndex] = BPlusTree._mergeLeft(parent.v[lastIndex - 1], parent.v[lastIndex]);
            parent.v.splice(lastIndex, 1); // delete now merged sibling
          } else if (rightExists) {
            if (!roomOnRight) {
              splitIndex = lastIndex;
            }
            // merging with right, deleting sibling
            // node becomes (node merged with sibling)
            parent.v[lastIndex] = BPlusTree._mergeRight(parent.v[lastIndex + 1], parent.v[lastIndex]);
            parent.v.splice(lastIndex + 1, 1); // delete now merged sibling
          }
          if (splitIndex !== false) {
            const branchToSplit = parent.v[splitIndex];
            const mid = this.minKeys;
            const leftContent = branchToSplit.v.slice(0, mid);
            const rightContent = branchToSplit.v.slice(mid);
            const childType = parent.t;
            const left = { t: childType, k: leftContent.slice(1).map((o: Object): any => o.k[0]), v: leftContent };
            const right = { t: childType, k: rightContent.slice(1).map((o: Object): any => o.k[0]), v: rightContent };
            parent.v.splice(splitIndex, 1, left, right);
          }
        }
      }

      if (this.tree.v.length < 2 && this.tree.t !== 'leaf') {
        // underpopulated root
        if (this.tree.v[index].v.length > this.maxKeys) {
          // need to split
          const mid = this.minKeys;
          const leftContent = this.tree.v[index].v.slice(0, mid);
          const rightContent = this.tree.v[index].v.slice(mid);
          const left = { t: 'branch', k: [leftContent[leftContent.length - 1].k[0]], v: leftContent };
          const right = { t: 'branch', k: [rightContent[rightContent.length - 1].k[0]], v: rightContent };
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
            this.tree.k = slice.map((o: Object): any => o.k[0]);
          }
        }
      }

      this._fixKeys();
    }
    return removed.val;
  }

  /**
   * Remove value from key key, or remove key and its value if key only has one value
   * @param {Key} key
   * @param {Value?} value
   * @return {Value} The removed value
   */
  remove(key: any, value: any): any {
    const removed = this._doRemove(key, value);
    if (this.debug) {
      this.check();
    }
    return removed;
  }

  static _mergeLeft(dest: Tree, src: Tree): Tree {
    const node = dest;
    node.k = node.k.concat(src.k);
    node.v = node.v.concat(src.v);
    node.n = src.n;
    return node;
  }

  static _mergeRight(dest: Tree, _src: Tree): Tree {
    const node = dest;
    const src = _src;
    if (src.t !== 'leaf') {
      src.v[src.v.length - 1].n = node.v[0].k[0];
    }
    node.k = src.k.concat(node.k);
    node.v = src.v.concat(node.v);
    return node;
  }
}

module.exports = BPlusTree;
