'use strict'

exports.run = function () {
  require('./collectYaml')('./spec', function (err, data) {
    if (err) {
      return console.log(err.stack)
    }
    data.output = require('../output/' + (data.output || 'console'))
    require('./index')(data)
  })
}
