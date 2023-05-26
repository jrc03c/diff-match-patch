# Intro

This library is a JS-only fork of Google's [diff-match-patch](https://github.com/google/diff-match-patch) library. Please view the documentation there to learn more. I created this fork mainly to make the library easily installable via NPM. Please consult the `NOTICE` file for more information about the ways I changed the library from its original version.

# Installation

```bash
npm install --save https://github.com/jrc03c/diff-match-patch
```

# Usage

Import in Node or bundlers:

```js
const { DiffMatchPatch } = require("@jrc03c/diff-match-patch")
```

Or import in the browser:

```html
<!-- This defines `DiffMatchPatch` as a global variable -->
<script src="path/to/dist/diff-match-patch.js"></script>
```

Then:

```js
const text1 = "Help!"
const text2 = "Hello!"
const dmp = new DiffMatchPatch()
const diff = dmp.diffMain(text1, text2)
console.log(dmp.diffLevenshtein(diff)) // 2
```

# Testing

Eventually, I'd like to convert the tests into Jest format. But for now, you can run them with:

```bash
# unit tests
node tests/index.test.js

# speed tests
node tests/speed.test.js
```
