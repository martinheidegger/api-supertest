"use strict";

function statePassthrough(state, stats, cb) {
	process.nextTick(function () {
	    cb(null, state);
	});
}

module.exports = statePassthrough;