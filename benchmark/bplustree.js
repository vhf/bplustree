/*
This file is adapted from bplus-index's benchmark
Copyright (c) 2015, InternalFX
https://github.com/internalfx/bplus-index/blob/master/LICENSE
*/
const _ = require('lodash');
const faker = require('faker');

const BPlusIndex = require('../node_modules/bplus-index/dist/bplus-index');
const BPlusTree = require('../dist/bplustree');
const Benchmark = require('benchmark');
const Set = require('../node_modules/sorted-map');

const async = require('async');
const colors = require('colors');
const fs = require('fs');
const path = require('path');
import {log} from '../utils/log';

const db = [];
const dbSize = 500;
const bf = 6;

let BPlusTree2;

const fullpath = path.resolve('./dist/oldbplustree.js');
let old = true;
try {
  const stats = fs.statSync(fullpath);

  if (stats.isFile()) {
    BPlusTree2 = require('../dist/oldbplustree.js');
  }
} catch (e) {
  old = false;
  BPlusTree2 = BPlusTree;
}

Benchmark.support.decompilation = false;

const finalResults = [];

const compileResult = (results) => {
  let text = '';
  text += `bplus-index ${results[0].toFixed(2)} ops/sec\n`;
  text += `bplustree   ${results[1].toFixed(2)} ops/sec\n`;
  if (old) {
    text += `old         ${results[2].toFixed(2)} ops/sec\n`;
  }
  text += `sorted-map  ${results[old ? 3 : 2].toFixed(2)} ops/sec\n`;
  text += `array       ${results[old ? 4 : 3].toFixed(2)} ops/sec\n`;

  let methods = [
    'bplus-index',
    'bplustree  ',
    'old        ',
    'sorted-map ',
    'array      '];
  if (!old) {
    methods = methods.filter((o) => o !== 'old        ');
  }

  const zip = _.zip(methods, results);
  const order = _.sortBy(zip, 1).reverse();

  for (let i = 1; i < order.length; i++) {
    const speedup = order[i - 1][1] / order[i][1];
    text += colors.green(`${order[i - 1][0]} is ${speedup.toFixed(2)}x faster than ${order[i][0]}`);

    let adj = 'fast';
    if (i === order.length - 1) {
      adj = 'slow';
    }
    if (speedup > 50) {
      text += ` (ultra ${adj})`;
    } else if (speedup > 10) {
      text += ` (${adj})`;
    }
    text += '\n';
  }

  _.map(order, (o, i) => {
    const method = o[0];
    const score = i + 1;
    if (_.find(finalResults, _.matches({ 'method': method })) === undefined) {
      finalResults.push({ method, score, scores: [score] });
    } else {
      const index = _.findIndex(finalResults, { method });
      finalResults[index].score += score;
      finalResults[index].scores.push(score);
    }
  });

  return text;
};

const compileFinalResults = () => {
  const ordered = _.chain(finalResults).sortBy('score').value();
  const max = ordered[0].score;

  let text = 'Final results:\n                     i g a r e\n';
  for (let i = 0; i < ordered.length; i++) {
    const cur = (ordered[i].score / max).toFixed(2);
    const method = ordered[i].method;
    const scores = ordered[i].scores.join(' ');
    text += colors.green(`${cur} -> ${method} (${scores})\n`);
  }
  return text;
};

log('Creating database of ' + dbSize + ' records');
console.time('Done!');
for (let i = 0; i < dbSize; i++) {
  const rec = {
    key: faker.random.number({max: 90}),
    value: faker.name.findName(),
  };
  db.push(rec);
}
console.timeEnd('Done!');

log('\n\n');
log('***********************');
log('Test B+Tree performance');
log('***********************');

