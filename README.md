# bplustree
[![npm version](https://img.shields.io/npm/v/bplustree.svg)](https://www.npmjs.com/package/bplustree) [![Build Status](https://img.shields.io/travis/vhf/bplustree.svg)](https://travis-ci.org/vhf/bplustree) [![Coverage Status](https://coveralls.io/repos/vhf/bplustree/badge.svg?branch=master&service=github)](https://coveralls.io/github/vhf/bplustree?branch=master)

Another JavaScript <a href="https://en.wikipedia.org/wiki/B%2B_tree" target="_blank">B+ tree</a> implementation.

# Features

* Insert
* Delete
* Fetch
* Fetch ranges
* Fetch as generator
* Check tree invariants

# Installation

`npm install bplustree`

# Very Basic Usage (useless)

`const BPlusTree = require('bplustree');`

# Much Better Documentation (useful)

[API / Documentation](https://rawgit.com/vhf/bplustree/master/docs/BPlusTree.html)

# Tests, coverage, etc

- `npm run build` builds the project
- `npm run test` runs most tests
- `npm run test-full` runs all tests
- `npm run coverage` generates most coverage
- `npm run coverage-full` generates full coverage
- `npm run doc` generates the jsdoc documentation

# License

MIT

# Acknowledgement

- This implementation is based on @darius' work: [bplustree.py](https://github.com/darius/sketchbook/blob/master/trees/bplustrees.py)
- @tehgeekmeister's notes on [B+ Trees](https://github.com/tehgeekmeister/dadabass/blob/master/notes/b_plus_tree.md) were also very helpful
- The [`_genGetKeyFn`](https://github.com/vhf/bplustree/blob/9e0192dd8d591a7e1a29370edbe5a119a038e0db/lib/bplustree.js#L374-L379) function is courtesy of @martinmaillard
