var CAPACITY = 4;

function repr(bpt) {
  var result = {};
  function walk(node) {
    var tag = node[0];
    var keys = node[1];
    var xs = node[2];
    if (tag === 'branch') {
      var kids = xs;
      for (var i = 0; i < kids.length; i++) {
        walk(kids[i]);
      }
    } else if (tag === 'leaf') {
      var values = xs;
      for (var i = 0; i < keys.length; i++) {
        result[keys[i]] = values[i];
      }
    }
  }
  walk(bpt);
  return result;
}

function check(bpt) {
  function checking(depth, node, currentDepth, lo, hi) {
    var tag = node[0];
    var keys = node[1];
    var xs = node[2];

    if (keys.length >= CAPACITY) throw new Error('Overflowed node capacity');

    for (var i = 0, kl = keys.length - 1; i < kl; i++) {
      if (keys[i] >= keys[i + 1]) throw new Error('Disordered or duplicate key');
    }

    if (tag === 'branch') {
      var kids = xs;
      if (currentDepth === 0) {
        if (kids.length < 2) throw new Error('Underpopulated root');
      } else {
        if (Math.floor(CAPACITY / 2) > kids.length) throw new Error('Underpopulated branch');
      }
      // console.log(keys.length, kids.length - 1);
      if (keys.length !== kids.length - 1) throw new Error('keys and kids don\'t correspond');
      if (lo.length && lo[0] >= keys[0]) throw new Error('lo error');
      if (hi.length && keys[keys.length - 1] >= hi[0]) throw new Error('hi error');

      for (var i = 0; i < kids.length; i++) {
        var newLo = (i === 0 ? lo : [keys[i - 1]]);
        var newHi = (i === keys.length ? hi : [keys[i]]);
        checking(depth, kids[i], currentDepth + 1, newLo, newHi);
      }
    } else if (tag === 'leaf') {
      if (currentDepth !== depth) throw new Error('Leaves at different depths');
      var values = xs;
      if (keys.length !== values.length) throw new Error('keys and values don\'t correspond');
      if (currentDepth > 0) {
        if (Math.floor(CAPACITY / 2) > values.length) throw new Error('Underpopulated leaf');
      }
      if (lo.length && lo[0] !== keys[0]) throw new Error('lo error (2)');
      if (hi.length && keys[keys.length - 1] >= hi[0]) throw new Error('hi error (2)');
    } else {
      throw new Error('Bad tag');
    }
  }
  var tag = bpt[0];
  var xs = bpt[2];

  var depth = 0;
  while (tag === 'branch') {
    tag = xs[0][0];
    xs = xs[0][2];
    depth += 1;
  }

  checking(depth, bpt, 0, [], []);
}

export function fetch(bpt, needleKey, def = null) {
  var tag = bpt[0];
  var keys = bpt[1];
  var xs = bpt[2];

  while (tag === 'branch') {
    var found = false;
    var i = 0;
    for (var kl = keys.length; i < kl; i++) {
      if (needleKey < keys[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = xs.length - 1;
    }
    tag = xs[i][0];
    keys = xs[i][1];
    xs = xs[i][2];
  }

  var i = 0;
  for (var kl = keys.length; i < kl; i++) {
    if (needleKey === keys[i]) {
      return xs[i];
    } else if (needleKey < keys[i]) {
      break; // just to finish quicker; not needed for correctness
    }
  }
  return def;
}

function reallyStore(bpt, newKey, value) {
  var path = [];
  var tag = bpt[0];
  var keys = bpt[1];
  var xs = bpt[2];

  // Find the leaf node for newKey, and the path down to it.
  while (tag === 'branch') {
    var i = 0;
    var found = false;
    for (var kl = keys.length; i < kl; i++) {
      if (newKey < keys[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = keys.length;
    }
    path.push([tag, keys, xs, i]);
    tag = xs[i][0];
    keys = xs[i][1];
    xs = xs[i][2];
  }

  // Find the index for newKey in the leaf node.
  var i = 0;
  var found = false;
  for (var kl = keys.length; i < kl; i++) {
    if (newKey === keys[i]) {
      // newKey isn't actually new, so the structure goes unchanged.
      xs[i] = value;
      return bpt;
    } else if (newKey < keys[i]) {
      found = true;
      break;
    }
  }
  if (!found) {
    i = keys.length;
  }

  // We'll have to insert it in the leaf at i. If there's room, just do it:
  keys.splice(i, 0, newKey);
  xs.splice(i, 0, value);

  if (keys.length < CAPACITY) {
    return bpt;
  }

  // Otherwise split the now-overpacked leaf...
  var mid = Math.floor(CAPACITY / 2);
  var tween = keys[mid];
  var left = ['leaf', keys.slice(0, mid), xs.slice(0, mid)];
  var right = ['leaf', keys.slice(mid), xs.slice(mid)];

  // ...and propagate the split back up the path.
  while (path.length) {
    var temp = path.pop();
    var tag = temp[0];
    var keys = temp[1];
    var kids = temp[2];
    var i = temp[3];
    keys.splice(i, 0, tween);
    kids[i] = left;
    kids.splice(i + 1, 0, right);
    if (keys.length < CAPACITY) {
      return bpt;
    }
    tween = keys[mid - 1];
    left = ['branch', keys.slice(0, mid - 1), kids.slice(0, mid)];
    right = ['branch', keys.slice(mid), kids.slice(mid)];
  }

  // If we got here, we need a new root.
  return ['branch', [tween], [left, right]];
}

export function store(bpt, newKey, value) {
  var result = reallyStore(bpt, newKey, value);
  check(result);
  return result;
}

export function init() {
  var result = ['leaf', [], []];
  check(result);
  return result;
}
