'use strict'

const lodash = require('lodash')
const prepareFunctions = require('./prepareFunctions')

function prepareTests (tests) {
  for (var i = 0; i < tests.length; i++) {
    const test = tests[i]
    const derivatives = test.derive
    delete test.derive
    if (derivatives) {
      const args = [i, 1].concat(derivatives.map(function (derive) {
        derive.context = lodash.defaults(derive.context, test.context)
        derive.requestHeader = lodash.defaults(derive.requestHeader, test.requestHeader)
        derive.responseHeader = lodash.defaults(derive.responseHeader, test.responseHeader)
        return lodash.defaults(derive, test)
      }))
      tests.splice.apply(tests, args)
    }
  };
}

function prepareOptions (options) {
  if (!options.base) {
    options.base = 'http' + (options.https ? 's' : '') + '://' + options.server + (options.prefix || '')
  }
  if (!options.tests) {
    options.tests = []
  }
  options.before = prepareFunctions(options.before)
  options.after = prepareFunctions(options.after)
  prepareTests(options.tests)
  if (!options.defaults) {
    options.defaults = {}
  }
  return options
}

module.exports = prepareOptions
