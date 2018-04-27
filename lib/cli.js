'use strict'
const runTests = require('./index')
const collectYaml = require('./collectYaml')

exports.run = function (cb) {
  collectYaml('./spec', function (err, options) {
    if (err) return cb(err)
    options.output = require('../output/' + (options.output || 'console'))
    runTests(options, cb)
  })
}
