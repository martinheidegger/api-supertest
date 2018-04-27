'use strict'

const yaml = require('js-yaml')
const glob = require('glob')
const path = require('path')
const fs = require('fs')
const async = require('async')

function exists (path, cb) {
  fs.access(path, function (error) {
    if (error) return cb(null, false)
    cb(null, true)
  })
}

function collectYaml (folder, cb) {
  const options = path.resolve(folder, 'options.yml')
  const typeFile = path.resolve(folder, 'type.js')

  async.parallel({
    hasOptions: exists.bind(fs, options),
    hasTypes: exists.bind(fs, typeFile),
    testFiles: glob.bind(null, path.resolve(folder, 'tests/*.yml'))
  }, function (err, data) {
    if (err) return cb(err)
    const all = {
      tests: async.map.bind(async, data.testFiles, loadYml)
    }
    let schema
    let type = {}
    if (data.hasOptions) {
      all.options = loadYml.bind(null, options)
    }
    if (data.hasTypes) {
      try {
        global.joi = require('joi')
        type = require(typeFile)
      } catch (e) {
        return cb(e)
      }
    }
    schema = require('./customYamlSchema')(type)

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
    async.parallel(all, function (err, config) {
      if (err) return cb(err)
      const options = data.hasOptions ? config.options : {}
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

module.exports = collectYaml
