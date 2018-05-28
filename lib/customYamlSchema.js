'use strict'

const Schema = require('js-yaml/lib/js-yaml/schema')
const Type = require('js-yaml/lib/js-yaml/type')

function type (types) {
  return new Type('tag:yaml.org,2002:type', {
    kind: 'scalar',
    resolve (value) {
      return types[value]
    },
    construct (value) {
      return types[value]
    },
    predicate (value) {
      return typeof value === 'string' && value.length > 0
    }
  })
}

function env () {
  return new Type('tag:yaml.org,2002:env', {
    kind: 'scalar',
    resolve (value) {
      if (process.env[value] === undefined) {
        throw new Error(`Environment variable ${value} is missing`)
      }
      return true
    },
    construct (value) {
      return process.env[value]
    },
    predicate (value) {
      return typeof value === 'string' && value.length > 0
    }
  })
}

module.exports = function (types) {
  return new Schema({
    include: [
      require('js-yaml/lib/js-yaml/schema/default_full')
    ],
    explicit: [
      type(types),
      env()
    ]
  })
}
