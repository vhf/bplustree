const CAPACITY = 4;

function repr(bpt) {
  const result = {};
  function walk(node) {
    const [tag, keys, xs] = node;
    if (tag === 'branch') {
      const kids = xs;
      for (let i = 0; i < kids.length; i++) {
        walk(kids[i]);
      }
    } else if (tag === 'leaf') {
      const values = xs;
      for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = values[i];
      }
    }
  }
  walk(bpt);
  return result;
}

function check(bpt) {
  function checking(depth, node, currentDepth, lo, hi) {
    const [tag, keys, xs] = node;

    if (keys.length >= CAPACITY) throw new Error('Overflowed node capacity');

    for (let i = 0, kl = keys.length - 1; i < kl; i++) {
      if (keys[i] >= keys[i + 1]) throw new Error('Disordered or duplicate key');
    }

    if (tag === 'branch') {
      const kids = xs;
      if (currentDepth === 0) {
        if (kids.length < 2) throw new Error('Underpopulated root');
      } else {
        if (Math.floor(CAPACITY / 2) > kids.length) throw new Error('Underpopulated branch');
      }
      // console.log(keys.length, kids.length - 1);
      if (keys.length !== kids.length - 1) throw new Error('keys and kids don\'t correspond');
      if (lo.length && lo[0] >= keys[0]) throw new Error('lo error');
      if (hi.length && keys[keys.length - 1] >= hi[0]) throw new Error('hi error');

      for (let i = 0; i < kids.length; i++) {
        const newLo = (i === 0 ? lo : [keys[i - 1]]);
        const newHi = (i === keys.length ? hi : [keys[i]]);
        checking(depth, kids[i], currentDepth + 1, newLo, newHi);
      }
    } else if (tag === 'leaf') {
      if (currentDepth !== depth) throw new Error('Leaves at different depths');
      const values = xs;
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
  let [tag, , xs] = bpt;

  let depth = 0;
  while (tag === 'branch') {
    [tag, , xs] = xs[0];
    depth += 1;
  }

  checking(depth, bpt, 0, [], []);
}

export function fetch(bpt, needleKey, def = null) {
  let [tag, keys, xs] = bpt;

  while (tag === 'branch') {
    let found = false;
    let i = 0;
    for (let kl = keys.length; i < kl; i++) {
      if (needleKey < keys[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = xs.length - 1;
    }
    [tag, keys, xs] = xs[i];
  }

  let i = 0;
  for (let kl = keys.length; i < kl; i++) {
    if (needleKey === keys[i]) {
      return xs[i];
    } else if (needleKey < keys[i]) {
      break; // just to finish quicker; not needed for correctness
    }
  }
  return def;
}

function reallyStore(bpt, newKey, value) {
  const path = [];
  let [tag, keys, xs] = bpt;

  // Find the leaf node for newKey, and the path down to it.
  while (tag === 'branch') {
    let i = 0;
    let found = false;
    for (let kl = keys.length; i < kl; i++) {
      if (newKey < keys[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = keys.length;
    }
    path.push([tag, keys, xs, i]);
    [tag, keys, xs] = xs[i];
  }

  // Find the index for newKey in the leaf node.
  let i = 0;
  let found = false;
  for (let kl = keys.length; i < kl; i++) {
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
  const mid = Math.floor(CAPACITY / 2);
  let tween = keys[mid];
  let left = ['leaf', keys.slice(0, mid), xs.slice(0, mid)];
  let right = ['leaf', keys.slice(mid), xs.slice(mid)];

  // ...and propagate the split back up the path.
  while (path.length) {
    let kids;
    [tag, keys, kids, i] = path.pop();
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
  const result = reallyStore(bpt, newKey, value);
  check(result);
  return result;
}

export function init() {
  const result = ['leaf', [], []];
  check(result);
  return result;
}
