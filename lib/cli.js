'use strict'
const runTests = require('./index')
const collectYaml = require('./collectYaml')
const path = require('path')

function _run (options, cb) {
  collectYaml(options, function (err, options) {
    if (err) return cb(err)
    options.output = require('../output/' + (options.output || 'console'))
    runTests(options, cb)
  })
}

function run (options, cb) {
  if (typeof options === 'function') {
    return _run(null, cb)
  }
  return _run(options, cb)
}

exports.run = run
