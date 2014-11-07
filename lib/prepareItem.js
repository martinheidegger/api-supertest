"use strict";

var lodash = require("lodash"),
	statePassthrough = require("./statePassthrough");

function getData(item, method) {
	var data;
	if (method === "POST") {
		data = item.post;
		delete item.post;
	} else if (method === "PUT") {
		data = item.put;
		delete item.put;
	} else if (method === "PATCH") {
		data = item.patch;
		delete item.patch;
	} else if (method === "HEAD") {
		data = item.head;
		delete item.head;
	}
	return data || item.data;
}

function getMethod(item) {
	if (item.post) {
		return "POST";
	}
	if (item.put) {
		return "PUT";
	}
	if (item.patch) {
		return "PATCH";
	}
	if (item.head) {
		return "HEAD";
	}
	if (item.get) {
		return "GET";
	}
	return item.method ? item.method.toString().toUpperCase() : "GET"; 
}

function getPath(item) {
	var path = item.path;
	if (!path) {
		path = "";
	}
	if (item.get) {
		var queryIndex = path.indexOf("?");
		if (queryIndex !== -1) {
			path = path.substr(0, queryIndex);
		}
		path += "?" + item.get;
	}
	delete item.get;
	return path;
}

function prepareItem(item, defaults) {
	item = lodash.defaults(item, defaults);
	item.method = getMethod(item);
	item.data = getData(item, item.method);
	item.path = getPath(item);
	item.before = item.before || statePassthrough;
	item.after  = item.after  || statePassthrough;
	return item;
}

module.exports = prepareItem;