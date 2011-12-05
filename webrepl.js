// Copyright (c) 2011 Michael Mattozzi
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var SimpleStream = require('./SimpleStream');
var repl = require('repl');
var http = require('http');
var fs = require('fs');
var util = require('util');

var ReplHttpServer = function ReplHttpServer(prompt, stream, replServer, options) {
    this.running = false;
    this.prompt = prompt;
    this.stream = stream;
    this.replServer = replServer;
    this.webdir = __dirname;
    if (options !== undefined) {
        if (options.username !== undefined) {
            this.username = options.username;
        }
        if (options.username !== undefined) {
            this.password = options.password;
        }
        if (options.hostname !== undefined) {
            this.hostname = options.hostname;
        }
    }
};

ReplHttpServer.prototype.start = function(port) {
    var self = this;
    if (this.username !== undefined && this.password !== undefined) {
        // Set up server that requires http digest authentication
        var httpdigest = require('./http-digest');
        self.server = httpdigest.createServer(this.username, this.password, 
            function(req, res) { self.route(req, res); });
        self.server.listen(port, this.hostname);
    } else {
        // No auth required
        self.server = http.createServer(function(req, res) { self.route(req, res); });
        self.server.on('error', function() { /* Ignore Errors */ });
        self.server.listen(port, this.hostname);
    }
    return self;
};

ReplHttpServer.prototype.route = function(req, res) {
    var stream = this.stream;

    req.on('error', function() { /* Ignore Errors */ });
    res.on('error', function() { /* Ignore Errors */ });

    var match = null;
    if (req.url.match(/^\/repl/)) {
        if (req.method === 'GET') {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            var resBody = '';
            while (stream.messages.length > 0) {
                var msg = stream.messages.shift();
                if (! msg.match("^" + this.prompt)) {
                    resBody += msg;
                }
            }
            res.end(resBody);
        } else if (req.method === 'POST') {
            var allData = "";
            req.on('data', function(data) {
                allData += data;
            });
            req.on('end', function() {
                if (stream.emit('data', allData)) {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end();
                } else {
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end();
                }
            });
        }
    } else if ((match = req.url.match(/^\/context\/([a-zA-Z_$][0-9a-zA-Z_$\.]*)$/))) {
        try {
            var obj = eval('this.replServer.context.' + match[1]);
            if (obj) {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(obj));
            } else {
                res.writeHeader(404);
                res.end();
            }
        } catch (err) {
            console.log("Error resolving context request: " + err.toString());
            res.writeHeader(500);
            res.end();
        }
    } else if ((match = req.url.match(/^\/complete\/(.*)/))) {
        if (match[1].length > 0) {
            // This is written to accomodate both versions of the complete method 
            // in node.js. Older versions of node (0.4) return the completions from
            // the function. Newer versions (0.6+) take a callback to handle the
            // completions.
            var completionsOld = this.replServer.complete(match[1], function(o, completions) {
                var cObj = { "completions": completions[0] };
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(cObj));
            });
            if (completionsOld !== undefined) {
                var cObj = { "completions": completionsOld[0] };
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(cObj));
            }
        } else {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end();
        }
    } else if (req.url.match(/^\/info/)) {
        var name = (process.argv.length > 1 ? process.argv[1] : process.argv[0]);
        var info = { 'pid': process.pid, 'name': name };
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(info));
    } else if (req.url.match(/^\/clear/) && req.method === 'POST') {
        var rli = this.replServer.rli;
        if (this.replServer.bufferedCommand && this.replServer.bufferedCommand.length > 0) {
          rli.write('\n');
          this.replServer.bufferedCommand = '';
          this.replServer.displayPrompt();
        }
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end();
    } else { 
        match = req.url.match(/\/(.*)/);
        if (match) {
            var file = match[1];
            if (file === '') { file = 'index.html'; }
            file = this.webdir + '/' + file;
            this.serveFile(file, res);
        }
    }
};

ReplHttpServer.prototype.serveFile = function(file, response) {
    function contentType(file) {
        if (file.match(/.js$/)) {
            return "application/x-javascript";
        } else if (file.match(/.html$/)) {
            return "text/html";
        } else if (file.match(/.css$/)) {
            return "text/css";
        }
        return "text/plain";
    }
    
    fs.stat(file, function(err, stat) {
        if (err) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("Cannot find file: " + file);
            response.end();
            return;
        }

        fs.readFile(file, "binary", function (err, data) {
            if (err) {
                response.writeHead(500, {"Content-Type": contentType(file) });
                response.write("Error opening file " + file + ": " + err);
            } else {
                response.writeHead(200, { 'Content-Type': contentType(file), 'Content-Length': data.length });
                response.write(data, "binary");
            }
            response.end();
        });
    });
};

/**
 * Starts a repl served via a web console.
 * @param {Integer} port Port to serve web console
 * @param {Object} options Set username, password, and hostname options
 * @return Return the REPLServer. Context can be set on this variable.
 */
var start = function(port, options) {
    var stream = new SimpleStream();
    var prompt = 'node> ';
    var rs = new repl.REPLServer(prompt, stream);
    var replHttpServer = new ReplHttpServer(prompt, stream, rs, options);
    replHttpServer.start(port);
    return rs;
};

var exports = { 'start' : start };

module.exports = exports;
