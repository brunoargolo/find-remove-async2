/* eslint-disable camelcase */

const testCase = require('nodeunit').testCase
const randomstring = require('randomstring')
const mkdirp = require('mkdirp')
const path = require('path')
const {
  existsSync,
  promises: { writeFile }
} = require('fs')
const rimraf = require('rimraf')
const os = require('os')

const findRemove = require('../src/index.js')

const rootDirectory = path.join(os.tmpdir(), 'find-remove')

function generateRandomFilename(ext) {
  let filename = randomstring.generate(24)

  if (ext) {
    filename += '.' + ext
  }

  return filename
}

/*
 pre defined directories:
    + rootDirectory

        * randomFile1 (*.bak)
        * randomFile2 (*.log)
        * randomFile3 (*.log)
        * randomFile4 (*.csv)

        + CVS (directory3)
        + directory1
            + CVS (directory1_3)
            + directory1_1
            + directory1_2
                + directory1_2_1
                    * randomFile1_2_1_1 (*.log)
                    * randomFile1_2_1_2 (*.bak)
                    * randomFile1_2_1_3 (*.bak)
                    * fixFile1_2_1_4 (something.jpg)
                    * fixFile1_2_1_5 (something.png)
                + directory1_2_2
        + directory2
            * randomFile2_1 (*.bak)
            * randomFile2_2 (*.csv)
        + patternDirectory_token (directory4)
        + token_patternDirectory (directory5)
 */

const directory1 = path.join(rootDirectory, 'directory1')
const directory2 = path.join(rootDirectory, 'directory2')
const directory3 = path.join(rootDirectory, 'CVS')
const directory4 = path.join(rootDirectory, 'patternDirectory_token')
const directory5 = path.join(rootDirectory, 'token_patternDirectory')

const directory1_1 = path.join(directory1, 'directory1_1')
const directory1_2 = path.join(directory1, 'directory1_2')
const directory1_3 = path.join(directory1, 'CVS')

const directory1_2_1 = path.join(directory1_2, 'directory1_2_1')
const directory1_2_2 = path.join(directory1_2, 'directory1_2_2')

// mix of pre defined and random file names
const randomFilename1 = generateRandomFilename('bak')
const randomFile1 = path.join(rootDirectory, randomFilename1)
const randomFilename2 = generateRandomFilename('log')
const randomFile2 = path.join(rootDirectory, randomFilename2)
const randomFile3 = path.join(rootDirectory, generateRandomFilename('log'))
const randomFile4 = path.join(rootDirectory, generateRandomFilename('csv'))

const randomFile2_1 = path.join(directory2, generateRandomFilename('bak'))
const randomFile2_2 = path.join(directory2, generateRandomFilename('csv'))

const randomFilename1_2_1_1 = generateRandomFilename('log')
const randomFile1_2_1_1 = path.join(directory1_2_1, randomFilename1_2_1_1)
const randomFile1_2_1_2 = path.join(directory1_2_1, generateRandomFilename('bak'))
const randomFilename1_2_1_3 = generateRandomFilename('bak')
const randomFile1_2_1_3 = path.join(directory1_2_1, randomFilename1_2_1_3)

const fixFilename1_2_1_4 = 'something.jpg'
const fixFile1_2_1_4 = path.join(directory1_2_1, fixFilename1_2_1_4)
const fixFilename1_2_1_5 = 'something.png'
const fixFile1_2_1_5 = path.join(directory1_2_1, fixFilename1_2_1_5)

async function createFakeDirectoryTree(cb) {
  try {
    await mkdirp(directory1)
    await mkdirp(directory2)
    await mkdirp(directory3)
    await mkdirp(directory1_1)
    await mkdirp(directory1_2)
    await mkdirp(directory1_3)
    await mkdirp(directory1_2_1)
    await mkdirp(directory1_2_2)

    await writeFile(randomFile1, '')
    await writeFile(randomFile2, '')
    await writeFile(randomFile3, '')
    await writeFile(randomFile4, '')
    await writeFile(randomFile2_1, '')
    await writeFile(randomFile2_2, '')
    await writeFile(randomFile1_2_1_1, '')
    await writeFile(randomFile1_2_1_2, '')
    await writeFile(randomFile1_2_1_3, '')
    await writeFile(fixFile1_2_1_4, '')
    await writeFile(fixFile1_2_1_5, '')

    cb && cb()
  } catch (exc) {
    console.error(exc)
  }
}

