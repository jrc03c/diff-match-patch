const { DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT, DiffMatchPatch } = require("..")
const { isEqual } = require("@jrc03c/js-math-tools")

/**
 * Diff Match and Patch -- Test Harness
 * Copyright 2018 The diff-match-patch Authors.
 * https://github.com/google/diff-match-patch
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If expected and actual are the equivalent, pass the test.
function assertEquivalent(msg, expected, actual) {
  if (typeof actual == "undefined") {
    // msg is optional.
    actual = expected
    expected = msg
    msg = "Expected: '" + expected + "' Actual: '" + actual + "'"
  }

  if (_equivalent(expected, actual)) {
    return assertEquals(msg, String(expected), String(actual))
  } else {
    return assertEquals(msg, expected, actual)
  }
}

// Are a and b the equivalent? -- Recursive.
function _equivalent(a, b) {
  if (a == b) {
    return true
  }

  if (
    typeof a == "object" &&
    typeof b == "object" &&
    a !== null &&
    b !== null
  ) {
    if (a.toString() != b.toString()) {
      return false
    }

    for (const p in a) {
      if (p in a && !_equivalent(a[p], b[p])) {
        return false
      }
    }

    for (const p in b) {
      if (p in a && !_equivalent(a[p], b[p])) {
        return false
      }
    }

    return true
  }

  return false
}

function diffRebuildtexts(diffs) {
  // Construct the two texts which made up the diff originally.
  let text1 = ""
  let text2 = ""

  for (let x = 0; x < diffs.length; x++) {
    if (diffs[x][0] != DIFF_INSERT) {
      text1 += diffs[x][1]
    }
    if (diffs[x][0] != DIFF_DELETE) {
      text2 += diffs[x][1]
    }
  }

  return [text1, text2]
}

const dmp = new DiffMatchPatch()

// DIFF TEST FUNCTIONS

function testDiffCommonPrefix() {
  // Detect any common prefix.
  // Null case.
  assertEquals(0, dmp.diffCommonPrefix("abc", "xyz"))

  // Non-null case.
  assertEquals(4, dmp.diffCommonPrefix("1234abcdef", "1234xyz"))

  // Whole case.
  assertEquals(4, dmp.diffCommonPrefix("1234", "1234xyz"))
}

function testDiffCommonSuffix() {
  // Detect any common suffix.
  // Null case.
  assertEquals(0, dmp.diffCommonSuffix("abc", "xyz"))

  // Non-null case.
  assertEquals(4, dmp.diffCommonSuffix("abcdef1234", "xyz1234"))

  // Whole case.
  assertEquals(4, dmp.diffCommonSuffix("1234", "xyz1234"))
}

function testDiffCommonOverlap() {
  // Detect any suffix/prefix overlap.
  // Null case.
  assertEquals(0, dmp.diffCommonOverlap_("", "abcd"))

  // Whole case.
  assertEquals(3, dmp.diffCommonOverlap_("abc", "abcd"))

  // No overlap.
  assertEquals(0, dmp.diffCommonOverlap_("123456", "abcd"))

  // Overlap.
  assertEquals(3, dmp.diffCommonOverlap_("123456xxx", "xxxabcd"))

  // Unicode.
  // Some overly clever languages (C#) may treat ligatures as equal to their
  // component letters.  E.g. U+FB01 == 'fi'
  assertEquals(0, dmp.diffCommonOverlap_("fi", "\ufb01i"))
}

function testDiffHalfMatch() {
  // Detect a halfmatch.
  dmp.diffTimeout = 1

  // No match.
  assertEquals(null, dmp.diffHalfMatch_("1234567890", "abcdef"))

  assertEquals(null, dmp.diffHalfMatch_("12345", "23"))

  // Single Match.
  assertEquivalent(
    ["12", "90", "a", "z", "345678"],
    dmp.diffHalfMatch_("1234567890", "a345678z")
  )

  assertEquivalent(
    ["a", "z", "12", "90", "345678"],
    dmp.diffHalfMatch_("a345678z", "1234567890")
  )

  assertEquivalent(
    ["abc", "z", "1234", "0", "56789"],
    dmp.diffHalfMatch_("abc56789z", "1234567890")
  )

  assertEquivalent(
    ["a", "xyz", "1", "7890", "23456"],
    dmp.diffHalfMatch_("a23456xyz", "1234567890")
  )

  // Multiple Matches.
  assertEquivalent(
    ["12123", "123121", "a", "z", "1234123451234"],
    dmp.diffHalfMatch_("121231234123451234123121", "a1234123451234z")
  )

  assertEquivalent(
    ["", "-=-=-=-=-=", "x", "", "x-=-=-=-=-=-=-="],
    dmp.diffHalfMatch_("x-=-=-=-=-=-=-=-=-=-=-=-=", "xx-=-=-=-=-=-=-=")
  )

  assertEquivalent(
    ["-=-=-=-=-=", "", "", "y", "-=-=-=-=-=-=-=y"],
    dmp.diffHalfMatch_("-=-=-=-=-=-=-=-=-=-=-=-=y", "-=-=-=-=-=-=-=yy")
  )

  // Non-optimal halfmatch.
  // Optimal diff would be -q+x=H-i+e=lloHe+Hu=llo-Hew+y not -qHillo+x=HelloHe-w+Hulloy
  assertEquivalent(
    ["qHillo", "w", "x", "Hulloy", "HelloHe"],
    dmp.diffHalfMatch_("qHilloHelloHew", "xHelloHeHulloy")
  )

  // Optimal no halfmatch.
  dmp.diffTimeout = 0
  assertEquals(null, dmp.diffHalfMatch_("qHilloHelloHew", "xHelloHeHulloy"))
}

function testDiffLinesToChars() {
  function assertLinesToCharsResultEquals(a, b) {
    assertEquals(a.chars1, b.chars1)
    assertEquals(a.chars2, b.chars2)
    assertEquivalent(a.lineArray, b.lineArray)
  }

  // Convert lines down to characters.
  assertLinesToCharsResultEquals(
    {
      chars1: "\x01\x02\x01",
      chars2: "\x02\x01\x02",
      lineArray: ["", "alpha\n", "beta\n"],
    },
    dmp.diffLinesToChars_("alpha\nbeta\nalpha\n", "beta\nalpha\nbeta\n")
  )

  assertLinesToCharsResultEquals(
    {
      chars1: "",
      chars2: "\x01\x02\x03\x03",
      lineArray: ["", "alpha\r\n", "beta\r\n", "\r\n"],
    },
    dmp.diffLinesToChars_("", "alpha\r\nbeta\r\n\r\n\r\n")
  )

  assertLinesToCharsResultEquals(
    { chars1: "\x01", chars2: "\x02", lineArray: ["", "a", "b"] },
    dmp.diffLinesToChars_("a", "b")
  )

  // More than 256 to reveal any 8-bit limitations.
  const n = 300
  let lineList = []
  const charList = []

  for (let i = 1; i < n + 1; i++) {
    lineList[i - 1] = i + "\n"
    charList[i - 1] = String.fromCharCode(i)
  }

  assertEquals(n, lineList.length)

  const lines = lineList.join("")
  const chars = charList.join("")
  assertEquals(n, chars.length)

  lineList.unshift("")

  assertLinesToCharsResultEquals(
    { chars1: chars, chars2: "", lineArray: lineList },
    dmp.diffLinesToChars_(lines, "")
  )
}

function testDiffCharsToLines() {
  // Convert chars up to lines.
  let diffs = [
    [DIFF_EQUAL, "\x01\x02\x01"],
    [DIFF_INSERT, "\x02\x01\x02"],
  ]

  dmp.diffCharsToLines_(diffs, ["", "alpha\n", "beta\n"])

  assertEquivalent(
    [
      [DIFF_EQUAL, "alpha\nbeta\nalpha\n"],
      [DIFF_INSERT, "beta\nalpha\nbeta\n"],
    ],
    diffs
  )

  // More than 256 to reveal any 8-bit limitations.
  const n = 300
  let lineList = []
  const charList = []

  for (let i = 1; i < n + 1; i++) {
    lineList[i - 1] = i + "\n"
    charList[i - 1] = String.fromCharCode(i)
  }

  assertEquals(n, lineList.length)

  const lines = lineList.join("")
  let chars = charList.join("")
  assertEquals(n, chars.length)

  lineList.unshift("")
  diffs = [[DIFF_DELETE, chars]]
  dmp.diffCharsToLines_(diffs, lineList)
  assertEquivalent([[DIFF_DELETE, lines]], diffs)

  // More than 65536 to verify any 16-bit limitation.
  lineList = []

  for (let i = 0; i < 66000; i++) {
    lineList[i] = i + "\n"
  }

  chars = lineList.join("")
  const results = dmp.diffLinesToChars_(chars, "")
  diffs = [[DIFF_INSERT, results.chars1]]
  dmp.diffCharsToLines_(diffs, results.lineArray)
  assertEquals(chars, diffs[0][1])
}

function testDiffCleanupMerge() {
  // Cleanup a messy diff.
  // Null case.
  let diffs = []
  dmp.diffCleanupMerge(diffs)
  assertEquivalent([], diffs)

  // No change case.
  diffs = [
    [DIFF_EQUAL, "a"],
    [DIFF_DELETE, "b"],
    [DIFF_INSERT, "c"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "a"],
      [DIFF_DELETE, "b"],
      [DIFF_INSERT, "c"],
    ],
    diffs
  )

  // Merge equalities.
  diffs = [
    [DIFF_EQUAL, "a"],
    [DIFF_EQUAL, "b"],
    [DIFF_EQUAL, "c"],
  ]

  dmp.diffCleanupMerge(diffs)
  assertEquivalent([[DIFF_EQUAL, "abc"]], diffs)

  // Merge deletions.
  diffs = [
    [DIFF_DELETE, "a"],
    [DIFF_DELETE, "b"],
    [DIFF_DELETE, "c"],
  ]

  dmp.diffCleanupMerge(diffs)
  assertEquivalent([[DIFF_DELETE, "abc"]], diffs)

  // Merge insertions.
  diffs = [
    [DIFF_INSERT, "a"],
    [DIFF_INSERT, "b"],
    [DIFF_INSERT, "c"],
  ]

  dmp.diffCleanupMerge(diffs)
  assertEquivalent([[DIFF_INSERT, "abc"]], diffs)

  // Merge interweave.
  diffs = [
    [DIFF_DELETE, "a"],
    [DIFF_INSERT, "b"],
    [DIFF_DELETE, "c"],
    [DIFF_INSERT, "d"],
    [DIFF_EQUAL, "e"],
    [DIFF_EQUAL, "f"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "ac"],
      [DIFF_INSERT, "bd"],
      [DIFF_EQUAL, "ef"],
    ],
    diffs
  )

  // Prefix and suffix detection.
  diffs = [
    [DIFF_DELETE, "a"],
    [DIFF_INSERT, "abc"],
    [DIFF_DELETE, "dc"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "a"],
      [DIFF_DELETE, "d"],
      [DIFF_INSERT, "b"],
      [DIFF_EQUAL, "c"],
    ],
    diffs
  )

  // Prefix and suffix detection with equalities.
  diffs = [
    [DIFF_EQUAL, "x"],
    [DIFF_DELETE, "a"],
    [DIFF_INSERT, "abc"],
    [DIFF_DELETE, "dc"],
    [DIFF_EQUAL, "y"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "xa"],
      [DIFF_DELETE, "d"],
      [DIFF_INSERT, "b"],
      [DIFF_EQUAL, "cy"],
    ],
    diffs
  )

  // Slide edit left.
  diffs = [
    [DIFF_EQUAL, "a"],
    [DIFF_INSERT, "ba"],
    [DIFF_EQUAL, "c"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_INSERT, "ab"],
      [DIFF_EQUAL, "ac"],
    ],
    diffs
  )

  // Slide edit right.
  diffs = [
    [DIFF_EQUAL, "c"],
    [DIFF_INSERT, "ab"],
    [DIFF_EQUAL, "a"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "ca"],
      [DIFF_INSERT, "ba"],
    ],
    diffs
  )

  // Slide edit left recursive.
  diffs = [
    [DIFF_EQUAL, "a"],
    [DIFF_DELETE, "b"],
    [DIFF_EQUAL, "c"],
    [DIFF_DELETE, "ac"],
    [DIFF_EQUAL, "x"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abc"],
      [DIFF_EQUAL, "acx"],
    ],
    diffs
  )

  // Slide edit right recursive.
  diffs = [
    [DIFF_EQUAL, "x"],
    [DIFF_DELETE, "ca"],
    [DIFF_EQUAL, "c"],
    [DIFF_DELETE, "b"],
    [DIFF_EQUAL, "a"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "xca"],
      [DIFF_DELETE, "cba"],
    ],
    diffs
  )

  // Empty merge.
  diffs = [
    [DIFF_DELETE, "b"],
    [DIFF_INSERT, "ab"],
    [DIFF_EQUAL, "c"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_INSERT, "a"],
      [DIFF_EQUAL, "bc"],
    ],
    diffs
  )

  // Empty equality.
  diffs = [
    [DIFF_EQUAL, ""],
    [DIFF_INSERT, "a"],
    [DIFF_EQUAL, "b"],
  ]

  dmp.diffCleanupMerge(diffs)

  assertEquivalent(
    [
      [DIFF_INSERT, "a"],
      [DIFF_EQUAL, "b"],
    ],
    diffs
  )
}

function testDiffCleanupSemanticLossless() {
  // Slide diffs to match logical boundaries.
  // Null case.
  let diffs = []
  dmp.diffCleanupSemanticLossless(diffs)
  assertEquivalent([], diffs)

  // Blank lines.
  diffs = [
    [DIFF_EQUAL, "AAA\r\n\r\nBBB"],
    [DIFF_INSERT, "\r\nDDD\r\n\r\nBBB"],
    [DIFF_EQUAL, "\r\nEEE"],
  ]

  dmp.diffCleanupSemanticLossless(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "AAA\r\n\r\n"],
      [DIFF_INSERT, "BBB\r\nDDD\r\n\r\n"],
      [DIFF_EQUAL, "BBB\r\nEEE"],
    ],
    diffs
  )

  // Line boundaries.
  diffs = [
    [DIFF_EQUAL, "AAA\r\nBBB"],
    [DIFF_INSERT, " DDD\r\nBBB"],
    [DIFF_EQUAL, " EEE"],
  ]

  dmp.diffCleanupSemanticLossless(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "AAA\r\n"],
      [DIFF_INSERT, "BBB DDD\r\n"],
      [DIFF_EQUAL, "BBB EEE"],
    ],
    diffs
  )

  // Word boundaries.
  diffs = [
    [DIFF_EQUAL, "The c"],
    [DIFF_INSERT, "ow and the c"],
    [DIFF_EQUAL, "at."],
  ]

  dmp.diffCleanupSemanticLossless(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "The "],
      [DIFF_INSERT, "cow and the "],
      [DIFF_EQUAL, "cat."],
    ],
    diffs
  )

  // Alphanumeric boundaries.
  diffs = [
    [DIFF_EQUAL, "The-c"],
    [DIFF_INSERT, "ow-and-the-c"],
    [DIFF_EQUAL, "at."],
  ]

  dmp.diffCleanupSemanticLossless(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "The-"],
      [DIFF_INSERT, "cow-and-the-"],
      [DIFF_EQUAL, "cat."],
    ],
    diffs
  )

  // Hitting the start.
  diffs = [
    [DIFF_EQUAL, "a"],
    [DIFF_DELETE, "a"],
    [DIFF_EQUAL, "ax"],
  ]

  dmp.diffCleanupSemanticLossless(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "a"],
      [DIFF_EQUAL, "aax"],
    ],
    diffs
  )

  // Hitting the end.
  diffs = [
    [DIFF_EQUAL, "xa"],
    [DIFF_DELETE, "a"],
    [DIFF_EQUAL, "a"],
  ]

  dmp.diffCleanupSemanticLossless(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "xaa"],
      [DIFF_DELETE, "a"],
    ],
    diffs
  )

  // Sentence boundaries.
  diffs = [
    [DIFF_EQUAL, "The xxx. The "],
    [DIFF_INSERT, "zzz. The "],
    [DIFF_EQUAL, "yyy."],
  ]

  dmp.diffCleanupSemanticLossless(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "The xxx."],
      [DIFF_INSERT, " The zzz."],
      [DIFF_EQUAL, " The yyy."],
    ],
    diffs
  )
}

function testDiffCleanupSemantic() {
  // Cleanup semantically trivial equalities.
  // Null case.
  let diffs = []
  dmp.diffCleanupSemantic(diffs)
  assertEquivalent([], diffs)

  // No elimination #1.
  diffs = [
    [DIFF_DELETE, "ab"],
    [DIFF_INSERT, "cd"],
    [DIFF_EQUAL, "12"],
    [DIFF_DELETE, "e"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "ab"],
      [DIFF_INSERT, "cd"],
      [DIFF_EQUAL, "12"],
      [DIFF_DELETE, "e"],
    ],
    diffs
  )

  // No elimination #2.
  diffs = [
    [DIFF_DELETE, "abc"],
    [DIFF_INSERT, "ABC"],
    [DIFF_EQUAL, "1234"],
    [DIFF_DELETE, "wxyz"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abc"],
      [DIFF_INSERT, "ABC"],
      [DIFF_EQUAL, "1234"],
      [DIFF_DELETE, "wxyz"],
    ],
    diffs
  )

  // Simple elimination.
  diffs = [
    [DIFF_DELETE, "a"],
    [DIFF_EQUAL, "b"],
    [DIFF_DELETE, "c"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abc"],
      [DIFF_INSERT, "b"],
    ],
    diffs
  )

  // Backpass elimination.
  diffs = [
    [DIFF_DELETE, "ab"],
    [DIFF_EQUAL, "cd"],
    [DIFF_DELETE, "e"],
    [DIFF_EQUAL, "f"],
    [DIFF_INSERT, "g"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abcdef"],
      [DIFF_INSERT, "cdfg"],
    ],
    diffs
  )

  // Multiple eliminations.
  diffs = [
    [DIFF_INSERT, "1"],
    [DIFF_EQUAL, "A"],
    [DIFF_DELETE, "B"],
    [DIFF_INSERT, "2"],
    [DIFF_EQUAL, "_"],
    [DIFF_INSERT, "1"],
    [DIFF_EQUAL, "A"],
    [DIFF_DELETE, "B"],
    [DIFF_INSERT, "2"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "AB_AB"],
      [DIFF_INSERT, "1A2_1A2"],
    ],
    diffs
  )

  // Word boundaries.
  diffs = [
    [DIFF_EQUAL, "The c"],
    [DIFF_DELETE, "ow and the c"],
    [DIFF_EQUAL, "at."],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_EQUAL, "The "],
      [DIFF_DELETE, "cow and the "],
      [DIFF_EQUAL, "cat."],
    ],
    diffs
  )

  // No overlap elimination.
  diffs = [
    [DIFF_DELETE, "abcxx"],
    [DIFF_INSERT, "xxdef"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abcxx"],
      [DIFF_INSERT, "xxdef"],
    ],
    diffs
  )

  // Overlap elimination.
  diffs = [
    [DIFF_DELETE, "abcxxx"],
    [DIFF_INSERT, "xxxdef"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abc"],
      [DIFF_EQUAL, "xxx"],
      [DIFF_INSERT, "def"],
    ],
    diffs
  )

  // Reverse overlap elimination.
  diffs = [
    [DIFF_DELETE, "xxxabc"],
    [DIFF_INSERT, "defxxx"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_INSERT, "def"],
      [DIFF_EQUAL, "xxx"],
      [DIFF_DELETE, "abc"],
    ],
    diffs
  )

  // Two overlap eliminations.
  diffs = [
    [DIFF_DELETE, "abcd1212"],
    [DIFF_INSERT, "1212efghi"],
    [DIFF_EQUAL, "----"],
    [DIFF_DELETE, "A3"],
    [DIFF_INSERT, "3BC"],
  ]

  dmp.diffCleanupSemantic(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abcd"],
      [DIFF_EQUAL, "1212"],
      [DIFF_INSERT, "efghi"],
      [DIFF_EQUAL, "----"],
      [DIFF_DELETE, "A"],
      [DIFF_EQUAL, "3"],
      [DIFF_INSERT, "BC"],
    ],
    diffs
  )
}

function testDiffCleanupEfficiency() {
  // Cleanup operationally trivial equalities.
  dmp.diffEditCost = 4

  // Null case.
  let diffs = []
  dmp.diffCleanupEfficiency(diffs)
  assertEquivalent([], diffs)

  // No elimination.
  diffs = [
    [DIFF_DELETE, "ab"],
    [DIFF_INSERT, "12"],
    [DIFF_EQUAL, "wxyz"],
    [DIFF_DELETE, "cd"],
    [DIFF_INSERT, "34"],
  ]

  dmp.diffCleanupEfficiency(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "ab"],
      [DIFF_INSERT, "12"],
      [DIFF_EQUAL, "wxyz"],
      [DIFF_DELETE, "cd"],
      [DIFF_INSERT, "34"],
    ],
    diffs
  )

  // Four-edit elimination.
  diffs = [
    [DIFF_DELETE, "ab"],
    [DIFF_INSERT, "12"],
    [DIFF_EQUAL, "xyz"],
    [DIFF_DELETE, "cd"],
    [DIFF_INSERT, "34"],
  ]

  dmp.diffCleanupEfficiency(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abxyzcd"],
      [DIFF_INSERT, "12xyz34"],
    ],
    diffs
  )

  // Three-edit elimination.
  diffs = [
    [DIFF_INSERT, "12"],
    [DIFF_EQUAL, "x"],
    [DIFF_DELETE, "cd"],
    [DIFF_INSERT, "34"],
  ]

  dmp.diffCleanupEfficiency(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "xcd"],
      [DIFF_INSERT, "12x34"],
    ],
    diffs
  )

  // Backpass elimination.
  diffs = [
    [DIFF_DELETE, "ab"],
    [DIFF_INSERT, "12"],
    [DIFF_EQUAL, "xy"],
    [DIFF_INSERT, "34"],
    [DIFF_EQUAL, "z"],
    [DIFF_DELETE, "cd"],
    [DIFF_INSERT, "56"],
  ]

  dmp.diffCleanupEfficiency(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abxyzcd"],
      [DIFF_INSERT, "12xy34z56"],
    ],
    diffs
  )

  // High cost elimination.
  dmp.diffEditCost = 5

  diffs = [
    [DIFF_DELETE, "ab"],
    [DIFF_INSERT, "12"],
    [DIFF_EQUAL, "wxyz"],
    [DIFF_DELETE, "cd"],
    [DIFF_INSERT, "34"],
  ]

  dmp.diffCleanupEfficiency(diffs)

  assertEquivalent(
    [
      [DIFF_DELETE, "abwxyzcd"],
      [DIFF_INSERT, "12wxyz34"],
    ],
    diffs
  )

  dmp.diffEditCost = 4
}

function testDiffPrettyHtml() {
  // Pretty print.
  const diffs = [
    [DIFF_EQUAL, "a\n"],
    [DIFF_DELETE, "<B>b</B>"],
    [DIFF_INSERT, "c&d"],
  ]

  assertEquals(
    '<span>a&para;<br></span><del style="background:#ffe6e6;">&lt;B&gt;b&lt;/B&gt;</del><ins style="background:#e6ffe6;">c&amp;d</ins>',
    dmp.diffPrettyHtml(diffs)
  )
}

function testDiffText() {
  // Compute the source and destination texts.
  const diffs = [
    [DIFF_EQUAL, "jump"],
    [DIFF_DELETE, "s"],
    [DIFF_INSERT, "ed"],
    [DIFF_EQUAL, " over "],
    [DIFF_DELETE, "the"],
    [DIFF_INSERT, "a"],
    [DIFF_EQUAL, " lazy"],
  ]

  assertEquals("jumps over the lazy", dmp.diffText1(diffs))
  assertEquals("jumped over a lazy", dmp.diffText2(diffs))
}

function testDiffDelta() {
  // Convert a diff into delta string.
  let diffs = [
    [DIFF_EQUAL, "jump"],
    [DIFF_DELETE, "s"],
    [DIFF_INSERT, "ed"],
    [DIFF_EQUAL, " over "],
    [DIFF_DELETE, "the"],
    [DIFF_INSERT, "a"],
    [DIFF_EQUAL, " lazy"],
    [DIFF_INSERT, "old dog"],
  ]

  let text1 = dmp.diffText1(diffs)
  assertEquals("jumps over the lazy", text1)

  let delta = dmp.diffToDelta(diffs)
  assertEquals("=4\t-1\t+ed\t=6\t-3\t+a\t=5\t+old dog", delta)

  // Convert delta string into a diff.
  assertEquivalent(diffs, dmp.diffFromDelta(text1, delta))

  // Generates error (19 != 20).
  try {
    dmp.diffFromDelta(text1 + "x", delta)
    assertEquals(Error, null)
  } catch (e) {
    // Exception expected.
  }

  // Generates error (19 != 18).
  try {
    dmp.diffFromDelta(text1.substring(1), delta)
    assertEquals(Error, null)
  } catch (e) {
    // Exception expected.
  }

  // Generates error (%c3%xy invalid Unicode).
  try {
    dmp.diffFromDelta("", "+%c3%xy")
    assertEquals(Error, null)
  } catch (e) {
    // Exception expected.
  }

  // Test deltas with special characters.
  diffs = [
    [DIFF_EQUAL, "\u0680 \x00 \t %"],
    [DIFF_DELETE, "\u0681 \x01 \n ^"],
    [DIFF_INSERT, "\u0682 \x02 \\ |"],
  ]

  text1 = dmp.diffText1(diffs)
  assertEquals("\u0680 \x00 \t %\u0681 \x01 \n ^", text1)

  delta = dmp.diffToDelta(diffs)
  assertEquals("=7\t-7\t+%DA%82 %02 %5C %7C", delta)

  // Convert delta string into a diff.
  assertEquivalent(diffs, dmp.diffFromDelta(text1, delta))

  // Verify pool of unchanged characters.
  diffs = [
    [DIFF_INSERT, "A-Z a-z 0-9 - _ . ! ~ * ' ( ) ; / ? : @ & = + $ , # "],
  ]

  const text2 = dmp.diffText2(diffs)
  assertEquals("A-Z a-z 0-9 - _ . ! ~ * ' ( ) ; / ? : @ & = + $ , # ", text2)

  delta = dmp.diffToDelta(diffs)
  assertEquals("+A-Z a-z 0-9 - _ . ! ~ * ' ( ) ; / ? : @ & = + $ , # ", delta)

  // Convert delta string into a diff.
  assertEquivalent(diffs, dmp.diffFromDelta("", delta))

  // 160 kb string.
  let a = "abcdefghij"

  for (let i = 0; i < 14; i++) {
    a += a
  }

  diffs = [[DIFF_INSERT, a]]
  delta = dmp.diffToDelta(diffs)
  assertEquals("+" + a, delta)

  // Convert delta string into a diff.
  assertEquivalent(diffs, dmp.diffFromDelta("", delta))
}

function testDiffXIndex() {
  // Translate a location in text1 to text2.
  // Translation on equality.
  assertEquals(
    5,
    dmp.diffXIndex(
      [
        [DIFF_DELETE, "a"],
        [DIFF_INSERT, "1234"],
        [DIFF_EQUAL, "xyz"],
      ],
      2
    )
  )

  // Translation on deletion.
  assertEquals(
    1,
    dmp.diffXIndex(
      [
        [DIFF_EQUAL, "a"],
        [DIFF_DELETE, "1234"],
        [DIFF_EQUAL, "xyz"],
      ],
      3
    )
  )
}

function testDiffLevenshtein() {
  // Levenshtein with trailing equality.
  assertEquals(
    4,
    dmp.diffLevenshtein([
      [DIFF_DELETE, "abc"],
      [DIFF_INSERT, "1234"],
      [DIFF_EQUAL, "xyz"],
    ])
  )

  // Levenshtein with leading equality.
  assertEquals(
    4,
    dmp.diffLevenshtein([
      [DIFF_EQUAL, "xyz"],
      [DIFF_DELETE, "abc"],
      [DIFF_INSERT, "1234"],
    ])
  )

  // Levenshtein with middle equality.
  assertEquals(
    7,
    dmp.diffLevenshtein([
      [DIFF_DELETE, "abc"],
      [DIFF_EQUAL, "xyz"],
      [DIFF_INSERT, "1234"],
    ])
  )
}

function testDiffBisect() {
  // Normal.
  const a = "cat"
  const b = "map"

  // Since the resulting diff hasn't been normalized, it would be ok if
  // the insertion and deletion pairs are swapped.
  // If the order changes, tweak this test as required.
  assertEquivalent(
    [
      [DIFF_DELETE, "c"],
      [DIFF_INSERT, "m"],
      [DIFF_EQUAL, "a"],
      [DIFF_DELETE, "t"],
      [DIFF_INSERT, "p"],
    ],
    dmp.diffBisect_(a, b, Number.MAX_VALUE)
  )

  // Timeout.
  assertEquivalent(
    [
      [DIFF_DELETE, "cat"],
      [DIFF_INSERT, "map"],
    ],
    dmp.diffBisect_(a, b, 0)
  )
}

function testDiffMain() {
  // Perform a trivial diff.
  // Null case.
  assertEquivalent([], dmp.diffMain("", "", false))

  // Equality.
  assertEquivalent([[DIFF_EQUAL, "abc"]], dmp.diffMain("abc", "abc", false))

  // Simple insertion.
  assertEquivalent(
    [
      [DIFF_EQUAL, "ab"],
      [DIFF_INSERT, "123"],
      [DIFF_EQUAL, "c"],
    ],
    dmp.diffMain("abc", "ab123c", false)
  )

  // Simple deletion.
  assertEquivalent(
    [
      [DIFF_EQUAL, "a"],
      [DIFF_DELETE, "123"],
      [DIFF_EQUAL, "bc"],
    ],
    dmp.diffMain("a123bc", "abc", false)
  )

  // Two insertions.
  assertEquivalent(
    [
      [DIFF_EQUAL, "a"],
      [DIFF_INSERT, "123"],
      [DIFF_EQUAL, "b"],
      [DIFF_INSERT, "456"],
      [DIFF_EQUAL, "c"],
    ],
    dmp.diffMain("abc", "a123b456c", false)
  )

  // Two deletions.
  assertEquivalent(
    [
      [DIFF_EQUAL, "a"],
      [DIFF_DELETE, "123"],
      [DIFF_EQUAL, "b"],
      [DIFF_DELETE, "456"],
      [DIFF_EQUAL, "c"],
    ],
    dmp.diffMain("a123b456c", "abc", false)
  )

  // Perform a real diff.
  // Switch off the timeout.
  dmp.diffTimeout = 0

  // Simple cases.
  assertEquivalent(
    [
      [DIFF_DELETE, "a"],
      [DIFF_INSERT, "b"],
    ],
    dmp.diffMain("a", "b", false)
  )

  assertEquivalent(
    [
      [DIFF_DELETE, "Apple"],
      [DIFF_INSERT, "Banana"],
      [DIFF_EQUAL, "s are a"],
      [DIFF_INSERT, "lso"],
      [DIFF_EQUAL, " fruit."],
    ],
    dmp.diffMain("Apples are a fruit.", "Bananas are also fruit.", false)
  )

  assertEquivalent(
    [
      [DIFF_DELETE, "a"],
      [DIFF_INSERT, "\u0680"],
      [DIFF_EQUAL, "x"],
      [DIFF_DELETE, "\t"],
      [DIFF_INSERT, "\0"],
    ],
    dmp.diffMain("ax\t", "\u0680x\0", false)
  )

  // Overlaps.
  assertEquivalent(
    [
      [DIFF_DELETE, "1"],
      [DIFF_EQUAL, "a"],
      [DIFF_DELETE, "y"],
      [DIFF_EQUAL, "b"],
      [DIFF_DELETE, "2"],
      [DIFF_INSERT, "xab"],
    ],
    dmp.diffMain("1ayb2", "abxab", false)
  )

  assertEquivalent(
    [
      [DIFF_INSERT, "xaxcx"],
      [DIFF_EQUAL, "abc"],
      [DIFF_DELETE, "y"],
    ],
    dmp.diffMain("abcy", "xaxcxabc", false)
  )

  assertEquivalent(
    [
      [DIFF_DELETE, "ABCD"],
      [DIFF_EQUAL, "a"],
      [DIFF_DELETE, "="],
      [DIFF_INSERT, "-"],
      [DIFF_EQUAL, "bcd"],
      [DIFF_DELETE, "="],
      [DIFF_INSERT, "-"],
      [DIFF_EQUAL, "efghijklmnopqrs"],
      [DIFF_DELETE, "EFGHIJKLMNOefg"],
    ],
    dmp.diffMain(
      "ABCDa=bcd=efghijklmnopqrsEFGHIJKLMNOefg",
      "a-bcd-efghijklmnopqrs",
      false
    )
  )

  // Large equality.
  assertEquivalent(
    [
      [DIFF_INSERT, " "],
      [DIFF_EQUAL, "a"],
      [DIFF_INSERT, "nd"],
      [DIFF_EQUAL, " [[Pennsylvania]]"],
      [DIFF_DELETE, " and [[New"],
    ],
    dmp.diffMain(
      "a [[Pennsylvania]] and [[New",
      " and [[Pennsylvania]]",
      false
    )
  )

  // Timeout.
  dmp.diffTimeout = 0.1 // 100ms

  let a =
    "`Twas brillig, and the slithy toves\nDid gyre and gimble in the wabe:\nAll mimsy were the borogoves,\nAnd the mome raths outgrabe.\n"

  let b =
    "I am the very model of a modern major general,\nI've information vegetable, animal, and mineral,\nI know the kings of England, and I quote the fights historical,\nFrom Marathon to Waterloo, in order categorical.\n"

  // Increase the text lengths by 1024 times to ensure a timeout.
  for (let i = 0; i < 10; i++) {
    a += a
    b += b
  }

  const startTime = new Date().getTime()
  dmp.diffMain(a, b)
  const endTime = new Date().getTime()

  // Test that we took at least the timeout period.
  assertTrue(dmp.diffTimeout * 1000 <= endTime - startTime)

  // Test that we didn't take forever (be forgiving).
  // Theoretically this test could fail very occasionally if the
  // OS task swaps or locks up for a second at the wrong moment.
  assertTrue(dmp.diffTimeout * 1000 * 2 > endTime - startTime)
  dmp.diffTimeout = 0

  // Test the linemode speedup.
  // Must be long to pass the 100 char cutoff.
  // Simple line-mode.
  a =
    "1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n"

  b =
    "abcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\nabcdefghij\n"

  assertEquivalent(dmp.diffMain(a, b, false), dmp.diffMain(a, b, true))

  // Single line-mode.
  a =
    "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890"

  b =
    "abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij"

  assertEquivalent(dmp.diffMain(a, b, false), dmp.diffMain(a, b, true))

  // Overlap line-mode.
  a =
    "1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n1234567890\n"

  b =
    "abcdefghij\n1234567890\n1234567890\n1234567890\nabcdefghij\n1234567890\n1234567890\n1234567890\nabcdefghij\n1234567890\n1234567890\n1234567890\nabcdefghij\n"

  const textsLinemode = diffRebuildtexts(dmp.diffMain(a, b, true))
  const textsTextmode = diffRebuildtexts(dmp.diffMain(a, b, false))
  assertEquivalent(textsTextmode, textsLinemode)

  // Test null inputs.
  try {
    dmp.diffMain(null, null)
    assertEquals(Error, null)
  } catch (e) {
    // Exception expected.
  }
}

// MATCH TEST FUNCTIONS

function testMatchAlphabet() {
  // Initialise the bitmasks for Bitap.
  // Unique.
  assertEquivalent({ a: 4, b: 2, c: 1 }, dmp.matchAlphabet_("abc"))

  // Duplicates.
  assertEquivalent({ a: 37, b: 18, c: 8 }, dmp.matchAlphabet_("abcaba"))
}

function testMatchBitap() {
  // Bitap algorithm.
  dmp.matchDistance = 100
  dmp.matchThreshold = 0.5

  // Exact matches.
  assertEquals(5, dmp.matchBitap_("abcdefghijk", "fgh", 5))
  assertEquals(5, dmp.matchBitap_("abcdefghijk", "fgh", 0))

  // Fuzzy matches.
  assertEquals(4, dmp.matchBitap_("abcdefghijk", "efxhi", 0))
  assertEquals(2, dmp.matchBitap_("abcdefghijk", "cdefxyhijk", 5))
  assertEquals(-1, dmp.matchBitap_("abcdefghijk", "bxy", 1))

  // Overflow.
  assertEquals(2, dmp.matchBitap_("123456789xx0", "3456789x0", 2))

  // Threshold test.
  dmp.matchThreshold = 0.4
  assertEquals(4, dmp.matchBitap_("abcdefghijk", "efxyhi", 1))

  dmp.matchThreshold = 0.3
  assertEquals(-1, dmp.matchBitap_("abcdefghijk", "efxyhi", 1))

  dmp.matchThreshold = 0.0
  assertEquals(1, dmp.matchBitap_("abcdefghijk", "bcdef", 1))
  dmp.matchThreshold = 0.5

  // Multiple select.
  assertEquals(0, dmp.matchBitap_("abcdexyzabcde", "abccde", 3))
  assertEquals(8, dmp.matchBitap_("abcdexyzabcde", "abccde", 5))

  // Distance test.
  dmp.matchDistance = 10 // Strict location.

  assertEquals(
    -1,
    dmp.matchBitap_("abcdefghijklmnopqrstuvwxyz", "abcdefg", 24)
  )

  assertEquals(
    0,
    dmp.matchBitap_("abcdefghijklmnopqrstuvwxyz", "abcdxxefg", 1)
  )

  dmp.matchDistance = 1000 // Loose location.
  assertEquals(0, dmp.matchBitap_("abcdefghijklmnopqrstuvwxyz", "abcdefg", 24))
}

function testMatchMain() {
  // Full match.
  // Shortcut matches.
  assertEquals(0, dmp.matchMain("abcdef", "abcdef", 1000))
  assertEquals(-1, dmp.matchMain("", "abcdef", 1))
  assertEquals(3, dmp.matchMain("abcdef", "", 3))
  assertEquals(3, dmp.matchMain("abcdef", "de", 3))

  // Beyond end match.
  assertEquals(3, dmp.matchMain("abcdef", "defy", 4))

  // Oversized pattern.
  assertEquals(0, dmp.matchMain("abcdef", "abcdefy", 0))

  // Complex match.
  assertEquals(
    4,
    dmp.matchMain(
      "I am the very model of a modern major general.",
      " that berry ",
      5
    )
  )

  // Test null inputs.
  try {
    dmp.matchMain(null, null, 0)
    assertEquals(Error, null)
  } catch (e) {
    // Exception expected.
  }
}

// PATCH TEST FUNCTIONS

function testPatchObj() {
  // Patch Object.
  const p = new DiffMatchPatch.patchObj()
  p.start1 = 20
  p.start2 = 21
  p.length1 = 18
  p.length2 = 17

  p.diffs = [
    [DIFF_EQUAL, "jump"],
    [DIFF_DELETE, "s"],
    [DIFF_INSERT, "ed"],
    [DIFF_EQUAL, " over "],
    [DIFF_DELETE, "the"],
    [DIFF_INSERT, "a"],
    [DIFF_EQUAL, "\nlaz"],
  ]

  const strp = p.toString()

  assertEquals(
    "@@ -21,18 +22,17 @@\n jump\n-s\n+ed\n  over \n-the\n+a\n %0Alaz\n",
    strp
  )
}

function testPatchFromText() {
  assertEquivalent([], dmp.patchFromText(undefined))

  const strp =
    "@@ -21,18 +22,17 @@\n jump\n-s\n+ed\n  over \n-the\n+a\n %0Alaz\n"

  assertEquals(strp, dmp.patchFromText(strp)[0].toString())

  assertEquals(
    "@@ -1 +1 @@\n-a\n+b\n",
    dmp.patchFromText("@@ -1 +1 @@\n-a\n+b\n")[0].toString()
  )

  assertEquals(
    "@@ -1,3 +0,0 @@\n-abc\n",
    dmp.patchFromText("@@ -1,3 +0,0 @@\n-abc\n")[0].toString()
  )

  assertEquals(
    "@@ -0,0 +1,3 @@\n+abc\n",
    dmp.patchFromText("@@ -0,0 +1,3 @@\n+abc\n")[0].toString()
  )

  // Generates error.
  try {
    dmp.patchFromText("Bad\nPatch\n")
    assertEquals(Error, null)
  } catch (e) {
    // Exception expected.
  }
}

function testPatchToText() {
  let strp = "@@ -21,18 +22,17 @@\n jump\n-s\n+ed\n  over \n-the\n+a\n  laz\n"
  let p = dmp.patchFromText(strp)
  assertEquals(strp, dmp.patchToText(p))

  strp =
    "@@ -1,9 +1,9 @@\n-f\n+F\n oo+fooba\n@@ -7,9 +7,9 @@\n obar\n-,\n+.\n  tes\n"

  p = dmp.patchFromText(strp)
  assertEquals(strp, dmp.patchToText(p))
}

function testPatchAddContext() {
  dmp.patchMargin = 4
  let p = dmp.patchFromText("@@ -21,4 +21,10 @@\n-jump\n+somersault\n")[0]
  dmp.patchAddContext_(p, "The quick brown fox jumps over the lazy dog.")

  assertEquals(
    "@@ -17,12 +17,18 @@\n fox \n-jump\n+somersault\n s ov\n",
    p.toString()
  )

  // Same, but not enough trailing context.
  p = dmp.patchFromText("@@ -21,4 +21,10 @@\n-jump\n+somersault\n")[0]
  dmp.patchAddContext_(p, "The quick brown fox jumps.")

  assertEquals(
    "@@ -17,10 +17,16 @@\n fox \n-jump\n+somersault\n s.\n",
    p.toString()
  )

  // Same, but not enough leading context.
  p = dmp.patchFromText("@@ -3 +3,2 @@\n-e\n+at\n")[0]
  dmp.patchAddContext_(p, "The quick brown fox jumps.")
  assertEquals("@@ -1,7 +1,8 @@\n Th\n-e\n+at\n  qui\n", p.toString())

  // Same, but with ambiguity.
  p = dmp.patchFromText("@@ -3 +3,2 @@\n-e\n+at\n")[0]

  dmp.patchAddContext_(
    p,
    "The quick brown fox jumps.  The quick brown fox crashes."
  )

  assertEquals(
    "@@ -1,27 +1,28 @@\n Th\n-e\n+at\n  quick brown fox jumps. \n",
    p.toString()
  )
}

function testPatchMake() {
  // Null case.
  let patches = dmp.patchMake("", "")
  assertEquals("", dmp.patchToText(patches))

  let text1 = "The quick brown fox jumps over the lazy dog."
  let text2 = "That quick brown fox jumped over a lazy dog."

  // Text2+Text1 inputs.
  let expectedPatch =
    "@@ -1,8 +1,7 @@\n Th\n-at\n+e\n  qui\n@@ -21,17 +21,18 @@\n jump\n-ed\n+s\n  over \n-a\n+the\n  laz\n"

  // The second patch must be "-21,17 +21,18", not "-22,17 +21,18" due to rolling context.
  patches = dmp.patchMake(text2, text1)
  assertEquals(expectedPatch, dmp.patchToText(patches))

  // Text1+Text2 inputs.
  expectedPatch =
    "@@ -1,11 +1,12 @@\n Th\n-e\n+at\n  quick b\n@@ -22,18 +22,17 @@\n jump\n-s\n+ed\n  over \n-the\n+a\n  laz\n"

  patches = dmp.patchMake(text1, text2)
  assertEquals(expectedPatch, dmp.patchToText(patches))

  // Diff input.
  let diffs = dmp.diffMain(text1, text2, false)
  patches = dmp.patchMake(diffs)
  assertEquals(expectedPatch, dmp.patchToText(patches))

  // Text1+Diff inputs.
  patches = dmp.patchMake(text1, diffs)
  assertEquals(expectedPatch, dmp.patchToText(patches))

  // Text1+Text2+Diff inputs (deprecated).
  patches = dmp.patchMake(text1, text2, diffs)
  assertEquals(expectedPatch, dmp.patchToText(patches))

  // Character encoding.
  patches = dmp.patchMake("`1234567890-=[]\\;',./", '~!@#$%^&*()_+{}|:"<>?')

  assertEquals(
    "@@ -1,21 +1,21 @@\n-%601234567890-=%5B%5D%5C;',./\n+~!@#$%25%5E&*()_+%7B%7D%7C:%22%3C%3E?\n",
    dmp.patchToText(patches)
  )

  // Character decoding.
  diffs = [
    [DIFF_DELETE, "`1234567890-=[]\\;',./"],
    [DIFF_INSERT, '~!@#$%^&*()_+{}|:"<>?'],
  ]

  assertEquivalent(
    diffs,
    dmp.patchFromText(
      "@@ -1,21 +1,21 @@\n-%601234567890-=%5B%5D%5C;',./\n+~!@#$%25%5E&*()_+%7B%7D%7C:%22%3C%3E?\n"
    )[0].diffs
  )

  // Long string with repeats.
  text1 = ""

  for (let x = 0; x < 100; x++) {
    text1 += "abcdef"
  }

  text2 = text1 + "123"
  expectedPatch = "@@ -573,28 +573,31 @@\n cdefabcdefabcdefabcdefabcdef\n+123\n"
  patches = dmp.patchMake(text1, text2)
  assertEquals(expectedPatch, dmp.patchToText(patches))

  // Test null inputs.
  try {
    dmp.patchMake(null)
    assertEquals(Error, null)
  } catch (e) {
    // Exception expected.
  }
}

function testPatchSplitMax() {
  // Assumes that dmp.matchMaxBits is 32.
  let patches = dmp.patchMake(
    "abcdefghijklmnopqrstuvwxyz01234567890",
    "XabXcdXefXghXijXklXmnXopXqrXstXuvXwxXyzX01X23X45X67X89X0"
  )

  dmp.patchSplitMax(patches)

  assertEquals(
    "@@ -1,32 +1,46 @@\n+X\n ab\n+X\n cd\n+X\n ef\n+X\n gh\n+X\n ij\n+X\n kl\n+X\n mn\n+X\n op\n+X\n qr\n+X\n st\n+X\n uv\n+X\n wx\n+X\n yz\n+X\n 012345\n@@ -25,13 +39,18 @@\n zX01\n+X\n 23\n+X\n 45\n+X\n 67\n+X\n 89\n+X\n 0\n",
    dmp.patchToText(patches)
  )

  patches = dmp.patchMake(
    "abcdef1234567890123456789012345678901234567890123456789012345678901234567890uvwxyz",
    "abcdefuvwxyz"
  )

  const oldToText = dmp.patchToText(patches)
  dmp.patchSplitMax(patches)
  assertEquals(oldToText, dmp.patchToText(patches))

  patches = dmp.patchMake(
    "1234567890123456789012345678901234567890123456789012345678901234567890",
    "abc"
  )

  dmp.patchSplitMax(patches)

  assertEquals(
    "@@ -1,32 +1,4 @@\n-1234567890123456789012345678\n 9012\n@@ -29,32 +1,4 @@\n-9012345678901234567890123456\n 7890\n@@ -57,14 +1,3 @@\n-78901234567890\n+abc\n",
    dmp.patchToText(patches)
  )

  patches = dmp.patchMake(
    "abcdefghij , h : 0 , t : 1 abcdefghij , h : 0 , t : 1 abcdefghij , h : 0 , t : 1",
    "abcdefghij , h : 1 , t : 1 abcdefghij , h : 1 , t : 1 abcdefghij , h : 0 , t : 1"
  )

  dmp.patchSplitMax(patches)

  assertEquals(
    "@@ -2,32 +2,32 @@\n bcdefghij , h : \n-0\n+1\n  , t : 1 abcdef\n@@ -29,32 +29,32 @@\n bcdefghij , h : \n-0\n+1\n  , t : 1 abcdef\n",
    dmp.patchToText(patches)
  )
}

function testPatchAddPadding() {
  // Both edges full.
  let patches = dmp.patchMake("", "test")
  assertEquals("@@ -0,0 +1,4 @@\n+test\n", dmp.patchToText(patches))
  dmp.patchAddPadding(patches)

  assertEquals(
    "@@ -1,8 +1,12 @@\n %01%02%03%04\n+test\n %01%02%03%04\n",
    dmp.patchToText(patches)
  )

  // Both edges partial.
  patches = dmp.patchMake("XY", "XtestY")
  assertEquals("@@ -1,2 +1,6 @@\n X\n+test\n Y\n", dmp.patchToText(patches))
  dmp.patchAddPadding(patches)

  assertEquals(
    "@@ -2,8 +2,12 @@\n %02%03%04X\n+test\n Y%01%02%03\n",
    dmp.patchToText(patches)
  )

  // Both edges none.
  patches = dmp.patchMake("XXXXYYYY", "XXXXtestYYYY")

  assertEquals(
    "@@ -1,8 +1,12 @@\n XXXX\n+test\n YYYY\n",
    dmp.patchToText(patches)
  )

  dmp.patchAddPadding(patches)

  assertEquals(
    "@@ -5,8 +5,12 @@\n XXXX\n+test\n YYYY\n",
    dmp.patchToText(patches)
  )
}

function testPatchApply() {
  dmp.matchDistance = 1000
  dmp.matchThreshold = 0.5
  dmp.patchDeleteThreshold = 0.5

  // Null case.
  let patches = dmp.patchMake("", "")
  let results = dmp.patchApply(patches, "Hello world.")
  assertEquivalent(["Hello world.", []], results)

  // Exact match.
  patches = dmp.patchMake(
    "The quick brown fox jumps over the lazy dog.",
    "That quick brown fox jumped over a lazy dog."
  )

  results = dmp.patchApply(
    patches,
    "The quick brown fox jumps over the lazy dog."
  )

  assertEquivalent(
    ["That quick brown fox jumped over a lazy dog.", [true, true]],
    results
  )

  // Partial match.
  results = dmp.patchApply(
    patches,
    "The quick red rabbit jumps over the tired tiger."
  )

  assertEquivalent(
    ["That quick red rabbit jumped over a tired tiger.", [true, true]],
    results
  )

  // Failed match.
  results = dmp.patchApply(
    patches,
    "I am the very model of a modern major general."
  )

  assertEquivalent(
    ["I am the very model of a modern major general.", [false, false]],
    results
  )

  // Big delete, small change.
  patches = dmp.patchMake(
    "x1234567890123456789012345678901234567890123456789012345678901234567890y",
    "xabcy"
  )

  results = dmp.patchApply(
    patches,
    "x123456789012345678901234567890-----++++++++++-----123456789012345678901234567890y"
  )

  assertEquivalent(["xabcy", [true, true]], results)

  // Big delete, big change 1.
  patches = dmp.patchMake(
    "x1234567890123456789012345678901234567890123456789012345678901234567890y",
    "xabcy"
  )

  results = dmp.patchApply(
    patches,
    "x12345678901234567890---------------++++++++++---------------12345678901234567890y"
  )

  assertEquivalent(
    [
      "xabc12345678901234567890---------------++++++++++---------------12345678901234567890y",
      [false, true],
    ],
    results
  )

  // Big delete, big change 2.
  dmp.patchDeleteThreshold = 0.6

  patches = dmp.patchMake(
    "x1234567890123456789012345678901234567890123456789012345678901234567890y",
    "xabcy"
  )

  results = dmp.patchApply(
    patches,
    "x12345678901234567890---------------++++++++++---------------12345678901234567890y"
  )

  assertEquivalent(["xabcy", [true, true]], results)
  dmp.patchDeleteThreshold = 0.5

  // Compensate for failed patch.
  dmp.matchThreshold = 0.0
  dmp.matchDistance = 0

  patches = dmp.patchMake(
    "abcdefghijklmnopqrstuvwxyz--------------------1234567890",
    "abcXXXXXXXXXXdefghijklmnopqrstuvwxyz--------------------1234567YYYYYYYYYY890"
  )

  results = dmp.patchApply(
    patches,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ--------------------1234567890"
  )

  assertEquivalent(
    [
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ--------------------1234567YYYYYYYYYY890",
      [false, true],
    ],
    results
  )

  dmp.matchThreshold = 0.5
  dmp.matchDistance = 1000

  // No side effects.
  patches = dmp.patchMake("", "test")
  let patchstr = dmp.patchToText(patches)
  dmp.patchApply(patches, "")
  assertEquals(patchstr, dmp.patchToText(patches))

  // No side effects with major delete.
  patches = dmp.patchMake(
    "The quick brown fox jumps over the lazy dog.",
    "Woof"
  )

  patchstr = dmp.patchToText(patches)
  dmp.patchApply(patches, "The quick brown fox jumps over the lazy dog.")
  assertEquals(patchstr, dmp.patchToText(patches))

  // Edge exact match.
  patches = dmp.patchMake("", "test")
  results = dmp.patchApply(patches, "")
  assertEquivalent(["test", [true]], results)

  // Near edge exact match.
  patches = dmp.patchMake("XY", "XtestY")
  results = dmp.patchApply(patches, "XY")
  assertEquivalent(["XtestY", [true]], results)

  // Edge partial match.
  patches = dmp.patchMake("y", "y123")
  results = dmp.patchApply(patches, "x")
  assertEquivalent(["x123", [true]], results)
}

// Counters for unit test results.
let testGood = 0
let testBad = 0

// If expected and actual are the identical, print 'Ok', otherwise 'Fail!'
function assertEquals(msg, expected, actual) {
  if (typeof actual == "undefined") {
    // msg is optional.
    actual = expected
    expected = msg
    msg = "Expected: '" + expected + "' Actual: '" + actual + "'"
  }

  if (isEqual(actual, expected)) {
    testGood++
    return true
  } else {
    testBad++
    return false
  }
}

function assertTrue(msg, actual) {
  if (typeof actual == "undefined") {
    // msg is optional.
    actual = msg
    return assertEquals(true, actual)
  } else {
    return assertEquals(msg, true, actual)
  }
}

// function assertFalse(msg, actual) {
//   if (typeof actual == "undefined") {
//     // msg is optional.
//     actual = msg
//     return assertEquals(false, actual)
//   } else {
//     return assertEquals(msg, false, actual)
//   }
// }

const tests = [
  testDiffBisect,
  testDiffCharsToLines,
  testDiffCleanupEfficiency,
  testDiffCleanupMerge,
  testDiffCleanupSemantic,
  testDiffCleanupSemanticLossless,
  testDiffCommonOverlap,
  testDiffCommonPrefix,
  testDiffCommonSuffix,
  testDiffDelta,
  testDiffHalfMatch,
  testDiffLevenshtein,
  testDiffLinesToChars,
  testDiffMain,
  testDiffPrettyHtml,
  testDiffText,
  testDiffXIndex,
  testMatchAlphabet,
  testMatchBitap,
  testMatchMain,
  testPatchAddContext,
  testPatchAddPadding,
  testPatchApply,
  testPatchFromText,
  testPatchMake,
  testPatchObj,
  testPatchSplitMax,
  testPatchToText,
]

const startTime = new Date().getTime()

for (let x = 0; x < tests.length; x++) {
  console.log(tests[x])
  tests[x]()
}

const endTime = new Date().getTime()
console.log("Done.")
console.log("Tests passed: " + testGood)
console.log("Tests failed: " + testBad)
console.log("Total time: " + (endTime - startTime) + " ms")
