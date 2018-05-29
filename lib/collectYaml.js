'use strict'

const yaml = require('js-yaml')
const glob = require('glob')
const path = require('path')
const fs = require('fs')
const customYamlSchema = require('./customYamlSchema')
const parallel = require('async/parallel')
const asyncMap = require('async/map')

function exists (path, cb) {
  fs.access(path, function (error) {
    if (error) return cb(null, false)
    cb(null, true)
  })
}

function loadDotEnv (cwd, flag) {
  var opts = {}
  if (typeof flag === 'string') {
    opts.path = path.resolve(cwd, flag)
    flag = true
  }
  if (flag) {
    require('dotenv').config(opts)
  }
}

function _collectYaml (opts, cb) {
  opts = Object.assign({
    spec: './spec',
    cwd: process.cwd(),
    dotEnv: false
  }, opts)
  const specFolder = path.resolve(opts.cwd, opts.spec)
  const options = path.join(specFolder, 'options.yml')
  const typeFile = path.join(specFolder, 'type.js')

  loadDotEnv(opts.cwd, opts.dotEnv)

  parallel({
    hasOptions: exists.bind(fs, options),
    hasTypes: exists.bind(fs, typeFile),
    testFiles: glob.bind(null, path.resolve(specFolder, 'tests/*.yml'))
  }, function (_, data) {
    const all = {
      tests: asyncMap.bind(null, data.testFiles, loadYml)
    }
    let type = {}
    if (data.hasTypes) {
      try {
        global.joi = require('joi')
        type = require(typeFile)
      } catch (e) {
        return cb(e)
      }
    }

    const schema = customYamlSchema(type)
    if (data.hasOptions) {
      all.options = loadYml.bind(null, options)
    }

    function loadYml (file, cb) {
      fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
          err.message = "Error while loading '" + file + "': " + err.message
          return cb(err)
        }
        data = data.toString()
        try {
          var doc = yaml.safeLoad(data, {
            schema
          })
        } catch (e) {
          e.message = "Error while parsing '" + file + "': " + e.message
          e.stack = e.message
          return cb(e)
        }
        cb(null, doc)
      })
    }
    parallel(all, function (err, config) {
      if (err) return cb(err)
      const options = config.options || {}
      let combined
      config.tests.forEach(function (testList) {
        if (!combined) {
          combined = []
        }
        combined = combined.concat(testList)
      })
      if (combined) {
        options.tests = (options.tests || []).concat(combined)
      }
      cb(null, options)
    })
  })
}

function collectYaml (opts, cb) {
  if (typeof opts === 'function') {
    return _collectYaml(null, opts)
  }
  return _collectYaml(opts, cb)
}

module.exports = collectYaml
