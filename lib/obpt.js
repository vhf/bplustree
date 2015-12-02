const CAPACITY = 4;

function repr(bpt) {
  const result = {};
  function walk(node) {
    const walkNode = node;
    if (walkNode.type === 'branch') {
      const kids = walkNode.values;
      for (let i = 0; i < kids.length; i++) {
        walk(kids[i]);
      }
    } else if (walkNode.type === 'leaf') {
      const values = walkNode.values;
      for (let i = 0; i < walkNode.keys.length; i++) {
        result[walkNode.keys[i]] = values[i];
      }
    }
  }
  walk(bpt);
  return result;
}

function check(bpt) {
  function checking(depth, node, currentDepth, lo, hi) {
    const checkNode = node;
    // console.log(checkNode);

    if (checkNode.keys.length >= CAPACITY) throw new Error('Overflowed node capacity');

    for (let i = 0, kl = checkNode.keys.length - 1; i < kl; i++) {
      if (checkNode.keys[i] >= checkNode.keys[i + 1]) throw new Error('Disordered or duplicate key');
    }

    if (checkNode.type === 'branch') {
      const kids = checkNode.values;
      if (currentDepth === 0) {
        if (kids.length < 2) throw new Error('Underpopulated root');
      } else {
        if (Math.floor(CAPACITY / 2) > kids.length) throw new Error('Underpopulated branch');
      }
      // console.log(checkNode.keys.length, kids.length - 1);
      if (checkNode.keys.length !== kids.length - 1) throw new Error('keys and kids don\'t correspond');
      if (lo.length && lo[0] >= checkNode.keys[0]) throw new Error('lo error');
      if (hi.length && checkNode.keys[checkNode.keys.length - 1] >= hi[0]) throw new Error('hi error');

      for (let i = 0; i < kids.length; i++) {
        const newLo = (i === 0 ? lo : [checkNode.keys[i - 1]]);
        const newHi = (i === checkNode.keys.length ? hi : [checkNode.keys[i]]);
        checking(depth, kids[i], currentDepth + 1, newLo, newHi);
      }
    } else if (checkNode.type === 'leaf') {
      if (currentDepth !== depth) throw new Error('Leaves at different depths');
      const values = checkNode.values;
      if (checkNode.keys.length !== values.length) throw new Error('keys and values don\'t correspond');
      if (currentDepth > 0) {
        if (Math.floor(CAPACITY / 2) > values.length) throw new Error('Underpopulated leaf');
      }
      if (lo.length && lo[0] !== checkNode.keys[0]) throw new Error('lo error (2)');
      if (hi.length && checkNode.keys[checkNode.keys.length - 1] >= hi[0]) throw new Error('hi error (2)');
    } else {
      throw new Error('Bad type');
    }
  }
  let checkNode = bpt;

  let depth = 0;
  while (checkNode.type === 'branch') {
    checkNode = checkNode.values[0];
    depth += 1;
  }

  checking(depth, bpt, 0, [], []);
}

export function fetch(bpt, needleKey, def = null) {
  let node = bpt;

  while (node.type === 'branch') {
    let found = false;
    let i = 0;
    for (let kl = node.keys.length; i < kl; i++) {
      if (needleKey < node.keys[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = node.values.length - 1;
    }
    node = node.values[i];
  }

  let i = 0;
  for (let kl = node.keys.length; i < kl; i++) {
    if (needleKey === node.keys[i]) {
      return node.values[i];
    } else if (needleKey < node.keys[i]) {
      break; // just to finish quicker; not needed for correctness
    }
  }
  return def;
}

function reallyStore(bpt, newKey, value) {
  const path = [];
  let node = bpt;

  // Find the leaf node for newKey, and the path down to it.
  while (node.type === 'branch') {
    let i = 0;
    let found = false;
    for (let kl = node.keys.length; i < kl; i++) {
      if (newKey < node.keys[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      i = node.keys.length;
    }
    path.push({ type: node.type, keys: node.keys, values: node.values, i: i });
    node = node.values[i];
  }

  // Find the index for newKey in the leaf node.
  let i = 0;
  let found = false;
  for (let kl = node.keys.length; i < kl; i++) {
    if (newKey === node.keys[i]) {
      // newKey isn't actually new, so the structure goes unchanged.
      node.values[i] = value;
      return bpt;
    } else if (newKey < node.keys[i]) {
      found = true;
      break;
    }
  }
  if (!found) {
    i = node.keys.length;
  }

  // We'll have to insert it in the leaf at i. If there's room, just do it:
  node.keys.splice(i, 0, newKey);
  node.values.splice(i, 0, value);

  if (node.keys.length < CAPACITY) {
    return bpt;
  }

  // Otherwise split the now-overpacked leaf...
  const mid = Math.floor(CAPACITY / 2);
  let tween = node.keys[mid];
  let left = { type: 'leaf', keys: node.keys.slice(0, mid), values: node.values.slice(0, mid) };
  let right = { type: 'leaf', keys: node.keys.slice(mid), values: node.values.slice(mid) };

  // ...and propagate the split back up the path.
  while (path.length) {
    node = path.pop();
    node.keys.splice(node.i, 0, tween);
    node.values[node.i] = left;
    node.values.splice(node.i + 1, 0, right);
    if (node.keys.length < CAPACITY) {
      return bpt;
    }
    tween = node.keys[mid - 1];
    left = { type: 'branch', keys: node.keys.slice(0, mid - 1), values: node.values.slice(0, mid) };
    right = { type: 'branch', keys: node.keys.slice(mid), values: node.values.slice(mid) };
  }

  // If we got here, we need a new root.
  return { type: 'branch', keys: [tween], values: [left, right] };
}

export function store(bpt, newKey, value) {
  const result = reallyStore(bpt, newKey, value);
  check(result);
  return result;
}

export function init() {
  const result = { type: 'leaf', keys: [], values: [] };
  check(result);
  return result;
}
