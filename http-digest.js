"use strict";
var http = require('http');
var crypto = require('crypto');

/* constants */
var nonce_expire_timeout = 3600000;            /* server nonce expiration timeout (milliseconds) */
var authentication_realm = "node-http-digest"; /* http authentication realm */

/* state information */
var nonces = {};

/* nonce expiration function, to be called with setTimeout */
function expire_nonce(nonce) {
	delete nonces[nonce];
}

/* md5 hash function */
function md5(str) {
	var hash = crypto.createHash("MD5");
	hash.update(str);
	return hash.digest("hex");
}

/* parse the Authorization header, return a dictionary or false if an invalid header is given */
function parse_header_string(header) {
	var authtype = header.match(/^(\w+)\s+/);
	if (authtype === null) {
		return false;
	}
	if (authtype[1].toLowerCase() != "digest") {
		// We currently don't support any other auth methods.
		return false;
	}
	header = header.slice(authtype[1].length);

	var dict = {};
	var first = true;
	while (header.length > 0) {
		// eat whitespace and comma
		if (first) {
			first = false;
		} else {
			if (header[0] != ",") {
				return false;
			}
			header = header.slice(1);
		}
		header = header.trimLeft();

		// parse key
		var key = header.match(/^\w+/);
		if (key === null) {
			return false;
		}
		key = key[0];
		header = header.slice(key.length);

		// parse equals
		var eq = header.match(/^\s*=\s*/);
		if (eq === null) {
			return false;
		}
		header = header.slice(eq[0].length);

		// parse value
		var value;
		if (header[0] == "\"") {
			// quoted string
			value = header.match(/^"([^"\\\r\n]*(?:\\.[^"\\\r\n]*)*)"/);
			if (value === null) {
				return false;
			}
			header = header.slice(value[0].length);
			value = value[1];
		} else {
			// unquoted string
			value = header.match(/^[^\s,]+/);
			if (value === null) {
				return false;
			}
			header = header.slice(value[0].length);
			value = value[0];
		}
		dict[key] = value;

		// eat whitespace
		header = header.trimLeft();
	}
	return dict;
}

function authenticate(request, header, username, password) {
	var authinfo = parse_header_string(header);
	if (authinfo === false) {
		// TODO: handle bad requests
		return false;
	}

	// check for expiration
	if (!(authinfo.nonce in nonces)) {
		return false;
	}

	// calculate a1
	var a1;
	if (authinfo.algorithm == "MD5-sess") {
		// TODO: implement MD5-sess
		return false;
	} else {
		if (authinfo.username != username) {
			// TODO: We currently only support a single username/password tuple
			return false;
		}
		a1 = authinfo.username+":"+authentication_realm+":"+password;
	}

	// calculate a2
	var a2;
	if (authinfo.qop == "auth-int") {
		// TODO: implement auth-int
		return false;
	} else {
		a2 = request.method+":"+authinfo.uri;
	}

	// calculate request digest
	var digest;
	if (!("qop" in authinfo)) {
		// For RFC 2069 compatibility
		digest = md5(md5(a1)+":"+authinfo.nonce+":"+md5(a2));
	} else {
		if (authinfo.nc <= nonces[authinfo.nonce].count) {
			return false;
		}
		nonces[authinfo.nonce].count = authinfo.nc;
		digest = md5(md5(a1)+":"+authinfo.nonce+":"+authinfo.nc+":"+authinfo.cnonce+":"+authinfo.qop+":"+md5(a2));
	}

	if (digest == authinfo.response) {
		return true;
	} else {
		return false;
	}
}

/**
 * The http_digest_auth function authenticates the current http request and
 * executes the callback if the user is authenticated successfully. Otherwise
 * a 401 Unauthorized page is presented.
 * The callback is of type function(request, response).
 */
var http_digest_auth = exports.http_digest_auth = function(request, response, username, password, callback) {
	var authenticated = false;
	if ("authorization" in request.headers) {
		var header = request.headers.authorization;
		authenticated = authenticate(request, header, username, password);
	}
	if (authenticated) {
		callback(request, response);
	} else {
		// generate nonce
		var nonce = md5(new Date().getTime()+"privstring");

		nonces[nonce] = {
			count: 0,
		};
		setTimeout(expire_nonce,nonce_expire_timeout,nonce);

		// generate opaque (TODO: move outside)
		var opaque = md5("hostname or something");

		// create header
		var header = "Digest realm=\""+authentication_realm+"\", qop=\"auth\", nonce=\""+nonce+"\", opaque=\""+opaque+"\"";
		response.writeHead(401, {"WWW-Authenticate": header});
		response.end("<!DOCTYPE html>\n<html><head><title>401 Unauthorized</title></head><body><h1>401 Unauthorized</h1><p>This page requires authorization.</p></body></html>");
	}
}

/**
 * The createServer method creates a web server using HTTP Digest
 * authentication. Usage of this function is similar to the http.createServer
 * function of the node.js standard library, but with additional parameters for
 * the username and password.
 * The callback is of type function(request, response).
 */
exports.createServer = function(username, password, callback) {
	this.server = http.createServer(function(request, response) {
		http_digest_auth(request, response, username, password, callback);
	});
	return this.server;
};
