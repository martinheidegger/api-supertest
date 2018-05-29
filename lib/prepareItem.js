'use strict'

const lodash = require('lodash')
const prepareFunctions = require('./prepareFunctions')

function getData (item, method) {
  var data
  if (method === 'POST') {
    data = item.post
    delete item.post
  } else if (method === 'PUT') {
    data = item.put
    delete item.put
  } else if (method === 'PATCH') {
    data = item.patch
    delete item.patch
  } else if (method === 'HEAD') {
    data = item.head
    delete item.head
  }
  return data || item.data
}

function getMethod (item) {
  if (item.post) {
    return 'POST'
  }
  if (item.put) {
    return 'PUT'
  }
  if (item.patch) {
    return 'PATCH'
  }
  if (item.head) {
    return 'HEAD'
  }
  if (item.get) {
    return 'GET'
  }
  return item.method ? item.method.toString().toUpperCase() : 'GET'
}

function getPath (item) {
  var path = item.path
  if (!path) {
    path = ''
  }
  if (item.get) {
    var queryIndex = path.indexOf('?')
    if (queryIndex !== -1) {
      path = path.substr(0, queryIndex)
    }
    path += '?' + item.get
  }
  delete item.get
  return path
}

function prepareItem (item, options) {
  const defaults = options.defaults
  item = lodash.defaults(item, defaults)
  item.requestHeader = lodash.defaults(item.requestHeader, defaults.requestHeader)
  item.responseHeader = lodash.defaults(item.responseHeader, defaults.responseHeader)
  item.context = lodash.defaults(item.context, defaults.context)
  item.method = getMethod(item)
  item.data = JSON.stringify(getData(item, item.method), null, 2)
  item.path = getPath(item)
  item.before = prepareFunctions(item.wait && ((state, _, cb) => {
    options.output.endpointWait(state.item)
    setTimeout(() => {
      cb()
    }, item.wait)
  }), options.beforeEach, item.before)
  item.after = prepareFunctions(item.after, options.afterEach)
  if (item.json) {
    if (!item.requestHeader.Accept) {
      item.requestHeader.Accept = 'application/json'
    }
    if (!item.responseHeader['Content-Type']) {
      item.responseHeader['Content-Type'] = /application\/json(; charset=UTF-8)?/
    }
  }
  return item
}

module.exports = prepareItem
