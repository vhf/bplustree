'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

require('regenerator-runtime/runtime');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Class representing a B+ Tree. */
var BPlusTree = function () {
  /**
   * @param {Object} options
   * @param {number} [options.order=6] - The tree order (or branching factor or node capacity)
   * @param {boolean} [options.debug=false] - Check tree invariants after each insert / remove
   * @param {string} [options.cmpFn=numericComparison] - Comparison function to use
   */
  function BPlusTree() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$order = _ref.order,
        order = _ref$order === undefined ? 6 : _ref$order,
        _ref$debug = _ref.debug,
        debug = _ref$debug === undefined ? false : _ref$debug,
        _ref$cmpFn = _ref.cmpFn,
        cmpFn = _ref$cmpFn === undefined ? function (a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    } : _ref$cmpFn;

    _classCallCheck(this, BPlusTree);

    // eslint-disable-line
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

    this.tree = { t: 'leaf', k: [], v: [], n: null };
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


  _createClass(BPlusTree, [{
    key: 'repr',
    value: function repr() {
      var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          _ref2$root = _ref2.root,
          root = _ref2$root === undefined ? this.tree : _ref2$root,
          _ref2$getKeys = _ref2.getKeys,
          getKeys = _ref2$getKeys === undefined ? false : _ref2$getKeys,
          _ref2$getValues = _ref2.getValues,
          getValues = _ref2$getValues === undefined ? false : _ref2$getValues,
          _ref2$descending = _ref2.descending,
          descending = _ref2$descending === undefined ? false : _ref2$descending;

      var tree = root;
      var result = getKeys || getValues ? [] : {};
      function walk(node) {
        if (node.t === 'branch') {
          var kids = node.v;
          for (var i = 0, kl = kids.length; i < kl; i++) {
            walk(kids[i]);
          }
        } else if (node.t === 'leaf') {
          for (var _i = 0, nkl = node.k.length; _i < nkl; _i++) {
            if (getKeys) {
              result.push(node.k[_i]);
            } else if (getValues) {
              result.push(node.v[_i]);
            } else {
              result[node.k[_i]] = node.v[_i];
            }
          }
        }
      }
      walk(tree);
      var out = result.length && Array.isArray(result[0]) ? Array.prototype.concat.apply([], result) : result;

      if ((getKeys || getValues) && descending) {
        return out.reverse();
      }
      return out;
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
    value: function fetchRange(lowerBound, upperBound) {
      var _ref3 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
          _ref3$descending = _ref3.descending,
          descending = _ref3$descending === undefined ? false : _ref3$descending;

      var hi = upperBound;
      var lo = lowerBound;

      var result = [];

      var leaf = this.fetch(lo, { getLeaf: true });
      if (!leaf) {
        // look for a new lower bound, which is quite slow
        // check if lo is bigger than highest key in tree
        leaf = this.tree;
        while (leaf.t === 'branch') {
          leaf = leaf.v[leaf.v.length - 1];
        }
        if (this.cmpFn(lo, leaf.k[leaf.k.length - 1]) === 1) {
          return [];
        }
        // ok, now this is REALLY suboptimal (and ugly)
        var keys = this.repr({ getKeys: true });
        for (var i = 0; i < this.numKeys; i++) {
          if (this.cmpFn(keys[i], lo) === 1) {
            lo = keys[i];
            leaf = this.fetch(lo, { getLeaf: true });
            break;
          }
        }
      }

      var index = leaf.k.indexOf(lo);

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
          var _i2 = index;
          for (; leaf.k[_i2] <= hi; _i2++) {}
          result.push(leaf.v.slice(0, _i2));
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
     * - if `target` is found before `limit`, it'll stop
     * - if `limit` is reached before `target` was found, it'll stop
     * - `target` and `limit` are both optional: use none of them, one of them, or both
     * - `keyNotFound` is optional, it lets you decide which key to prefer when the key is not found
     * @param {Object} options
     * @param {Key} [options.key] - Key at which to start generating.
     * @param {boolean} [options.target] - Stop generating when this value is found.
     * @param {number} [options.limit] - Generate at max this number of values.
     * @param {string} [options.keyNotFound] - See `notFound` of `BPlusTree.fetch`
     * @return {Generator}
     */

  }, {
    key: 'values',
    value: regeneratorRuntime.mark(function values() {
      var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          key = _ref4.key,
          target = _ref4.target,
          _ref4$limit = _ref4.limit,
          limit = _ref4$limit === undefined ? Infinity : _ref4$limit,
          keyNotFound = _ref4.keyNotFound;

      var returned, leaf, index, i, length, remainder;
      return regeneratorRuntime.wrap(function values$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              returned = 0;
              leaf = void 0;

              if (typeof key === 'undefined') {
                key = -Infinity;
                keyNotFound = 'right';
              }
              leaf = this.fetch(key, { getLeaf: true, notFound: keyNotFound });

              if (leaf) {
                _context.next = 6;
                break;
              }

              return _context.abrupt('return', false);

            case 6:
              if (!true) {
                _context.next = 33;
                break;
              }

              index = leaf.k.indexOf(key);

              if (index === -1) {
                index = 0;
              }
              i = index;

            case 10:
              if (!(i < leaf.v.length)) {
                _context.next = 26;
                break;
              }

              length = leaf.v[i].length;

              returned += length;

              if (!(returned >= limit)) {
                _context.next = 17;
                break;
              }

              remainder = length - (returned - limit);

              if (!(remainder >= 0)) {
                _context.next = 17;
                break;
              }

              return _context.abrupt('return', leaf.v[i].slice(0, remainder));

            case 17:
              if (!(target === leaf.v[i][0])) {
                _context.next = 19;
                break;
              }

              return _context.abrupt('return', leaf.v[i]);

            case 19:
              if (!(leaf.n === null && i + 1 === leaf.v.length)) {
                _context.next = 21;
                break;
              }

              return _context.abrupt('return', leaf.v[i]);

            case 21:
              _context.next = 23;
              return leaf.v[i];

            case 23:
              i++;
              _context.next = 10;
              break;

            case 26:
              if (!(leaf.n !== null)) {
                _context.next = 30;
                break;
              }

              leaf = this.fetch(leaf.n, { getLeaf: true, notFound: keyNotFound });
              _context.next = 31;
              break;

            case 30:
              return _context.abrupt('break', 33);

            case 31:
              _context.next = 6;
              break;

            case 33:
            case 'end':
              return _context.stop();
          }
        }
      }, values, this);
    })

    /**
     * Get tree depth (or height)
     * @param {Object} options
     * @param {BPTree.tree} [options.root=this.tree] - Tree to use
     * @return {number} Computed depth
     */

  }, {
    key: 'depth',
    value: function depth() {
      var _ref5 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          _ref5$root = _ref5.root,
          root = _ref5$root === undefined ? this.tree : _ref5$root;

      var tree = root;
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
    value: function check() {
      var _ref6 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          _ref6$root = _ref6.root,
          root = _ref6$root === undefined ? this.tree : _ref6$root;

      var depth = this.depth({ root: root });

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

          for (var _i3 = 0; _i3 < kidsLength; _i3++) {
            var newLo = _i3 === 0 ? lo : [node.k[_i3 - 1]];
            var newHi = _i3 === keysLength ? hi : [node.k[_i3]];
            checking(self, kids[_i3], currentDepth + 1, newLo, newHi);
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

      return checking(this, root, 0, [], []);
    }

    /**
     * Fetch the value(s) stored at `key`.
     * - `getLeaf` returns the whole leaf
     * - `getPath` returns the path from the root to this leaf
     * - when defined, `notFound` can be either 'left' or 'right', it controls which key to return when it wasn't found
     * @param {Key} key
     * @param {Object} options
     * @param {BPTree.tree} [options.root=this.tree] - Tree to search in
     * @param {boolean} [options.getLeaf=false] - Return the leaf containing the value(s)
     * @param {boolean} [options.getPath=false] - Return {val: value(s), leaf: leaf, path: pathFromRootToLeaf}
     * @param {string} [options.notFound=left|right] - Return what was found left or right from key which doesn't exist
     * @return {Value|Value[]|Leaf|Object|Boolean}
     */

  }, {
    key: 'fetch',
    value: function fetch(key) {
      var _ref7 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref7$root = _ref7.root,
          root = _ref7$root === undefined ? this.tree : _ref7$root,
          _ref7$getLeaf = _ref7.getLeaf,
          getLeaf = _ref7$getLeaf === undefined ? false : _ref7$getLeaf,
          _ref7$getPath = _ref7.getPath,
          getPath = _ref7$getPath === undefined ? false : _ref7$getPath,
          notFound = _ref7.notFound;

      var node = root;

      var index = void 0;
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

      for (var j = 0, _kl = node.k.length; j < _kl; j++) {
        var cmp = this.cmpFn(key, node.k[j]);
        if (cmp === 0) {
          var val = node.v[j];
          if (getPath) {
            return { val: val, leaf: node, path: path };
          }
          if (getLeaf) {
            return node;
          }
          return val;
        } else if (notFound) {
          if (notFound === 'right' && !(cmp < 0)) {
            return this.fetch(node.n, { root: root, getLeaf: getLeaf, getPath: getPath });
          }
          node = this._get(path);
          var _val = void 0;
          if (notFound === 'left' && !(cmp < 0)) {
            _val = node.v[node.v.length - 1];
          } else if (notFound === 'right') {
            _val = node.v[0];
          }
          if (_val) {
            if (getPath) {
              return { val: _val, leaf: node, path: path };
            }
            if (getLeaf) {
              return node;
            }
            return _val;
          }
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
        var _i4 = 0;
        var _found = false;
        for (var _nkl = node.k.length; _i4 < _nkl; _i4++) {
          if (this.cmpFn(key, node.k[_i4]) === -1) {
            _found = true;
            break;
          }
        }
        if (!_found) {
          _i4 = node.k.length;
        }
        path.push({ t: node.t, k: node.k, v: node.v, i: _i4 });
        node = node.v[_i4];
      }

      // Find the index for key in the leaf node.
      var i = 0;
      var found = false;
      var nkl = node.k.length;
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
      return true;
    }
  }, {
    key: '_get',
    value: function _get(path) {
      var node = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.tree;

      var object = node;
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
      result.sort(function (a, b) {
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
    value: function _removeKey(key, val) {
      var fetched = this.fetch(key, { getPath: true });

      if (!fetched) {
        return false;
      }

      var keyIndex = fetched.leaf.k.indexOf(key);
      var valIndex = fetched.leaf.v[keyIndex].indexOf(val);

      // key does not contain val
      if (val !== undefined && valIndex === -1) {
        return false;
      }

      var valCount = fetched.leaf.v[keyIndex].length;
      var removed = void 0;

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
      this.numvals--;
      return { val: removed, leaf: fetched.leaf, path: fetched.path };
    }
  }, {
    key: '_doRemove',
    value: function _doRemove(key, val) {
      // get leaf for key, remove key from leaf
      var removed = this._removeKey(key, val);
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
        }
      }

      // if leftSibling is more than half full, borrow rightmost value
      var canBorrowLeft = false;
      if (leafIndex > 0) {
        var leftSibling = parent.v[leafIndex - 1];
        if (leftSibling && leftSibling.k.length > this.minKeys) {
          // can borrow from left because it is more than half full
          canBorrowLeft = true;
          var _keyToBorrow = leftSibling.k.pop();
          var _valBorrowed = leftSibling.v.pop();
          leaf.k.unshift(_keyToBorrow);
          leaf.v.unshift(_valBorrowed);
          parent.k = parent.v.slice(1).map(function (o) {
            return o.k[0];
          });
          parent.v[leafIndex] = leaf;
          parent.v[leafIndex - 1] = leftSibling;
        }
      }

      if (!canBorrowRight && !canBorrowLeft) {
        var again = true;
        var lastIndex = void 0;
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
            var _mid = this.minKeys;
            var _leftContent = this.tree.v[index].v.slice(0, _mid);
            var _rightContent = this.tree.v[index].v.slice(_mid);
            var _left = { t: 'branch', k: [_leftContent[_leftContent.length - 1].k[0]], v: _leftContent };
            var _right = { t: 'branch', k: [_rightContent[_rightContent.length - 1].k[0]], v: _rightContent };
            this.tree.t = 'branch';
            this.tree.n = null;
            this.tree.k = [_right.v[0].k[0]];
            this.tree.v = [_left, _right];
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

  }, {
    key: 'remove',
    value: function remove(key, value) {
      var removed = this._doRemove(key, value);
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

  return BPlusTree;
}();

module.exports = BPlusTree;