async function createFakeDirectoryTreeRegex(cb) {
  try {
    await createFakeDirectoryTree()
    await mkdirp(directory4)
    await mkdirp(directory5)

    cb()
  } catch (exc) {
    console.error(exc)
  }
}

function destroyFakeDirectoryTree(cb) {
  rimraf(rootDirectory, cb)
}

module.exports = testCase({
  'TC 1: tests without real files': testCase({
    'loading findRemove function (require)': function (t) {
      t.ok(findRemove, 'findRemove is loaded.')
      t.done()
    },

    'removing non-existing directory': function (t) {
      const dir = generateRandomFilename()
      findRemove(dir).then((result) => {
        t.strictEqual(Object.keys(result).length, 0, 'returned empty')
        t.done()
      }).catch(console.error)
    }

  }),

  'TC 2: tests with real files': testCase({
    setUp: function (cb) {
      createFakeDirectoryTree(cb)
    },
    tearDown: function (cb) {
      destroyFakeDirectoryTree(cb)
    },

    'findRemove(nonexisting)': function (t) {
      findRemove('/tmp/blahblah/hehehe/yo/what/').then((result) => {
        t.strictEqual(Object.keys(result).length, 0, 'did nothing.')
        t.done()
      }).catch(console.error)
    },

    'findRemove(no params)': function (t) {
      findRemove(rootDirectory).then((result) => {
        t.strictEqual(Object.keys(result).length, 0, 'did nothing.')

        const exists = existsSync(rootDirectory)
        t.equal(exists, true, 'did not remove root directory')

        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, true, 'findRemove(no params) did not remove directory1_1')

        t.done()
      }).catch(console.error)
    },

    'findRemove(all files)': function (t) {
      findRemove(rootDirectory, { files: '*.*' }).then((result) => {
        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, true, 'did not remove directory1_1')

        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(exists1_2_1_2, false, 'removed randomFile1_2_1_2 fine')

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(exists1_2_1_3, false, 'removed randomFile1_2_1_3 fine')

        t.done()
      }).catch(console.error)
    },

    'findRemove(all directories)': function (t) {
      findRemove(rootDirectory, { dir: '*' }).then((result) => {
        t.strictEqual(Object.keys(result).length, 8, 'all 8 directories deleted')

        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, false, 'removed directory1_1')

        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(exists1_2_1_2, false, 'removed randomFile1_2_1_2')

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(exists1_2_1_3, false, 'removed randomFile1_2_1_3')

        t.done()
      }).catch(console.error)
    },

    'findRemove(everything)': function (t) {
      findRemove(rootDirectory, { dir: '*', files: '*.*' }).then((result) => {
        t.strictEqual(Object.keys(result).length, 19, 'all 19 directories + files deleted')

        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, false, 'removed directory1_1')

        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(exists1_2_1_2, false, 'did not remove randomFile1_2_1_2 fine')

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(exists1_2_1_3, false, 'dit not remove randomFile1_2_1_3 fine')

        t.done()
      }).catch(console.error)
    },

    'findRemove(files no hit)': function (t) {
      findRemove(rootDirectory, { files: 'no.hit.me' }).then((result) => {
        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, true, 'did not remove directory1_1')

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(exists1_2_1_3, true, 'did not remove randomFile1_2_1_3')

        t.done()
      }).catch(console.error)
    },

    'findRemove(directory1_2_1)': function (t) {
      findRemove(rootDirectory, { dir: 'directory1_2_1' }).then((result) => {
        const exists1_2_1 = existsSync(directory1_2_1)
        t.equal(exists1_2_1, false, 'did remove directory1_2_1')

        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, true, 'did not remove directory1_1')

        t.done()
      }).catch(console.error)
    },

    'findRemove(one directory and all files)': function (t) {
      findRemove(rootDirectory, {
        dir: 'directory1_2_1',
        files: '*.*'
      }).then((result) => {
        const exists1_2_1 = existsSync(directory1_2_1)
        t.equal(exists1_2_1, false, 'did remove directory1_2_1')

        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, true, 'did not remove directory1_1')

        t.ok(result[randomFile1_2_1_1], 'randomFile1_2_1_1 is in result')
        t.ok(result[randomFile1_2_1_2], 'randomFile1_2_1_2 is in result')
        t.ok(result[randomFile1_2_1_3], 'randomFile1_2_1_3 is in result')
        t.ok(result[directory1_2_1], 'directory1_2_1 is in result')

        t.done()
      }).catch(console.error)
    },

    'findRemove(another directory and all files)': function (t) {
      findRemove(rootDirectory, { dir: 'directory2', files: '*.*' }).then((result) => {
        const exists2 = existsSync(directory2)
        t.equal(exists2, false, 'directory2 not removed')

        const exists1_2 = existsSync(directory1_2)
        t.equal(exists1_2, true, 'directory1_2 not removed')

        t.ok(result[randomFile2_1], 'randomFile2_1 is in result')

        t.done()
      }).catch(console.error)
    },

    'findRemove(all bak files from root)': function (t) {
      findRemove(rootDirectory, { extensions: '.bak' }).then(result => {
        const exists1 = existsSync(randomFile1)
        const exists2_1 = existsSync(randomFile2_1)
        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)

        t.equal(
          exists1,
          false,
          'findRemove(all bak files from root) removed randomFile1 fine'
        )
        t.equal(
          exists2_1,
          false,
          'findRemove(all bak files from root) removed exists2_1 fine'
        )
        t.equal(
          exists1_2_1_2,
          false,
          'findRemove(all bak files from root) removed exists1_2_1_2 fine'
        )
        t.equal(
          exists1_2_1_3,
          false,
          'findRemove(all bak files from root) removed exists1_2_1_3 fine'
        )

        const exists3 = existsSync(randomFile3)
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        const exists0 = existsSync(rootDirectory)
        const exists1_2_1 = existsSync(directory1_2_1)

        t.equal(
          exists3,
          true,
          'findRemove(all bak files from root) did not remove log file exists3'
        )
        t.equal(
          exists1_2_1_1,
          true,
          'findRemove(all bak files from root) did not remove log file exists1_2_1_1'
        )
        t.equal(
          exists0,
          true,
          'findRemove(all bak files from root) did not remove root directory'
        )
        t.equal(
          exists1_2_1,
          true,
          'findRemove(all bak files from root) did not remove directory directory1_2_1'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(all log files from directory1_2_1)': function (t) {
      findRemove(directory1_2_1, { extensions: '.log' }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(all log files from directory1_2_1) removed randomFile1_2_1_1 fine'
        )

        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(
          exists1_2_1_2,
          true,
          'findRemove(all log files from directory1_2_1) did not remove file randomFile1_2_1_2'
        )

        const exists1_2_1 = existsSync(directory1_2_1)
        t.equal(
          exists1_2_1,
          true,
          'findRemove(all log files from directory1_2_1) did not remove directory directory1_2_1'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(all bak or log files from root)': function (t) {
      findRemove(rootDirectory, { extensions: ['.bak', '.log'] }).then(result => {
        const exists1 = existsSync(randomFile1)
        const exists2_1 = existsSync(randomFile2_1)
        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)

        const exists2 = existsSync(randomFile2)
        const exists3 = existsSync(randomFile3)
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)

        t.equal(
          exists1,
          false,
          'findRemove(all bak and log files from root) removed randomFile1 fine'
        )
        t.equal(
          exists2_1,
          false,
          'findRemove(all bak and log files from root) removed exists2_1 fine'
        )
        t.equal(
          exists1_2_1_2,
          false,
          'findRemove(all bak and log files from root) removed exists1_2_1_2 fine'
        )
        t.equal(
          exists1_2_1_3,
          false,
          'findRemove(all bak and log files from root) removed exists1_2_1_3 fine'
        )

        t.equal(
          exists2,
          false,
          'findRemove(all bak and log files from root) removed exists2 fine'
        )
        t.equal(
          exists3,
          false,
          'findRemove(all bak and log files from root) removed exists3 fine'
        )
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(all bak and log files from root) removed exists1_2_1_1 fine'
        )

        const exists1_1 = existsSync(directory1_1)
        t.equal(
          exists1_1,
          true,
          'findRemove(all bak and log files from root) did not remove directory1_1'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(filename randomFilename1_2_1_1 from directory1_2)': function (t) {
      findRemove(directory1_2, { files: randomFilename1_2_1_1 }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(filename randomFilename1_2_1_1 from directory1_2) removed randomFile1_2_1_1 fine'
        )

        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(
          exists1_2_1_2,
          true,
          'findRemove(filename randomFilename1_2_1_1 from directory1_2) did not remove randomFile1_2_1_2'
        )

        const exists1_2 = existsSync(directory1_2)
        t.equal(
          exists1_2,
          true,
          'findRemove(filename randomFilename1_2_1_1 from directory1_2) did not remove directory1_2'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(two files from root)': function (t) {
      findRemove(rootDirectory, { files: [randomFilename2, randomFilename1_2_1_3] }).then(result => {
        const exists2 = existsSync(randomFile2)
        t.equal(
          exists2,
          false,
          'findRemove(two files from root) removed randomFile2 fine'
        )

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(
          exists1_2_1_3,
          false,
          'findRemove(two files from root) removed randomFile1_2_1_3 fine'
        )

        const exists1 = existsSync(randomFile1)
        t.equal(
          exists1,
          true,
          'findRemove(two files from root) did not remove randomFile1'
        )

        const exists0 = existsSync(rootDirectory)
        t.equal(
          exists0,
          true,
          'findRemove(two files from root) did not remove root directory'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(files set to *.*)': function (t) {
      findRemove(directory1_2_1, { files: '*.*' }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(files set to *.*) removed randomFile1_2_1_1 fine'
        )

        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(
          exists1_2_1_2,
          false,
          'findRemove(files set to *.*) removed randomFile1_2_1_2 fine'
        )

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(
          exists1_2_1_3,
          false,
          'findRemove(files set to *.*) removed randomFile1_2_1_3 fine'
        )

        const exists1_2_1 = existsSync(directory1_2_1)
        t.equal(
          exists1_2_1,
          true,
          'findRemove(files set to *.* did not remove directory1_2_1'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(with mixed ext and file params)': function (t) {
      findRemove(rootDirectory, {
        files: randomFilename1,
        extensions: ['.log']
      }).then(result => {
        const exists1 = existsSync(randomFile1)
        const exists2 = existsSync(randomFile2)
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1,
          false,
          'findRemove(with mixed ext and file params) removed randomFile1 fine'
        )
        t.equal(
          exists2,
          false,
          'findRemove(with mixed ext and file params) removed randomFile2 fine'
        )
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(with mixed ext and file params) removed randomFile1_2_1_1 fine'
        )

        const exists1_2_1 = existsSync(directory1_2_1)
        t.equal(exists1_2_1, true, 'did not remove directory1_2_1')

        t.strictEqual(
          typeof result[randomFile1],
          'boolean',
          'randomFile1 in result is boolean'
        )
        t.strictEqual(
          typeof result[randomFile1_2_1_2],
          'undefined',
          'randomFile1_2_1_2 is NOT in result'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(with ignore param)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        ignore: fixFilename1_2_1_4
      }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(with ignore) did remove file randomFile1_2_1_1'
        )

        const exists1_2_1_4 = existsSync(fixFile1_2_1_4)
        t.equal(exists1_2_1_4, true, 'file fixFile1_2_1_4 not removed')

        t.strictEqual(
          typeof result[randomFile1_2_1_1],
          'boolean',
          'randomFile1_2_1_1 in result is boolean'
        )
        t.strictEqual(
          typeof result[fixFile1_2_1_4],
          'undefined',
          'fixFile1_2_1_4 is NOT in result'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(with ignore and jpg extension params)': function (t) {
      findRemove(rootDirectory, {
        ignore: fixFilename1_2_1_4,
        extensions: '.jpg'
      }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        const exists1_2_1_4 = existsSync(fixFile1_2_1_4)
        t.equal(
          exists1_2_1_1,
          true,
          'findRemove(with ignore + jpg extension) did not remove file randomFile1_2_1_1'
        )
        t.equal(
          exists1_2_1_4,
          true,
          'findRemove(with ignore + jpg extension) did not remove file fixFile1_2_1_4'
        )
        t.strictEqual(
          typeof result[randomFile1_2_1_1],
          'undefined',
          'randomFile1_2_1_1 is NOT in result'
        )
        t.strictEqual(
          typeof result[fixFile1_2_1_4],
          'undefined',
          'fixFile1_2_1_4 is NOT in result'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(with multiple ignore)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        ignore: [fixFilename1_2_1_4, fixFilename1_2_1_5]
      }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(with multiple ignore) did remove file randomFile1_2_1_1'
        )

        const exists1_2_1_4 = existsSync(fixFile1_2_1_4)
        t.equal(
          exists1_2_1_4,
          true,
          'findRemove(with multiple ignore) did not remove file fixFile1_2_1_4'
        )

        const exists1_2_1_5 = existsSync(fixFile1_2_1_5)
        t.equal(
          exists1_2_1_5,
          true,
          'findRemove(with multiple ignore) did not remove file fixFile1_2_1_5'
        )

        t.strictEqual(
          typeof result[randomFile1_2_1_1],
          'boolean',
          'randomFile1_2_1_1 is in result'
        )
        t.strictEqual(
          typeof result[fixFile1_2_1_4],
          'undefined',
          'fixFile1_2_1_4 is NOT in result'
        )
        t.strictEqual(
          typeof result[fixFile1_2_1_5],
          'undefined',
          'fixFile1_2_1_5 is NOT in result'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(with ignore and bak extension params)': function (t) {
      findRemove(rootDirectory, {
        ignore: fixFilename1_2_1_4,
        extensions: '.bak'
      }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          true,
          'findRemove(with ignore + bak extension) did not remove file randomFile1_2_1_1'
        )

        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(
          exists1_2_1_2,
          false,
          'findRemove(with ignore + bak extension) did remove file randomFile1_2_1_2'
        )

        const exists1_2_1_4 = existsSync(fixFile1_2_1_4)
        t.equal(
          exists1_2_1_4,
          true,
          'findRemove(with ignore + bak extension) did not remove file fixFile1_2_1_4'
        )

        t.strictEqual(
          typeof result[randomFile1_2_1_1],
          'undefined',
          'randomFile1_2_1_1 is NOT in result'
        )
        t.strictEqual(
          typeof result[randomFile1_2_1_2],
          'boolean',
          'randomFile1_2_1_2 is in result'
        )
        t.strictEqual(
          typeof result[fixFile1_2_1_4],
          'undefined',
          'fixFile1_2_1_4 is NOT in result'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(two files and check others)': function (t) {
      findRemove(rootDirectory, {
        files: [randomFilename1_2_1_1, randomFilename1_2_1_3]
      }).then(result => {
        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          false,
          'findRemove(two files and check others) removed randomFile1_2_1_1 fine'
        )

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(
          exists1_2_1_3,
          false,
          'findRemove(two files and check others) removed randomFile1_2_1_3 fine'
        )

        const exists1_2_1_4 = existsSync(fixFile1_2_1_4)
        t.equal(
          exists1_2_1_4,
          true,
          'findRemove(two files and check others) did not remove fixFile1_2_1_4'
        )

        const exists1_2_1_5 = existsSync(fixFile1_2_1_5)
        t.equal(
          exists1_2_1_5,
          true,
          'findRemove(two files and check others) did not remove fixFile1_2_1_5'
        )

        t.strictEqual(
          typeof result[randomFile1_2_1_1],
          'boolean',
          'randomFile1_2_1_1 is in result'
        )
        t.strictEqual(
          typeof result[randomFile1_2_1_3],
          'boolean',
          'randomFile1_2_1_3 is in result'
        )
        t.strictEqual(
          typeof result[fixFile1_2_1_4],
          'undefined',
          'fixFile1_2_1_4 is NOT in result'
        )
        t.strictEqual(
          typeof result[fixFile1_2_1_5],
          'undefined',
          'fixFile1_2_1_5 is NOT in result'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(limit to maxLevel = 0)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        dir: '*',
        maxLevel: 0
      }).then(result => {
        t.strictEqual(
          Object.keys(result).length,
          0,
          'findRemove(limit to maxLevel = 0) returned empty an array.'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(limit to maxLevel = 1)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        dir: '*',
        maxLevel: 1
      }).then(result => {
        t.strictEqual(
          Object.keys(result).length,
          7,
          'findRemove(limit to maxLevel = 1) returned 7 entries.'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(limit to maxLevel = 2)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        dir: '*',
        maxLevel: 2
      }).then(result => {
        t.strictEqual(
          Object.keys(result).length,
          12,
          'findRemove(limit to maxLevel = 2) returned 12 entries.'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(limit to maxLevel = 3)': function (t) {
      findRemove(rootDirectory, { files: '*.*', maxLevel: 3 }).then(result => {
        t.strictEqual(
          Object.keys(result).length,
          6,
          'findRemove(limit to maxLevel = 3) returned 6 entries.'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(limit to maxLevel = 3 + bak only)': function (t) {
      findRemove(rootDirectory, { maxLevel: 3, extensions: '.bak' }).then(result => {
        t.strictEqual(
          Object.keys(result).length,
          2,
          'findRemove(limit to maxLevel = 3 + bak only) returned 2 entries.'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(single dir)': function (t) {
      findRemove(rootDirectory, { dir: 'directory1_2' }).then(result => {
        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, true, 'findRemove(single dir) did not remove directory1_1')

        const exists1_2 = existsSync(directory1_2)
        t.equal(exists1_2, false, 'findRemove(single dir) removed directory1_2')

        t.done()
      }).catch(console.error)
    },

    'findRemove(two directories)': function (t) {
      findRemove(rootDirectory, { dir: ['directory1_1', 'directory1_2'] }).then(result => {
        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, false, 'findRemove(two dirs) removed directory1_1')

        const exists1_2 = existsSync(directory1_2)
        t.equal(exists1_2, false, 'findRemove(two dirs) removed directory1_2')

        const exists1_3 = existsSync(directory1_3)
        t.equal(exists1_3, true, 'findRemove(two dirs) did not remove directory1_3')

        t.done()
      }).catch(console.error)
    },

    'findRemove(directories with the same basename)': function (t) {
      findRemove(rootDirectory, { dir: 'CVS' }).then(result => {
        const exists1_3 = existsSync(directory1_3)
        t.equal(
          exists1_3,
          false,
          'findRemove(directories with the same basename) removed root/directory1/CVS'
        )

        const exists3 = existsSync(directory3)
        t.equal(
          exists3,
          false,
          'findRemove(directories with the same basename) removed root/CVS'
        )

        const exists1_1 = existsSync(directory1_1)
        t.equal(
          exists1_1,
          true,
          'findRemove(remove single dir) did not remove directory1_1'
        )

        const exists1_2 = existsSync(directory1_2)
        t.equal(
          exists1_2,
          true,
          'findRemove(remove single dir) did not remove directory1_2'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(test run)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        dir: '*',
        test: true
      }).then(result => {
        t.strictEqual(
          Object.keys(result).length,
          19,
          'findRemove(test run) returned 19 entries.'
        )

        const exists1_2_1_1 = existsSync(randomFile1_2_1_1)
        t.equal(
          exists1_2_1_1,
          true,
          'findRemove(test run) did not remove randomFile1_2_1_1'
        )

        const exists1_2_1_3 = existsSync(randomFile1_2_1_3)
        t.equal(
          exists1_2_1_3,
          true,
          'findRemove(test run) did not remove randomFile1_2_1_3'
        )

        const exists1_1 = existsSync(directory1_1)
        t.equal(exists1_1, true, 'findRemove(test run) did not remove directory1_1')

        t.done()
      }).catch(console.error)
    }
  }),

  'TC 3: age checks': testCase({
    setUp: function (cb) {
      createFakeDirectoryTree(cb)
    },

    tearDown: function (cb) {
      destroyFakeDirectoryTree(cb)
    },

    'findRemove(files and dirs older than 10000000000000000 sec)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        dir: '*',
        age: { seconds: 10000000000000000 }
      }).then((result) => {
        t.strictEqual(
          Object.keys(result).length,
          0,
          'findRemove(files older than 10000000000000000 sec) returned zero entries.'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(files and dirs older than 10 sec)': function (t) {
      findRemove(rootDirectory, {
        files: '*.*',
        dir: '*',
        age: { seconds: 10 }
      }).then((result) => {
        t.strictEqual(
          Object.keys(result).length,
          0,
          'findRemove(files older than 10 sec) returned zero entries.'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(files older than 2 sec with wait)': function (t) {
      setTimeout(function () {
        findRemove(rootDirectory, {
          files: '*.*',
          age: { seconds: 2 }
        }).then((result) => {
          t.strictEqual(
            Object.keys(result).length,
            11,
            'findRemove(files older than 2 sec with wait) returned 11 entries.'
          )

          t.done()
        }).catch(console.error)
      }, 2100)
    },

    'findRemove(files older than 2 sec with wait + maxLevel = 1)': function (t) {
      setTimeout(function () {
        findRemove(rootDirectory, {
          files: '*.*',
          maxLevel: 1,
          age: { seconds: 2 }
        }).then((result) => {
          t.strictEqual(
            Object.keys(result).length,
            4,
            'findRemove(files older than 2 sec with wait + maxLevel = 1) returned 4 entries.'
          )

          t.done()
        }).catch(console.error)
      }, 2100)
    }
  }),

  'TC 4: github issues': testCase({
    setUp: function (cb) {
      createFakeDirectoryTree(cb)
    },

    tearDown: function (cb) {
      destroyFakeDirectoryTree(cb)
    },

    // from https://github.com/binarykitchen/find-remove/issues/7
    'findRemove(issues/7a)': function (t) {
      setTimeout(function () {
        findRemove(rootDirectory, {
          age: { seconds: 2 },
          extensions: '.csv'
        }).then((result) => {
          t.strictEqual(
            Object.keys(result).length,
            2,
            'findRemove(issues/7) deleted 2 files.'
          )

          t.done()
        }).catch(console.error)
      }, 3 * 1000)
    },

    // from https://github.com/binarykitchen/find-remove/issues/7
    'findRemove(issues/7b)': function (t) {
      findRemove(rootDirectory, { extensions: '.dontexist' })
        .then((result) => {
          t.deepEqual(result, {}, 'is an empty json')

          t.done()
        })
        .catch(console.error)
    }
  }),

  'TC 5: limit checks': testCase({
    setUp: function (cb) {
      createFakeDirectoryTree(cb)
    },

    tearDown: function (cb) {
      destroyFakeDirectoryTree(cb)
    },

    'findRemove(files older with limit of 2)': function (t) {
      findRemove(rootDirectory, { files: '*.*', limit: 2 }).then((result) => {
        t.strictEqual(
          Object.keys(result).length,
          2,
          'findRemove(files with limit of 2) returned 2 entries (out of 11).'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(files and dirs with limit of 5)': function (t) {
      findRemove(rootDirectory, { files: '*.*', dir: '*', limit: 5 }).then((result) => {
        t.strictEqual(
          Object.keys(result).length,
          5,
          'findRemove(files and dirs with limit of 5) returned 5 entries (out of 19).'
        )

        t.done()
      }).catch(console.error)
    }
  }),

  'TC 6: prefix checks': testCase({
    setUp: function (cb) {
      createFakeDirectoryTree(cb)
    },

    tearDown: function (cb) {
      destroyFakeDirectoryTree(cb)
    },

    'findRemove(files with exiting prefix "someth")': function (t) {
      findRemove(rootDirectory, { prefix: 'someth' }).then((result) => {
        t.strictEqual(
          Object.keys(result).length,
          2,
          'findRemove(files with prefix "someth") returned 2 entries (out of 11).'
        )

        t.done()
      }).catch(console.error)
    },

    'findRemove(files with non-existing prefix "ssssssssssssssssssssssssss" - too many chars)':
      function (t) {
        findRemove(rootDirectory, {
          prefix: 'ssssssssssssssssssssssssss'
        }).then((result) => {
          t.strictEqual(
            Object.keys(result).length,
            0,
            'findRemove(files with non-existing prefix "ssssssssssssssssssssssssss"- too many chars) returned 0 entries (out of 11).'
          )

          t.done()
        }).catch(console.error)
      }
  }),

  'TC 7: tests with regex patterns': testCase({
    setUp: function (cb) {
      createFakeDirectoryTreeRegex(cb)
    },
    tearDown: function (cb) {
      destroyFakeDirectoryTree(cb)
    },

    'findRemove(regex pattern files)': function (t) {
      findRemove(rootDirectory, { files: 'thing', regex: true }).then(result => {
        const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
        t.equal(exists1_2_1_2, true, 'did not remove randomFile1_2_1_2')

        const exists1_2_1_4 = existsSync(fixFile1_2_1_4) // something.png
        t.equal(exists1_2_1_4, false, 'removed fixFile1_2_1_4 fine')

        const exists1_2_1_5 = existsSync(fixFile1_2_1_5) // something.jpg
        t.equal(exists1_2_1_5, false, 'removed fixFile1_2_1_5 fine')

        t.done()
      }).catch(console.error)
    },

    'findRemove(regex pattern directories)': function (t) {
      findRemove(rootDirectory, { dir: '^token', regex: true }).then(result => {
        const exists4 = existsSync(directory4)
        t.equal(exists4, true, 'did not remove directory4')

        const exists5 = existsSync(directory5)
        t.equal(exists5, false, 'removed directory5 fine')

        t.done()
      }).catch(console.error)
    }
  }),

  'TC 8: stream tests with regex patterns': testCase({
    setUp: function (cb) {
      createFakeDirectoryTreeRegex(cb)
    },
    tearDown: function (cb) {
      destroyFakeDirectoryTree(cb)
    },

    'findRemove(regex pattern files)': function (t) {
      findRemove(rootDirectory, { files: 'thing', regex: true, returnStream: true }).then(stream => {
        stream.on('finish', () => {
          const exists1_2_1_2 = existsSync(randomFile1_2_1_2)
          t.equal(exists1_2_1_2, true, 'did not remove randomFile1_2_1_2')

          const exists1_2_1_4 = existsSync(fixFile1_2_1_4) // something.png
          t.equal(exists1_2_1_4, false, 'removed fixFile1_2_1_4 fine')

          const exists1_2_1_5 = existsSync(fixFile1_2_1_5) // something.jpg
          t.equal(exists1_2_1_5, false, 'removed fixFile1_2_1_5 fine')

          t.done()
        })
      }).catch(console.error)
    }

  })
})
