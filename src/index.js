const Stream = require('stream')
const fs = require('fs/promises')
const path = require('path')
const rimraf = require('rimraf')

let now
let testRun

async function exists (path) {
  try {
    await fs.access(path)
    return true
  } catch (e) {
    return false
  }
}

async function isOlder(path, ageSeconds) {
  const stats = await fs.stat(path)
  const mtime = stats.mtime.getTime()
  const expirationTime = mtime + ageSeconds * 1000

  return now > expirationTime
}

function hasLimit(options) {
  return options && 'limit' in options
}

function getLimit(options) {
  return hasLimit(options) ? options.limit : -1
}

function hasTotalRemoved(options) {
  return options && 'totalRemoved' in options
}

function getTotalRemoved(options) {
  return hasTotalRemoved(options) ? options.totalRemoved : -2
}

function isOverTheLimit(options) {
  return getTotalRemoved(options) >= getLimit(options)
}

function hasMaxLevel(options) {
  return options && 'maxLevel' in options
}

function getMaxLevel(options) {
  return hasMaxLevel(options) ? options.maxLevel : -1
}

function getAgeSeconds(options) {
  return options && options.age && options.age.seconds ? options.age.seconds : null
}

async function doDeleteDirectory(currentDir, options, currentLevel) {
  let doDelete = false
  const dir = options && options.dir

  if (dir) {
    const ageSeconds = getAgeSeconds(options)
    const basename = path.basename(currentDir)

    if (Array.isArray(dir)) {
      doDelete = dir.indexOf('*') !== -1 || dir.indexOf(basename) !== -1
    } else if (
      (options.regex && basename.match(new RegExp(dir))) ||
      basename === dir ||
      dir === '*'
    ) {
      doDelete = true
    }

    if (doDelete && hasLimit(options)) {
      doDelete = !isOverTheLimit(options)
    }

    if (doDelete && hasMaxLevel(options) && currentLevel > 0) {
      doDelete = currentLevel <= getMaxLevel(options)
    }

    if (ageSeconds && doDelete) {
      doDelete = await isOlder(currentDir, ageSeconds)
    }
  }

  return doDelete
}

async function doDeleteFile(currentFile, options = {}) {
  // by default it deletes nothing
  let doDelete = false

  const extensions = options.extensions ? options.extensions : null
  const files = options.files ? options.files : null
  const prefix = options.prefix ? options.prefix : null
  const ignore = options && options.ignore ? options.ignore : null

  // return the last portion of a path, the filename aka basename
  const basename = path.basename(currentFile)

  if (files) {
    if (Array.isArray(files)) {
      doDelete = files.indexOf('*.*') !== -1 || files.indexOf(basename) !== -1
    } else {
      if ((options.regex && basename.match(new RegExp(files))) || files === '*.*') {
        doDelete = true
      } else {
        doDelete = basename === files
      }
    }
  }

  if (!doDelete && extensions) {
    const currentExt = path.extname(currentFile)

    if (Array.isArray(extensions)) {
      doDelete = extensions.indexOf(currentExt) !== -1
    } else {
      doDelete = currentExt === extensions
    }
  }

  if (!doDelete && prefix) {
    doDelete = basename.indexOf(prefix) === 0
  }

  if (doDelete && hasLimit(options)) {
    doDelete = !isOverTheLimit(options)
  }

  if (doDelete && ignore) {
    if (Array.isArray(ignore)) {
      doDelete = !(ignore.indexOf(basename) !== -1)
    } else {
      doDelete = !(basename === ignore)
    }
  }

  if (doDelete) {
    const ageSeconds = getAgeSeconds(options)

    if (ageSeconds) {
      doDelete = await isOlder(currentFile, ageSeconds)
    }
  }

  return doDelete
}

function isTestRun(options) {
  return options && 'test' in options ? options.test : false
}

function createObjectStream() {
  const stream = new Stream.Readable({ objectMode: true })
  stream._read = () => { }
  return stream
}

async function streamFindRecursive(currentDir, options, currentLevel, _stream) {

}

