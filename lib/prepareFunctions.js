'use strict'

function addToArray (arr, item) {
  if (Array.isArray(item)) {
    return arr.concat(item)
  }
  arr.push(item)
  return arr
}

function prepareFunctions (...fns) {
  let arr = fns.reduce((arr, fn) => {
    return addToArray(arr, fn)
  }, [])
  arr = arr.filter(fn => typeof fn === 'function')
  return arr
}

module.exports = prepareFunctions
