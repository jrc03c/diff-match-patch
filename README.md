# Intro

This library is a JS-only fork of Google's [diff-match-patch](https://github.com/google/diff-match-patch) library. Please view the documentation there to learn more.

# Installation

```bash
npm install --save https://github.com/jrc03c/diff-match-patch
```

# Usage

```js
const { DiffMatchPatch } = require("@jrc03c/diff-match-patch")

const text1 = "Help!"
const text2 = "Hello!"

const dmp = new DiffMatchPatch()
const diff = dmp.diffMain(text1, text2)
console.log(dmp.diffLevenshtein(diff))
```

# Testing

Eventually, I'd like to convert the tests into Jest format. But for now, you can run them with:

```bash
# unit tests
node tests/index.test.js

# speed tests
node tests/speed.test.js
```
