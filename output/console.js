"use strict";

var colors = require("colors/safe");

function indent(text, indent) {
	return indent + text.split("\n").join("\n" + indent);
}

function renderPrefix(item) {
	var result = colors.bold(item.path);
	if (item.data) {
		result += colors.gray(" (" + item.method + " " + item.data + ")");
	} else if (item.method !== "GET") {
		result += colors.gray(" (" + item.method + ")")
	}
	return result + ": ";
}

module.exports = {
	start: function start(base) {
		console.log("Running tests on " + colors.gray(base) + "\n");
	},
	end: function end(passed, total, cb) {
		process.nextTick(function () {
		    cb();
		});
		var isSuccess = passed === total;
		console.log("\nTests " + (isSuccess ? "successful" : "failed" ) + ". (" + passed + "/" + total + ")");
	},
	endpointStart: function endpointStart(item) {
		process.stdout.write(renderPrefix(item) + colors.gray("processing..."));
	},
	endpointEnd: function endpointEnd(state) {
		var item = state.item,
			error = state.error;
		process.stdout.clearLine && process.stdout.clearLine();
		process.stdout.cursorTo && process.stdout.cursorTo(0);
		process.stdout.write(renderPrefix(item));
		if (error) {
			console.log(colors.red("ERROR"));
			if (error.stack) {
				error = error.stack.replace(/^(\s+at\s+.*)$/mig, function (match) {
					return colors.dim.gray(match);
				});
			}
			console.log("\n" + indent(error, "    ") + "\n");	
		} else {
			console.log(colors.green("OK"));
		}
	}
};