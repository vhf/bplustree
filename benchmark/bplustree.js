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
const colors = require('colors');
const async = require('async');
import {log} from '../utils/log';

Benchmark.support.decompilation = false;

const compileResult = (results) => {
  let text = `
bplus-index ${results[0].toFixed(2)} ops/sec
bplustree   ${results[1].toFixed(2)} ops/sec
array       ${results[2].toFixed(2)} ops/sec\n`;

  const method = ['bplus-index', 'bplustree', 'array'];
  const zip = _.zip(method, results);
  const order = _.sortBy(zip, 1).reverse();

  for (let i = 1; i < order.length; i++) {
    const percentage = ((order[0][1] - order[i][1]) / order[i][1]) * 100;
    text += colors.green(`${order[0][0]} is ${percentage.toFixed()}% faster than ${order[i][0]}\n`);
  }
  const percentage = ((order[method.length - 2][1] - order[method.length - 1][1]) / order[method.length - 1][1]) * 100;
  text += colors.green(`${order[method.length - 2][0]} is ${percentage.toFixed()}% faster than ${order[method.length - 1][0]}\n`);

  return text;
};

const db = [];
const dbSize = 5000;
const bf = 50;

log('Creating database of ' + dbSize + ' records');
console.time('Done!');
for (let i = 0; i < dbSize; i++) {
  // const rec = {
  //   age: faker.random.number({max: 90}),
  //   name: faker.name.findName(),
  // };
  const rec = {
    key: i + 1,
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
        tree = new BPlusTree(bf);
      },
      fn: () => {
        for (const rec of db) {
          tree.store(rec.key, rec.value);
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
    const tree2 = new BPlusTree(bf);
    const xs = [];
    let randKey;

    for (const rec of db) {
      tree.inject(rec.key, rec.value);
      tree2.store(rec.key, rec.value);
      xs.push({key: rec.key, val: rec.value});
    }

    suite.add({
      name: 'bplus-index',
      setup: () => {
        randKey = db[_.random(0, dbSize - 1)].key;
      },
      fn: () => {
        tree.get(randKey);
      },
    });

    suite.add({
      name: 'bplustree',
      setup: () => {
        randKey = db[_.random(0, dbSize - 1)].key;
      },
      fn: () => {
        tree2.fetch(randKey);
      },
    });

    suite.add({
      name: 'array',
      setup: () => {
        randKey = db[_.random(0, dbSize - 1)].key;
      },
      fn: () => {
        _.filter(xs, {key: randKey});
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
    log('\n\nTesting getAll({sortDescending: false})\n'.yellow);

    const suite = new Benchmark.Suite();
    const results = [];
    const tree = new BPlusIndex({debug: false, branchingFactor: bf});
    const tree2 = new BPlusTree(bf);
    const xs = [];

    for (const rec of db) {
      tree.inject(rec.key, rec.value);
      tree2.store(rec.key, rec.value);
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
    log('\n\nTesting getAll({sortDescending: true})\n'.yellow);

    const suite = new Benchmark.Suite();
    const results = [];
    const tree = new BPlusIndex({debug: false, branchingFactor: bf});
    const tree2 = new BPlusTree(bf);
    const xs = [];

    for (const rec of db) {
      tree.inject(rec.key, rec.value);
      tree2.store(rec.key, rec.value);
      xs.push({key: rec.key, val: rec.value});
    }

    suite.add({
      name: 'bplus-index',
      fn: () => {
        tree.getAll({sortDescending: true});
      },
    });

    suite.add({
      name: 'bplustree',
      fn: () => {
        tree2.repr(false, true, true);
      },
    });

    suite.add({
      name: 'array',
      fn: () => {
        _.sortByOrder(xs, ['key'], ['desc']);
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
    const tree2 = new BPlusTree(bf);
    const xs = [];

    for (const rec of db) {
      tree.inject(rec.key, rec.value);
      tree2.store(rec.key, rec.value);
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
    let xs;
    let randRec;

    suite.add({
      name: 'bplus-index',
      setup: () => {
        tree = new BPlusIndex({debug: false, branchingFactor: bf});
        for (const rec of db) {
          tree.inject(rec.key, rec.value);
        }
        randRec = db[_.random(0, dbSize - 1)];
      },
      fn: () => {
        tree.eject(randRec.key, randRec.name);
      },
    });

    suite.add({
      name: 'bplustree',
      setup: () => {
        tree2 = new BPlusTree(bf);
        for (const rec of db) {
          tree2.store(rec.key, rec.value);
        }
        randRec = db[_.random(0, dbSize - 1)];
      },
      fn: () => {
        tree2.remove(randRec.key);
      },
    });

    suite.add({
      name: 'array',
      setup: () => {
        xs = [];
        for (const rec of db) {
          xs.push({key: rec.key, val: rec.value});
        }
        randRec = db[_.random(0, dbSize - 1)];
      },
      fn: () => {
        _.remove(xs, {key: randRec.key, val: randRec.name});
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
]);
