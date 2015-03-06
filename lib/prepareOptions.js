"use strict";

var statePassthrough = require("./statePassthrough"),
	lodash = require("lodash");

function passthrough(cb) {
	process.nextTick(cb);
}

function prepareTests(tests) {
	for (var i = 0; i < tests.length; i++) {
		var test = tests[i],
			derivatives = test.derive,
			args;
		delete test.derive;
		if (derivatives) {
			args = [i, 1].concat(derivatives.map(function (derive) {
				lodash.defaults(derive.context, test.context);
				return lodash.defaults(derive, test);
			}));
			tests.splice.apply(tests, args);
		}
	};
}

function prepareOptions(options) {
	if (!options.base) {
		options.base = "http" + (options.https ? "s" : "") + "://" + options.server + (options.prefix || "");
	}
	if (!options.tests) {
		options.tests = [];
	}
	prepareTests(options.tests);
	if (!options.defaults) {
		options.defaults = {};
	}
	if (!options.before) {
		options.before = passthrough;
	}
	if (!options.after) {
		options.after = passthrough;
	}
	if (!options.beforeEach) {
		options.beforeEach = statePassthrough;
	}
	if (!options.afterEach) {
		options.afterEach = statePassthrough;
	}
	if (!options.output) {
		options.output = require("../output/none");
	}
	return options;
}

module.exports = prepareOptions;