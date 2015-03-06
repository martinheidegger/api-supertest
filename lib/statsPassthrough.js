"use strict";

function statsPassthrough(stats, cb) {
	process.nextTick(function () {
	    cb(null, stats);
	});
}

module.exports = statsPassthrough;