async function find (currentDir, options = {}, currentLevel, stream) {
  try {
    if (!isOverTheLimit(options) && await exists(currentDir)) {
      const maxLevel = getMaxLevel(options)
      let deleteDirectory = false

      options.totalToRemove = options.totalToRemove || 0
      currentLevel = currentLevel === undefined ? 0 : currentLevel + 1

      if (currentLevel < 1) {
        now = new Date().getTime()
        testRun = isTestRun(options)
      } else {
      // check directories before deleting files inside.
      // this to maintain the original creation time,
      // because linux modifies creation date of folders when files within have been deleted.
        deleteDirectory = await doDeleteDirectory(currentDir, options, currentLevel)
      }

      if (maxLevel === -1 || currentLevel < maxLevel) {
        const filesInDir = await fs.readdir(currentDir)

        const promises = filesInDir.map(async function (file) {
          const currentFile = path.join(currentDir, file)
          let skip = false
          let stat

          try {
            stat = await fs.stat(currentFile)
          } catch (exc) {
          // ignore
            skip = true
          }

          if (skip) {
          // ignore, do nothing
          } else if (stat.isDirectory()) {
          // the recursive call
            await find(currentFile, options, currentLevel, stream)
          } else {
            if (await doDeleteFile(currentFile, options)) {
              stream.push({ path: currentFile, type: 'file' })
              options.totalToRemove++
            }
          }
        })

        await Promise.all(promises)
      }

      if (deleteDirectory) {
        stream.push({ path: currentDir, type: 'directory' })
      }
    }
  } catch (e) {
    stream.emit('error', e)
  }
}

async function streamFind (currentDir, options, currentLevel) {
  const stream = createObjectStream()
  let hasReadingBegun = false
  stream.on('newListener', (l) => {
    if (!hasReadingBegun) {
      hasReadingBegun = true
      find(currentDir, options, currentLevel, stream)
        .then(d => {
          stream.push(null)
        })
        .catch(e => {
          console.error('error', e)
          stream.emit('error', e)
        })
    }
  })
  return stream
}

async function deleteFile(file) {
  if (!testRun) {
    try {
      await fs.unlink(file.path)
      file.deleted = true
    } catch (exc) {
      console.debug(exc)
    }
  }
}

async function deleteFolder(file) {
  if (!testRun) {
    rimraf.sync(file.path)
    file.deleted = true
  }
}

const streamDelete = (findStream, options) =>
  new Stream.Transform({
    objectMode: true,
    transform: function transformer(record, encoding, callback) {
      this.count = this.count || 0
      if (!hasLimit(options) || this.count < getLimit(options)) {
        findStream.pause()
        if (record.type === 'file') {
          deleteFile(record)
            .then(() => {
              callback(undefined, record)
              findStream.resume()
            })
            .catch(callback)
        } else {
          deleteFolder(record)
            .then(() => {
              callback(undefined, record)
              findStream.resume()
            })
            .catch(callback)
        }
      } else {
        // End transformation
        callback()
      }
      this.count++
    }
  })

/**
 * findRemoveSync(currentDir, options) takes any start directory and searches files from there for removal.
 * the selection of files for removal depends on the given options. when no options are given, or only the maxLevel
 * parameter is given, then everything is removed as if there were no filters.
 *
 * beware: everything happens synchronously.
 *
 *
 * @param {String} currentDir any directory to operate within. it will seek files and/or directories recursively from there.
 * beware that it deletes the given currentDir when no options or only the maxLevel parameter are given.
 * @param options json object with optional properties like extensions, files, ignore, maxLevel and age.seconds.
 * @return {Object} json object of files and/or directories that were found and successfully removed.
 * @api public
 */
const findRemove = async function (currentDir, options = {}, currentLevel) {
  const findStream = await streamFind(currentDir, options, currentLevel)
  return new Promise((resolve, reject) => {
    const deleteStream = streamDelete(findStream, options)
    const outputStream = new Stream.PassThrough({ objectMode: true })

    if (!options.returnStream) {
      const result = []
      let ended = false
      const onEnd = () => {
        if (!ended) {
          resolve(result.reduce((map, file) => {
            map[file.path] = true
            return map
          }, {}))
          ended = true
        }
      }
      // outputStream.on('end', onEnd)
      outputStream.on('finish', onEnd)
      // outputStream.on('close', onEnd)

      outputStream.on('data', record => {
        result.push(record)
      })
    }
    Stream.pipeline(
      findStream,
      deleteStream,
      outputStream,
      err => reject(err)
    )
    if (options.returnStream) {
      // Return the output stream for user to manipulate
      // More memory efficient if you have a large number of files as they wont accumulate on an array.
      resolve(outputStream)
    }
  })
}

module.exports = findRemove
