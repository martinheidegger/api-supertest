'use strict'

const prepareItem = require('./prepareItem')
const series = require('async/series')
const mapSeries = require('async/mapSeries')
const applyEachSeries = require('async/applyEachSeries')
const supertest = require('supertest')
const prepareOptions = require('./prepareOptions')
const joi = require('joi')
const lodash = require('lodash')
const dataDefinition = joi.alternatives().try(joi.string(), joi.object())
const util = require('util')
const hook = joi.alternatives(
  joi.func(),
  joi.array().items(joi.func())
).optional()

const itemDefinition = joi.object({
  method: joi.string().regex(/^get|post|head|put|delete|trace|options|connect|patch$/i).optional(),
  get: joi.string().optional().regex(/^[^?]/),
  context: joi.object().optional().default({}),
  requestHeader: joi.object().default({}),
  responseHeader: joi.object().default({}),
  username: joi.string().optional(),
  password: joi.string().optional(),

  priority: joi.number().default(1),

  post: dataDefinition,
  put: dataDefinition,
  patch: dataDefinition,
  head: dataDefinition,
  data: dataDefinition,
  code: joi.number().integer().min(100).max(999),
  json: joi.object().optional(),
  result: joi.alternatives().optional().try(joi.func(), joi.string()),

  maxRedirects: joi.number().integer().optional().default(10).min(0),
  note: joi.string().optional(),

  path: joi.string(),
  before: hook,
  after: hook,

  tests: joi.array().optional()
}).without('method', ['post', 'put', 'patch', 'head'])
  .without('post', ['method', 'put', 'patch', 'head'])
  .without('put', ['post', 'method', 'patch', 'head'])
  .without('patch', ['post', 'put', 'method', 'head'])
  .without('head', ['post', 'put', 'patch', 'method'])
  .without('result', ['json'])

const optionsDefinition = joi.object({
  https: joi.boolean(),
  base: joi.string().regex(/$https?:\/\//),
  prefix: joi.string(),
  server: joi.string(),
  tests: joi.array().optional(),
  username: joi.string().optional(),
  password: joi.string().optional(),

  before: hook,
  after: hook,
  beforeEach: hook,
  afterEach: hook,

  defaults: itemDefinition,
  output: joi.object({
    start: joi.func(),
    end: joi.func(),
    endpointStart: joi.func(),
    endpointEnd: joi.func()
  }).default(require('../output/none'))
})

function applyContext (field, context) {
  context = context || {}
  if (typeof field === 'string') {
    const onlyOne = /^\$\{([^}]+)\}$/.exec(field)
    if (onlyOne) {
      return context[onlyOne[1]] || onlyOne[1]
    }
    return field.replace(/\$\{([^}]+)\}/ig, function (full, first) {
      return context[first] || first
    })
  }
  return field
}

function applyAllContext (state, stats, cb) {
  const item = state.item
  const context = lodash.defaults(item.context, stats.context)
  item.method = applyContext(item.method, context)
  if (item.requestHeader) {
    Object.keys(item.requestHeader).forEach(function (key) {
      item.requestHeader[key] = applyContext(item.requestHeader[key], context)
    })
  }
  if (item.responseHeader) {
    Object.keys(item.responseHeader).forEach(function (key) {
      item.responseHeader[key] = applyContext(item.responseHeader[key], context)
    })
  }
  item.path = applyContext(item.path, context)
  item.code = applyContext(item.code, context)
  item.maxRedirects = applyContext(item.maxRedirects, context)
  item.data = applyContext(item.data, context)
  item.username = applyContext(item.username, context)
  item.password = applyContext(item.password, context)
  process.nextTick(cb)
}

