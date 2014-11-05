"use strict";

function statePassthrough(state, cb) {
	process.nextTick(function () {
	    cb(null, state);
	});
}

module.exports = statePassthrough;