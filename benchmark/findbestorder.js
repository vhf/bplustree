// @flow
const BPlusTree = require('../lib/bplustree');
const Benchmark = require('benchmark'); // eslint-disable-line import/no-extraneous-dependencies
const async = require('async'); // eslint-disable-line import/no-extraneous-dependencies
const colors = require('colors'); // eslint-disable-line import/no-extraneous-dependencies
const faker = require('faker'); // eslint-disable-line import/no-extraneous-dependencies
const _ = require('lodash'); // eslint-disable-line import/no-extraneous-dependencies

Benchmark.support.decompilation = false;

const db = [];
const dbSize = 2000;
const bf = 300;

const compileResult = (results: {}): string => {
  const method = [];
  for (let i = 4; i <= bf; i += 2) {
    method.push(`bf ${i}`);
  }

  let text = '';

  for (let i = 0; i < method.length; i++) {
    text += `${method[i]} ${results[i].toFixed(2)} ops/sec\n`;
  }

  text += `\n`;

  const zip = _.zip(method, results);
  const order = _.sortBy(zip, 1).reverse();

  for (let i = 1; i < order.length; i++) {
    const percentage = ((order[i - 1][1] - order[i][1]) / order[i][1]) * 100;
    text += colors.green(`${order[i - 1][0]} is ${percentage.toFixed()}% faster than ${order[i][0]}\n`);
  }

  return text;
};

for (let i = 0; i < dbSize; i++) {
  const rec = {
    key: faker.random.number({ max: 90 }),
    value: faker.name.findName(),
  };
  db.push(rec);
}

const lowerBound = db[Math.floor(dbSize / 5)].key;
const upperBound = db[dbSize - Math.floor(dbSize / 5)].key;

const buildTest = function bt(order: number): {} {
  let tree;
  return {
    name: `bf ${order}`,
    setup: () => {
      tree = new BPlusTree({ order });
      Object.values(db).forEach(({ key, value }) => {
        tree.store(key, value);
      });
    },
    fn: () => {
      const keys = tree.repr({ getKeys: true }).reverse();
      for (let i = 0, kl = keys.length; i < kl; i++) {
        tree.fetch(keys[i], db[keys[i]]);
      }
      for (let i = 0, kl = keys.length; i < kl; i++) {
        tree.remove(keys[i], db[keys[i]]);
      }
      tree.fetchRange(lowerBound, upperBound);
      tree.fetchRange(lowerBound, upperBound);
      tree.fetchRange(lowerBound, upperBound);
    },
  };
};

async.series([
  (done) => {
    const suite = new Benchmark.Suite();
    const results = [];

    for (let i = 4; i <= bf; i += 2) {
      suite.add(buildTest(i));
    }

    suite.on('error', (event) => {
      done(event.target.error);
    });

    suite.on('complete', () => {
      suite.forEach((obj) => { results.push(obj.hz); });
      console.log(compileResult(results));
      done();
    });

    suite.run();
  },
]);