function prepareRequest (base, state, cb) {
  process.nextTick(function () {
    const item = state.item
    let path = item.path
    let parts = /^(https?:\/\/[^/]+\/)(.*)/.exec(item.path)
    if (parts) {
      base = parts[1]
      path = parts[2]
    }
    const r = new supertest.Test(base, item.method, path)
    if (item.username) {
      r.auth(item.username, item.password)
    }
    if (item.code) {
      r.expect(item.code)
    }
    if (item.data) {
      r.send(item.data)
    }
    Object.keys(item.requestHeader).forEach(function (key) {
      const value = item.requestHeader[key]
      if (value) {
        r.set(key, value)
      }
    })
    Object.keys(item.responseHeader).forEach(function (key) {
      const value = item.responseHeader[key]
      if (value) {
        r.expect(key, value)
      }
    })
    if (typeof item.maxRedirects === 'number' && item.maxRedirects >= 0) {
      r.redirects(item.maxRedirects)
    }
    state.request = r
    cb(null, state)
  })
}

function processItem (options, stats, item, cb) {
  var state = {
    item: prepareItem(item, options),
    request: null,
    error: null,
    context: {}
  }

  series([
    function (cb) {
      itemDefinition.validate(state.item, function (error, item) {
        state.item = item
        if (error) {
          error.message = 'Error in request specification: \n[Spec]\n' + util.inspect(state.item, {depth: 5}) + '\n\n[Error]\n' + error.message
        }
        cb(error, state)
      })
    },
    applyAllContext.bind(null, state, stats),
    applyEachSeries.bind(stats, item.before, state, stats),
    prepareRequest.bind(null, options.base, state),
    function (cb) {
      process.nextTick(function () {
        options.output.endpointStart(state.item)
        cb(null, state)
      })
    },
    function (cb) {
      state.request.end(function (err, res) {
        if (err) {
          return cb(err)
        }
        state.data = res.text
        if (item.json) {
          var json
          try {
            json = JSON.parse(res.text)
            state.json = json
          } catch (e) {
            e.message = 'Error while parsing expected JSON response: ' + e.message + '\n\n' + res.text
            return cb(e)
          }
          return item.json.validate(res.text, function (err, data) {
            if (err) {
              err.message = 'Server response does not fit the requirements: \n[Response]\n' + JSON.stringify(json, null, '  ') + '\n\n[Error]\n' + err.message
            }
            cb(err, data)
          })
        }
        if (item.result) {
          if (typeof item.result === 'function') {
            return item.result(res.text, cb)
          }
          if (item.result !== state.data) {
            return cb(new Error("Response doesn't match the expected result."))
          }
        }
        cb()
      })
    },
    applyEachSeries.bind(stats, item.after, state, stats),
  ], function (error) {
    if (error) {
      state.error = error
    }
    if (!state.error) {
      stats.passed += 1
    }
    options.output.endpointEnd(state)
    cb(null, state)
  })
}

function fillPriorities (tests) {
  tests.forEach(function (test) {
    if (typeof test.priority !== 'number') { test.priority = 1 }
  })
}

function sortTestsOnPriority (tests) {
  return tests.sort(function (a, b) {
    if (a.priority < b.priority) return 1
    if (a.priority > b.priority) return -1
    if (a.path > b.path) return 1
    if (b.path > a.path) return -1
    return 0
  })
}

function runTests (options, cb) {
  optionsDefinition.validate(options, function (error, options) {
    if (error) return cb(error)
    options = prepareOptions(options)

    fillPriorities(options.tests)

    options.tests = sortTestsOnPriority(options.tests)

    const stats = {
      passed: 0,
      context: Object.assign({}, options.defaults && options.defaults.context)
    }
    let isSuccess = false

    series([
      function (cb) {
        process.nextTick(function () {
          options.output.start(options.base)
          cb()
        })
      },
      applyEachSeries.bind(stats, options.before, stats),
      mapSeries.bind(null,
        options.tests,
        processItem.bind(null, options, stats)
      ),
      applyEachSeries.bind(stats, options.after, stats),
      function (cb) {
        process.nextTick(function () {
          isSuccess = stats.passed === options.tests.length
          options.output.end(stats.passed, options.tests.length, cb)
        })
      }
    ], function (_) {
      cb(null, isSuccess)
    })
  })
}

module.exports = runTests
