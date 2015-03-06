"use strict";

var prepareItem = require("./prepareItem"),
	async = require("async"),
	supertest = require("supertest"),
	prepareOptions = require("./prepareOptions"),
	joi = require("joi"),
	lodash = require("lodash"),
	dataDefinition = joi.string(),
	itemDefinition = joi.object({
		method: joi.string().regex(/^get|post|head|put|delete|trace|options|connect|patch$/i).optional(),
		get:    joi.string().optional().regex(/^[^?]/),
		context:joi.object().optional().default({}),

		priority: joi.number().default(1),

		post:   dataDefinition,
		put:    dataDefinition,
		patch:  dataDefinition,
		head:   dataDefinition,
		data:   dataDefinition,
		code:   joi.number().integer().min(100).max(999),
		json:   joi.object().optional(),

		maxRedirects: joi.number().integer().optional().default(10).min(0),
		note:   joi.string().optional(),

		path:   joi.string(),
		before: joi.func().optional(),
		after:  joi.func().optional(),

		tests:  joi.array().optional()
	}).without('method', ['post', 'put', 'patch', 'head'])
	.without('post', ['method', 'put', 'patch', 'head'])
	.without('put', ['post', 'method', 'patch', 'head'])
	.without('patch', ['post', 'put', 'method', 'head'])
	.without('head', ['post', 'put', 'patch', 'method']),
	optionsDefinition = joi.object({
		base:       joi.string().regex(/$https?:\/\//),
		tests:      joi.array().optional(),

		before:     joi.func().optional(),
		after:      joi.func().optional(),
		beforeEach: joi.func().optional(),
		afterEach:  joi.func().optional(),

		defaults:   itemDefinition,
		output:     joi.func().optional()
	});

function applyContext(field, context) {
	context = context || {};
	if (typeof field === "string") {
		var onlyOne = /^\$\{([^\}]+)\}$/.exec(field);
		if (onlyOne) {
			return context[onlyOne[1]] || onlyOne[1];
		}
		return field.replace(/\$\{([^\}]+)\}/, function (full, first) {
			return context[first] || first;
		});
	}
	return field;
}

function applyAllContext(state, cb) {
	var item = state.item;
	var context = lodash.defaults(item.context, context);
	item.method = applyContext(item.method, context);
	item.path = applyContext(item.path, context);
	item.code = applyContext(item.code, context);
	item.maxRedirects = applyContext(item.maxRedirects, context);
	item.data = applyContext(item.data, context);
	process.nextTick(cb);
}

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
			r.expect('Content-Type', /application\/json(\; charset\=UTF\-8)?/);
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
		error: null,
		context: {}
	};


	async.series([
		options.beforeEach.bind(options, state),
		state.item.before.bind(state.item, state),
		function (cb) {
			itemDefinition.validate(state.item, function (error, item) {
				options.output.endpointStart(state.item);
				state.item = item;
				cb(error, state);
			});
		},
		applyAllContext.bind(null, state),
		prepareRequest.bind(null, options.base, state),
		function (cb) {
			state.request.end(function (err, res) {
				state.data = res.text;
				if (err) {
					return cb(err);
				}
				if (item.json) {
					var json;
					try {
						json = JSON.parse(res.text);
						state.json = json;
					} catch(e) {
						e.message = "Error while parsing expected JSON response: " + e.message + "\n\n" + res.text;
						return cb(e);
					}
					return item.json.validate(res.text, cb);
				}
				if (item.result) {
					if (typeof item.result === "function") {
						return item.result(res.text, cb);
					} else if (item.result !== state.data) {
						return cb(new Error("Response doesn't match the expected result."));
					}
				}
				cb();
			})
		},
		state.item.after.bind(state.item, state),
		options.afterEach.bind(options, state)
	], function (error) {
		if (error) {
			state.error = error;	
		}
		if (!state.error) {
			stats.passed += 1;
		}
		options.output.endpointEnd(state);
		cb(null, state);
	});
}

function fillPriorities(tests) {
	tests.forEach(function (test) {
		if (typeof test.priority !== "number")
			test.priority = 1;
	})
}

function sortTestsOnPriority(tests) {
	return tests.sort(function (a, b) {
		if (a.priority < b.priority)
			return 1;

		if (a.priority > b.priority)
			return -1;

		if (a.path > b.path)
			return 1;

		if (b.path > a.path)
			return -1;

		return 0;
	});
}

function runTests(options, cb) {
	var stats = {
			passed: 0
		},
		isSuccess = false;

	optionsDefinition.validate(options, function (error, options) {

		options = prepareOptions(options);

		fillPriorities(options.tests);

		options.tests = sortTestsOnPriority(options.tests);

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
		], function (error) {
			if (cb) {
				cb(null, isSuccess);
			} else {
				process.exit(isSuccess ? 0 : 1);
			}
		});
	});
}

module.exports = runTests;