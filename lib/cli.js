'use strict'
const runTests = require('./index')
const collectYaml = require('./collectYaml')

function _run (opts, cb) {
  collectYaml(opts, function (err, options) {
    if (err) return cb(err)
    options.output = require('../output/' + (options.output || 'console'))
    runTests(options, cb)
  })
}

function run (opts, cb) {
  if (typeof opts === 'function') {
    return _run(null, cb)
  }
  return _run(opts, cb)
}

exports.run = run
