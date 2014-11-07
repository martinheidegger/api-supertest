"use strict";

var yaml = require("js-yaml"),
	glob = require("glob"),
	path = require("path"),
	fs = require("fs"),
	async = require("async");

function exists(path, cb) {
	fs.exists(path, function (exists) {
		cb(null, exists);
	});
}

function collectYaml(folder, cb) {
	var options = path.resolve(folder, "options.yml"),
		typeFile = path.resolve(folder, "type.js");

	async.parallel({
		hasOptions: exists.bind(fs, options),
		hasTypes: exists.bind(fs, typeFile),
		testFiles: glob.bind(null, path.resolve(folder, "tests/*.yml"))
	}, function (err, data) {
		if (err) {
		    return cb(err);
		}
		var schema,
			all = {
				tests: async.map.bind(async, data.testFiles, loadYml)
			},
			type = {};
		if (data.hasOptions) {
			all.options = loadYml.bind(null, options);
		}
		if (data.hasTypes) {
			try {
				global.joi = require("joi");
				type = require(typeFile);
			} catch(e) {
				return cb(e);
			}
		}
		schema = require("./customYamlSchema")(type);
		function loadYml(file, cb) {
			fs.readFile(file, "utf8", function (err, data) {
				if (err) {
					err.message = "Error while loading '" + file + "': " + err.message;
				    return cb(err);
				}
				data = data.toString();
				try {
					var doc = yaml.safeLoad(data, {
						schema: schema
					});
				} catch(e) {
					e.message = "Error while parsing '" + file + "': " + e.message;
					e.stack = e.message;
					return cb(e);
				}
				cb(null, doc);
			});
		}
		async.parallel(all, function(err, config) {
			if (err) {
			    return cb(err);
			}
			var combined,
				options = data.hasOptions ? config.options : {};
			config.tests.forEach(function (testList) {
				if (!combined) {
					combined = [];
				}
				combined = combined.concat(testList);
			});
			if (combined) {
				options.tests = (options.tests || []).concat(combined);
			}
			cb(null, options);
		});
	});
}

module.exports = collectYaml;