import * as bptA from './abpt';
import * as bptA2 from './abpt2';
import * as bptO from './obpt';

const Benchmark = require('benchmark');
const suite = new Benchmark.Suite;

const tests = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12];

function test(bpt) {
  let t = bpt.init();
  t = bpt.store(t, 10, 'm');
  t = bpt.store(t, 11, 'n');
  t = bpt.store(t, 12, 'p');
  t = bpt.store(t, 1, 'a');
  t = bpt.store(t, 2, 'b');
  t = bpt.store(t, 3, 'c');
  t = bpt.store(t, 4, 'd');
  t = bpt.store(t, 5, 'e');
  t = bpt.store(t, 6, 'f');
  t = bpt.store(t, 7, 'g');
  t = bpt.store(t, 8, 'h');

  let result = '';
  for (let i = 0, tl = tests.length; i < tl; i++) {
    result += bpt.fetch(t, tests[i]);
  }
}

suite.add('arrays', function() {
  test(bptA);
}).add('arrays - ES5', function() {
  test(bptA2);
}).add('objects', function() {
  test(bptO);
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('compare', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run({ 'async': true });