async.series([
  (done) => {
    log('\n\nTesting inject(key, value)\n'.yellow);

    const suite = new Benchmark.Suite();
    const results = [];
    let tree;
    let xs;
    let sortedMap;

    suite.add({
      name: 'bplus-index',
      setup: () => {
        tree = new BPlusIndex({debug: false, branchingFactor: bf});
      },
      fn: () => {
        for (const rec of db) {
          tree.inject(rec.key, rec.value);
        }
      },
    });

    suite.add({
      name: 'bplustree',
      setup: () => {
        tree = new BPlusTree({ order: bf });
      },
      fn: () => {
        for (const rec of db) {
          tree.store(rec.key, rec.value);
        }
      },
    });

    if (old) {
      suite.add({
        name: 'old',
        setup: () => {
          tree = new BPlusTree2({ order: bf });
        },
        fn: () => {
          for (const rec of db) {
            tree.store(rec.key, rec.value);
          }
        },
      });
    }

    suite.add({
      name: 'sorted-map',
      setup: () => {
        sortedMap = new Set();
      },
      fn: () => {
        for (const rec of db) {
          sortedMap.set(rec.key, rec.value);
        }
      },
    });

    suite.add({
      name: 'array',
      setup: () => {
        xs = [];
      },
      fn: () => {
        for (const rec of db) {
          xs.push({key: rec.key, val: rec.value});
        }
      },
    });

    suite.on('error', (event) => {
      done(event.target.error);
    });

    suite.on('complete', () => {
      suite.forEach((obj) => { results.push(obj.hz); });
      log(compileResult(results));
      done();
    });

    suite.run();
  },

  (done) => {
    log('\n\nTesting get(key)\n'.yellow);

    const suite = new Benchmark.Suite();
    const results = [];
    const tree = new BPlusIndex({debug: false, branchingFactor: bf});
    const tree2 = new BPlusTree({ order: bf });
    const tree3 = new BPlusTree2({ order: bf });
    const sortedMap = new Set();
    const xs = [];
    const randKeys = _.chain(db).pluck('key').shuffle().value();

    for (const rec of db) {
      tree.inject(rec.key, rec.value);
      tree2.store(rec.key, rec.value);
      tree3.store(rec.key, rec.value);
      sortedMap.set(rec.key, rec.value);
      xs.push({key: rec.key, val: rec.value});
    }

    suite.add({
      name: 'bplus-index',
      fn: () => {
        for (let i = 0; i < 25; i++) {
          tree.get(randKeys[i]);
        }
      },
    });

    suite.add({
      name: 'bplustree',
      fn: () => {
        for (let i = 0; i < 25; i++) {
          tree2.fetch(randKeys[i]);
        }
      },
    });

    if (old) {
      suite.add({
        name: 'old',
        fn: () => {
          for (let i = 0; i < 25; i++) {
            tree3.fetch(randKeys[i]);
          }
        },
      });
    }

    suite.add({
      name: 'sorted-map',
      fn: () => {
        for (let i = 0; i < 25; i++) {
          sortedMap.get(randKeys[i]);
        }
      },
    });

    suite.add({
      name: 'array',
      fn: () => {
        for (let i = 0; i < 25; i++) {
          _.filter(xs, {key: randKeys[i]});
        }
      },
    });

    suite.on('error', (event) => {
      done(event.target.error);
    });

    suite.on('complete', () => {
      suite.forEach((obj) => { results.push(obj.hz); });
      log(compileResult(results));
      done();
    });

    suite.run();
  },

  (done) => {
    log('\n\nTesting getAll()\n'.yellow);

    const suite = new Benchmark.Suite();
    const results = [];
    const tree = new BPlusIndex({debug: false, branchingFactor: bf});
    const tree2 = new BPlusTree({ order: bf });
    const tree3 = new BPlusTree({ order: bf });
    const sortedMap = new Set();
    const xs = [];

    for (const rec of db) {
      tree.inject(rec.key, rec.value);
      tree2.store(rec.key, rec.value);
      tree3.store(rec.key, rec.value);
      sortedMap.set(rec.key, rec.value);
      xs.push({key: rec.key, val: rec.value});
    }

    suite.add({
      name: 'bplus-index',
      fn: () => {
        tree.getAll({sortDescending: false});
      },
    });

    suite.add({
      name: 'bplustree',
      fn: () => {
        tree2.repr(false, true);
      },
    });

    if (old) {
      suite.add({
        name: 'old',
        fn: () => {
          tree3.repr(false, true);
        },
      });
    }

    suite.add({
      name: 'sorted-map',
      fn: () => {
        sortedMap.range();
      },
    });

    suite.add({
      name: 'array',
      fn: () => {
        _.sortByOrder(xs, ['key'], ['asc']);
      },
    });

    suite.on('error', (event) => {
      done(event.target.error);
    });

    suite.on('complete', () => {
      suite.forEach((obj) => { results.push(obj.hz); });
      log(compileResult(results));
      done();
    });

    suite.run();
  },

  (done) => {
    log('\n\nTesting getRange(lowerBound, upperBound)\n'.yellow);

    const suite = new Benchmark.Suite();
    const results = [];
    const tree = new BPlusIndex({debug: false, branchingFactor: bf});
    const tree2 = new BPlusTree({ order: bf });
    const tree3 = new BPlusTree2({ order: bf });
    const sortedMap = new Set();
    const xs = [];

    for (const rec of db) {
      tree.inject(rec.key, rec.value);
      tree2.store(rec.key, rec.value);
      tree3.store(rec.key, rec.value);
      sortedMap.set(rec.key, rec.value);
      xs.push({key: rec.key, val: rec.value});
    }

    const lowerBound = db[Math.floor(dbSize / 5)].key;
    const upperBound = db[dbSize - Math.floor(dbSize / 5)].key;

    suite.add({
      name: 'bplus-index',
      fn: () => {
        tree.getRange(lowerBound, upperBound, {upperInclusive: true});
      },
    });

    suite.add({
      name: 'bplustree',
      fn: () => {
        tree2.fetchRange(lowerBound, upperBound);
      },
    });

    if (old) {
      suite.add({
        name: 'old',
        fn: () => {
          tree3.fetchRange(lowerBound, upperBound);
        },
      });
    }

    suite.add({
      name: 'sorted-map',
      fn: () => {
        sortedMap.range(lowerBound, upperBound);
      },
    });

    suite.add({
      name: 'array',
      fn: () => {
        const left = _.findIndex(xs, (x) => x.key === lowerBound);
        let range = xs.slice(left);
        const right = _.findIndex(range, (x) => x.key === upperBound);
        range = range.slice(0, right);
      },
    });

    suite.on('error', (event) => {
      done(event.target.error);
    });

    suite.on('complete', () => {
      suite.forEach((obj) => { results.push(obj.hz); });
      log(compileResult(results));
      done();
    });

    suite.run();
  },

  (done) => {
    log('\n\nTesting eject(key, value)\n'.yellow);

    const suite = new Benchmark.Suite();
    const results = [];
    let tree;
    let tree2;
    let tree3;
    let xs;
    let sortedMap;
    const randRecs = _.shuffle(db);

    suite.add({
      name: 'bplus-index',
      setup: () => {
        tree = new BPlusIndex({debug: false, branchingFactor: bf});
        for (const rec of db) {
          tree.inject(rec.key, rec.value);
        }
      },
      fn: () => {
        for (let i = 0; i < 25; i++) {
          tree.eject(randRecs[i].key, randRecs[i].name);
        }
      },
    });

    suite.add({
      name: 'bplustree',
      setup: () => {
        tree2 = new BPlusTree({ order: bf });
        for (const rec of db) {
          tree2.store(rec.key, rec.value);
        }
      },
      fn: () => {
        for (let i = 0; i < 25; i++) {
          tree2.remove(randRecs[i].key, randRecs[i].value);
        }
      },
    });

    if (old) {
      suite.add({
        name: 'old',
        setup: () => {
          tree3 = new BPlusTree2({ order: bf });
          for (const rec of db) {
            tree3.store(rec.key, rec.value);
          }
        },
        fn: () => {
          for (let i = 0; i < 25; i++) {
            tree3.remove(randRecs[i].key, randRecs[i].value);
          }
        },
      });
    }

    suite.add({
      name: 'sorted-map',
      setup: () => {
        sortedMap = new Set();
        for (const rec of db) {
          sortedMap.set(rec.key, rec.value);
        }
      },
      fn: () => {
        for (let i = 0; i < 25; i++) {
          sortedMap.del(randRecs[i].key);
        }
      },
    });

    suite.add({
      name: 'array',
      setup: () => {
        xs = [];
        for (const rec of db) {
          xs.push({key: rec.key, val: rec.value});
        }
      },
      fn: () => {
        for (let i = 0; i < 25; i++) {
          _.remove(xs, {key: randRecs[i].key, val: randRecs[i].name});
        }
      },
    });

    suite.on('error', (event) => {
      done(event.target.error);
    });

    suite.on('complete', () => {
      suite.forEach((obj) => { results.push(obj.hz); });
      log(compileResult(results));
      log(compileFinalResults());
      done();
    });

    suite.run();
  },
]);
