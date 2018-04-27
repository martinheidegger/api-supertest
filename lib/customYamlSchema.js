'use strict'

const Schema = require('js-yaml/lib/js-yaml/schema')
const Type = require('js-yaml/lib/js-yaml/type')

module.exports = function (types) {
  function constructType (value) {
    return types[value]
  }

  function resolveType (value) {
    return types[value]
  }

  function isType (value) {
    return typeof value === 'string' && value.length > 0
  }

  return new Schema({
    include: [
      require('js-yaml/lib/js-yaml/schema/default_full')
    ],
    explicit: [
      new Type('tag:yaml.org,2002:type', {
        kind: 'scalar',
        resolve: resolveType,
        construct: constructType,
        predicate: isType
      })
    ]
  })
}
