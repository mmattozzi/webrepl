var SimpleStream = require('./SimpleStream');
var repl = require('repl');
var http = require('http');
var fs = require('fs');
var util = require('util');

var ReplHttpServer = function ReplHttpServer(prompt, stream, replServer) {
    this.running = false;
    this.prompt = prompt;
    this.stream = stream;
    this.replServer = replServer;
    this.webdir = __dirname;
};

ReplHttpServer.prototype.start = function(port, hostname, stream, replServer) {
    var self = this;
    self.server = http.createServer(function(req, res) { self.route(req, res); });
    self.server.listen(port, hostname);
    return self;
};

ReplHttpServer.prototype.route = function(req, res) {
    var stream = this.stream;
    
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
    } else if ((match = req.url.match(/^\/context\/(.*)/))) {
        var obj = eval('this.replServer.context.' + match[1]);
        if (obj) {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(obj));
        } else {
            res.writeHeader(404);
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
 * @param {String} hostname Bind address of web console (optional)
 * @return Return the REPLServer. Context can be set on this variable.
 */
var start = function(port, hostname) {
    var stream = new SimpleStream();
    var prompt = 'node> ';
    var rs = new repl.REPLServer(prompt, stream);
    var replHttpServer = new ReplHttpServer(prompt, stream, rs);
    replHttpServer.start(port, hostname);
    return rs;
};

var exports = { 'start' : start };

module.exports = exports;
