'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Class representing a B+ Tree where one key only holds one value. */

var UniqueBPlusTree = (function () {
  /**
   * @param {Object} options
   * @param {number} [options.order=6] - The tree order (or branching factor or node capacity)
   * @param {boolean} [options.debug=false] - Check tree invariants after each insert / remove
   * @param {string} [options.cmpFn=numericComparison] - Comparison function to use
   */

  function UniqueBPlusTree(options) {
    _classCallCheck(this, UniqueBPlusTree);

    options || (options = {});
    this.order = options.order || 6;
    this.debug = options.debug || false;
    this.cmpFn = options.cmpFn || function (a, b) {
      return a < b ? -1 : a > b ? 1 : 0; // eslint-disable-line
    };

    if (this.order % 2 !== 0 || this.order < 4) {
      throw new Error('order must be even and greater than 4');
    }
    this.minKeys = Math.ceil(this.order / 2);
    this.maxKeys = this.order - 1;
    this.numKeys = 0;
    this.numVals = 0;

    this.tree = { t: 'leaf', k: [], v: [], n: null };
  }

  /**
   * Get a {k1: v1, k2: v2, ...} object representing the stored data
   * @param {Object} options
   * @param {boolean} [options.getKeys=false] - Instead of an object, get a list of all keys
   * @param {boolean} [options.getValues=false] - Instead of an object, get a list of all values
   * @param {boolean} [options.descending=false] - Get it reversed (only works if options.keys or options.values)
   * @return {{keys: values}|Keys[]|Values[]}
   */

  _createClass(UniqueBPlusTree, [{
    key: 'repr',
    value: function repr(options) {
      options || (options = {});
      var result = options.getKeys || options.getValues ? [] : {};
      function walk(node) {
        if (node.t === 'branch') {
          var kids = node.v;
          for (var i = 0, kl = kids.length; i < kl; i++) {
            walk(kids[i]);
          }
        } else if (node.t === 'leaf') {
          for (var i = 0, nkl = node.k.length; i < nkl; i++) {
            if (options.getKeys) {
              result.push(node.k[i]);
            } else if (options.getValues) {
              result.push(node.v[i]);
            } else {
              result[node.k[i]] = node.v[i];
            }
          }
        }
      }
      walk(this.tree);
      if ((options.getKeys || options.getValues) && options.descending) {
        return result.reverse();
      }
      return result;
    }

    /**
     * Get all values between keys `lowerBound` and `upperBound`
     * @param {number} lowerBound
     * @param {number} upperBound
     * @param {Object} options
     * @param {boolean} [options.descending=false] - Get it reversed (only works if options.keys or options.values)
     * @return {Values[]} A flat array of values, or empty array.
     */

  }, {
    key: 'fetchRange',
    value: function fetchRange(lowerBound, upperBound, options) {
      options || (options = {});

      var result = [];

      var leaf = this.fetch(lowerBound, { getLeaf: true });
      if (!leaf) {
        // should we look for a new lowerBound?
        return [];
      }

      var index = leaf.k.indexOf(lowerBound);

      while (leaf.k[index] <= upperBound) {
        if (this.cmpFn(leaf.k[index], upperBound) === 0) {
          result.push(leaf.v[index]);
          break;
        }
        if (this.cmpFn(leaf.k[leaf.k.length - 1], upperBound) === 0) {
          result = result.concat(leaf.v);
          break;
        } else if (this.cmpFn(leaf.k[leaf.k.length - 1], upperBound) === -1) {
          result = result.concat(leaf.v.slice(index));
          leaf = this.fetch(leaf.n, { getLeaf: true });
          index = 0;
        } else {
          var i = index;
          for (; i < leaf.k.length && leaf.k[i] <= upperBound; i++) {}
          result = result.concat(leaf.k.slice(0, i));
          break;
        }
      }

      if (options.descending) {
        result.reverse();
      }

      return result;
    }

    /**
     * Get tree depth (or height)
     * @param {Object} options
     * @param {BPTree.tree} [options.root=this.tree] - Tree to use
     * @return {number} Computed depth
     */

  }, {
    key: 'depth',
    value: function depth(options) {
      options || (options = {});
      var tree = options.root || this.tree;
      var d = 0;
      while (tree.t === 'branch') {
        tree = tree.v[0];
        d += 1;
      }
      return d;
    }

    /**
     * Check tree's invariants
     * @param {Object} options
     * @param {BPTree.tree} [options.root=this.tree] - Tree to check
     * @return {boolean} Returns `true` or throws an `Error()`
     */

  }, {
    key: 'check',
    value: function check(options) {
      options || (options = {});
      var tree = options.root || this.tree;
      var depth = this.depth({ root: tree });

      function assert(expr, msg) {
        if (!expr) {
          throw new Error(msg);
        }
      }

      function checking(self, currentNode, currentDepth, lo, hi) {
        var node = currentNode;
        var keysLength = node.k.length;

        assert(keysLength <= self.maxKeys, 'Overflowed node');

        for (var i = 0, kl = keysLength - 1; i < kl; i++) {
          assert(self.cmpFn(node.k[i], node.k[i + 1]) === -1, 'Disordered or duplicate key');
        }

        assert(lo.length === 0 || self.cmpFn(lo[0], node.k[0]) < 1, 'lo error');
        assert(hi.length === 0 || self.cmpFn(node.k[keysLength - 1], hi[0]) === -1, 'hi error');

        if (node.t === 'branch') {
          var kids = node.v;
          var kidsLength = kids.length;

          if (currentDepth === 0) {
            assert(kidsLength >= 2, 'Underpopulated root');
          } else {
            assert(kidsLength >= self.minKeys, 'Underpopulated branch');
          }

          assert(keysLength === kidsLength - 1, 'keys and kids don\'t correspond');

          for (var i = 0; i < kidsLength; i++) {
            var newLo = i === 0 ? lo : [node.k[i - 1]];
            var newHi = i === keysLength ? hi : [node.k[i]];
            checking(self, kids[i], currentDepth + 1, newLo, newHi);
          }
        } else if (node.t === 'leaf') {
          var v = node.v;
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

      assert(this.repr({ getKeys: true }).length === this.numKeys, 'leaf count does not match');

      return checking(this, tree, 0, [], []);
    }

    /**
     * Fetch the value(s) stored at `key`
     * @param {Key} key
     * @param {Object} options
     * @param {BPTree.tree} [options.root=this.tree] - Tree to search in
     * @param {boolean} [options.getLeaf=false] - Return the leaf containing the value(s)
     * @param {boolean} [options.getPath=false] - Return {val: value(s), leaf: leaf, path: pathFromRootToLeaf}
     * @return {Value|Value[]|Leaf|Object}
     */

  }, {
    key: 'fetch',
    value: function fetch(key, options) {
      options || (options = {});
      var node = options.root || this.tree;

      var index = undefined;
      var path = [];
      while (node.t === 'branch') {
        index = 0;
        var found = false;
        for (var kl = node.k.length; index < kl; index++) {
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

      for (var j = 0, kl = node.k.length; j < kl; j++) {
        if (this.cmpFn(key, node.k[j]) === 0) {
          var val = node.v[j];
          if (options.getPath) {
            return { val: val, leaf: node, path: path };
          }
          if (options.getLeaf) {
            return node;
          }
          return val;
        } else if (this.cmpFn(node.k[j], key) === 1) {
          break; // just to finish quicker; not needed for correctness
        }
      }
      return false;
    }
  }, {
    key: '_doStore',
    value: function _doStore(key, value) {
      var path = [];
      var node = this.tree;

      // Find the leaf node for key, and the path down to it.
      while (node.t === 'branch') {
        var _i = 0;
        var _found = false;
        for (var _nkl = node.k.length; _i < _nkl; _i++) {
          if (this.cmpFn(key, node.k[_i]) === -1) {
            _found = true;
            break;
          }
        }
        if (!_found) {
          _i = node.k.length;
        }
        path.push({ t: node.t, k: node.k, v: node.v, i: _i });
        node = node.v[_i];
      }

      // Find the index for key in the leaf node.
      var i = 0;
      var found = false;
      var nkl = node.k.length;
      for (; i < nkl; i++) {
        if (this.cmpFn(key, node.k[i]) === 0) {
          // key isn't actually new, so the structure goes unchanged.
          node.v[i] = value;
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
      node.v.splice(i, 0, value);
      this.numKeys += 1;
      this.numVals += 1;

      if (node.k.length < this.order) {
        return;
      }

      // Otherwise split the now-overpacked leaf...
      var mid = Math.floor(this.order / 2);
      var tween = node.k[mid];
      var left = { t: 'leaf', k: node.k.slice(0, mid), v: node.v.slice(0, mid), n: node.k[mid] };
      var right = { t: 'leaf', k: node.k.slice(mid), v: node.v.slice(mid), n: node.n };

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

    /**
     * Insert value at key key
     * @param {Key} key
     * @param {Value} value
     * @return {boolean} true
     */

  }, {
    key: 'store',
    value: function store(key, value) {
      this._doStore(key, value);
      if (this.debug) {
        this.check();
      }
    }
  }, {
    key: '_get',
    value: function _get(path, node) {
      var object = node || this.tree;
      var index = 0;
      var length = path.length;

      while (object && index < length) {
        object = object.v[path[index++]];
      }
      return object;
    }
  }, {
    key: '_genGetKeyFn',
    value: function _genGetKeyFn(driller, depth) {
      if (depth === 0) {
        return function (o) {
          return driller(o).k[0];
        };
      }
      return this._genGetKeyFn(function (o) {
        return driller(o).v[0];
      }, depth - 1);
    }
  }, {
    key: '_getFirstKeyFn',
    value: function _getFirstKeyFn(depth) {
      var fn = [function (o) {
        return o;
      }, function (o) {
        return o.v[0];
      }, function (o) {
        return o.v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }, function (o) {
        return o.v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0].v[0];
      }];
      var length = fn.length;
      return depth < length - 1 && function (o) {
        return fn[depth](o).k[0];
      } || this._genGetKeyFn(fn[length - 1], depth - length + 1);
    }
  }, {
    key: '_fixKeys',
    value: function _fixKeys() {
      var _this = this;

      var result = [];
      function walk(node, depth, path) {
        if (node.t === 'branch') {
          var kids = node.v;
          for (var i = 0, kl = kids.length; i < kl; i++) {
            if (kids[i].t === 'branch') {
              var newPath = path.slice(0, depth).concat([i]);
              result.push(newPath);
              walk(kids[i], depth + 1, newPath);
            }
          }
        }
      }
      walk(this.tree, 0, []);
      result = result.sort(function (a, b) {
        return a.length > b.length ? -1 : a.length < b.length ? 1 : 0;
      }); // eslint-disable-line

      result.forEach(function (path) {
        var sub = _this._get(path);
        sub.k = sub.v.slice(1).map(_this._getFirstKeyFn(result[0].length - path.length));
      });

      if (this.tree.t !== 'leaf') {
        this.tree.k = this.tree.v.slice(1).map(this._getFirstKeyFn(result.length ? result[0].length : 0));
      }

      return result;
    }
  }, {
    key: '_removeKey',
    value: function _removeKey(key) {
      var fetched = this.fetch(key, { getPath: true });

      if (!fetched) {
        return false;
      }

      var index = fetched.leaf.k.indexOf(key);
      if (index !== -1) {
        fetched.leaf.k.splice(index, 1);
        fetched.leaf.v.splice(index, 1);
      }

      this.numKeys--;
      return { val: fetched.val, leaf: fetched.leaf, path: fetched.path };
    }
  }, {
    key: '_doRemove',
    value: function _doRemove(key) {
      // get leaf for key, remove key from leaf
      var removed = this._removeKey(key);
      if (!removed) {
        return false;
      }
      var leaf = removed.leaf;
      var path = removed.path;

      // if key in branch.k, replace it with new smallest key in leaf
      var parentPath = path.slice(0, path.length - 1);
      var parent = this._get(parentPath);
      var index = parent.k.indexOf(key);

      // if leaf is at least half full, terminate
      if (leaf.v.length >= this.minKeys) {
        return removed.val;
      }

      var leafIndex = path[path.length - 1];
      var noFix = false;

      // else borrow

      // if rightSibling is more than half full, borrow leftmost value
      var canBorrowRight = false;
      if (leafIndex < parent.v.length - 1) {
        var rightSibling = parent.v[leafIndex + 1];
        if (rightSibling && rightSibling.k.length > this.minKeys) {
          // can borrow from right because it is more than half full
          canBorrowRight = true;
          var keyToBorrow = rightSibling.k.shift();
          var valBorrowed = rightSibling.v.shift();
          leaf.k.push(keyToBorrow);
          leaf.v.push(valBorrowed);
          leaf.n = rightSibling.k[0];
          parent.k = parent.v.slice(1).map(function (o) {
            return o.k[0];
          });
          parent.v[leafIndex] = leaf;
          parent.v[leafIndex + 1] = rightSibling;
          noFix = true;
        }
      }

      // if leftSibling is more than half full, borrow rightmost value
      var canBorrowLeft = false;
      if (leafIndex > 0) {
        var leftSibling = parent.v[leafIndex - 1];
        if (leftSibling && leftSibling.k.length > this.minKeys) {
          // can borrow from left because it is more than half full
          canBorrowLeft = true;
          var keyToBorrow = leftSibling.k.pop();
          var valBorrowed = leftSibling.v.pop();
          leaf.k.unshift(keyToBorrow);
          leaf.v.unshift(valBorrowed);
          parent.k = parent.v.slice(1).map(function (o) {
            return o.k[0];
          });
          parent.v[leafIndex] = leaf;
          parent.v[leafIndex - 1] = leftSibling;
          noFix = true;
        }
      }

      if (!canBorrowRight && !canBorrowLeft) {
        var again = true;
        var lastIndex = undefined;
        while (again) {
          parent = this._get(path);
          lastIndex = index;
          if (path.length) {
            index = path.pop();
          } else {
            index = 0;
            again = false;
          }

          var mergeNeeded = parent.t !== 'leaf' && parent.v[lastIndex].k.length < this.minKeys;

          if (mergeNeeded) {
            var leftExists = parent.v[lastIndex - 1];
            var leftSum = leftExists && parent.v[lastIndex - 1].k.length + parent.v[lastIndex].k.length;
            leftSum += parent.v[lastIndex].t === 'leaf' ? 0 : 1;
            var roomOnLeft = leftExists && leftSum && leftSum <= this.maxKeys;

            var rightExists = parent.v[lastIndex + 1];
            var rightSum = rightExists && parent.v[lastIndex + 1].k.length + parent.v[lastIndex].k.length;
            rightSum += parent.v[lastIndex].t === 'leaf' ? 0 : 1;
            var roomOnRight = rightExists && rightSum && rightSum <= this.maxKeys;

            var splitIndex = false;

            if (leftExists && roomOnLeft || leftExists && !roomOnRight) {
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
              var branchToSplit = parent.v[splitIndex];
              var mid = this.minKeys;
              var leftContent = branchToSplit.v.slice(0, mid);
              var rightContent = branchToSplit.v.slice(mid);
              var childType = parent.t;
              var left = { t: childType, k: leftContent.slice(1).map(function (o) {
                  return o.k[0];
                }), v: leftContent };
              var right = { t: childType, k: rightContent.slice(1).map(function (o) {
                  return o.k[0];
                }), v: rightContent };
              parent.v.splice.apply(parent.v, [splitIndex, 1].concat([left, right]));
            }
          }
        }

        if (this.tree.v.length < 2 && this.tree.t !== 'leaf') {
          // underpopulated root
          if (this.tree.v[index].v.length > this.maxKeys) {
            // need to split
            var mid = this.minKeys;
            var leftContent = this.tree.v[index].v.slice(0, mid);
            var rightContent = this.tree.v[index].v.slice(mid);
            var left = { t: 'branch', k: [leftContent[leftContent.length - 1].k[0]], v: leftContent };
            var right = { t: 'branch', k: [rightContent[rightContent.length - 1].k[0]], v: rightContent };
            this.tree.t = 'branch';
            this.tree.n = null;
            this.tree.k = [right.v[0].k[0]];
            this.tree.v = [left, right];
          } else {
            // need to hoist
            this.tree.t = 'leaf';
            this.tree = this.tree.v[index];
            var slice = this.tree.v.slice(1);
            if (slice.length && slice[0].t) {
              this.tree.k = slice.map(function (n) {
                return n.k[0];
              });
            }
          }
        }
        if (!noFix) {
          this._fixKeys();
        }
      }
      return removed.val;
    }

    /**
     * Remove key and its value
     * @param {Key} key
     * @return {Value} The removed value
     */

  }, {
    key: 'remove',
    value: function remove(key) {
      var removed = this._doRemove(key);
      if (this.debug) {
        this.check();
      }
      return removed;
    }
  }, {
    key: '_mergeLeft',
    value: function _mergeLeft(dest, src) {
      dest.k = dest.k.concat(src.k);
      dest.v = dest.v.concat(src.v);
      dest.n = src.n;
      return dest;
    }
  }, {
    key: '_mergeRight',
    value: function _mergeRight(dest, src) {
      if (src.t !== 'leaf') {
        src.v[src.v.length - 1].n = dest.v[0].k[0];
      }
      dest.k = src.k.concat(dest.k);
      dest.v = src.v.concat(dest.v);
      return dest;
    }
  }]);

  return UniqueBPlusTree;
})();

module.exports = UniqueBPlusTree;