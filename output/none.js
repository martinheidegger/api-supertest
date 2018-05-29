'use strict'

function skip () {
  return undefined
}

module.exports = {
  start: skip,
  end: function end (passed, total, cb) {
    if (cb) {
      cb(null, passed === total)
    }
  },
  endpointWait: skip,
  endpointStart: skip,
  endpointEnd: skip
}
