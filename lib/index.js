"use strict";

var prepareItem = require("./prepareItem"),
	async = require("async"),
	supertest = require("supertest"),
	prepareOptions = require("./prepareOptions");

function prepareRequest(base, state, cb) {
	process.nextTick(function () {
		var item = state.item,
			r = new supertest.Test(base, item.method, item.path);
		if (item.code) {
			r.expect(item.code);
		}
		if (item.data) {
			r.send(item.data);
		}
		if (item.json) {
	      	r.set('Accept', 'application/json');
			r.expect('Content-Type', 'application/json; charset=UTF-8');
		}
		if (typeof item.maxRedirects === "number" && item.maxRedirects >= 0) {
			r.redirects(item.maxRedirects);
		}
		state.request = r;
	    cb(null, state);
	});
}

function processItem(options, stats, item, cb) {
	var state = {
		item: prepareItem(item, options.defaults),
		request: null,
		error: null
	};

	options.output.endpointStart(state.item);

	async.series([
		prepareRequest.bind(null, options.base, state),
		options.beforeEach.bind(options, state),
		state.item.before.bind(state.item, state),
		function (cb) {
			state.request.end(function (err, res) {
				if (err) {
					state.error = err;
					cb();
					return;
				}
				if (item.json) {
					var json;
					try {
						json = JSON.parse(res.text);
					} catch(e) {
						e.message = "Error while parsing expected JSON response: " + e.message + "\n\n" + res.text;
						state.error = e;
						return cb();
					}
					item.json.validate(res.text, function (err, data) {
						if (err) {
							state.error = err;
						} else {
							stats.passed += 1;
						}
						cb();
					});
					return;
				}
				if (item.result) {
					if (typeof item.result === "function") {
						return item.result(res.text, cb);
					} else if (item.result !== res.text) {
						state.error = new Error("Response doesn't match the expected result.");
					}
				}
				cb();
			})
		},
		state.item.after.bind(state.item, state),
		options.afterEach.bind(options, state),
		function (cb) {
			process.nextTick(function () {
				options.output.endpointEnd(state);
				cb();
			});	
		}
	], cb);
}

function runTests(options, cb) {
	var stats = {
			passed: 0
		},
		isSuccess = false;

	options = prepareOptions(options);

	async.series([
		function (cb) {
			process.nextTick(function () {
				options.output.start(options.base);
				cb();		    
			});
		},
		options.before.bind(options),
		async.mapSeries.bind(async,
			options.tests,
			processItem.bind(null, options, stats)
		),
		options.after.bind(options),
		function (cb) {
			process.nextTick(function () {
				isSuccess = stats.passed === options.tests.length;
				options.output.end(stats.passed, options.tests.length, cb); 
			});
		}
	], function () {
		if (cb) {
			cb(null, isSuccess);
		} else {
			process.exit(isSuccess ? 0 : 1);
		}
	});
}

module.exports = runTests;