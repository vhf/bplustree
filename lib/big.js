import * as bptA from './abpt';
import * as bptO from './obpt';

function test2(bpt) {
  let t = bpt.init();
  for (let i = 0; i < 1000; i++) {
    t = bpt.store(t, i, 'a');
  }
  const r = bpt.fetch(t, 500);
}

test2(bptA);
// test2(bptO);
