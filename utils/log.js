const util = require('util');

export function log(...obj) {
  const result = [];
  for (let i = 0; i < obj.length; i++) {
    if (typeof obj[i] === 'string') {
      result.push(obj[i]);
    } else {
      result.push(util.inspect(obj[i], false, null));
    }
  }
  console.log(...result);
}
