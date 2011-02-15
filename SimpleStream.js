var util = require('util');
var events = require('events');

function SimpleStream() {
    this.messages = [];
    events.EventEmitter.call(this);
}

util.inherits(SimpleStream, events.EventEmitter);

SimpleStream.prototype.readable = true;

SimpleStream.prototype.setEncoding = function(encoding) {
    console.log("unexpected set encoding");
};

SimpleStream.prototype.pause = function() {
    console.log("unexpected pause");
};

SimpleStream.prototype.resume = function() {
};

SimpleStream.prototype.destroy = function() {
    console.log("unexpected destroy");
};

SimpleStream.prototype.destroySoon = function() {
    console.log("unexpected destroySoon");
};

SimpleStream.prototype.destroy = function(destination) {
    console.log("unexpected pipe");
};

SimpleStream.prototype.writable = true;

SimpleStream.prototype.write = function(string, encoding) {
    console.log("unexpected write string");
};

SimpleStream.prototype.write = function(data) {
    this.messages.push(data);
};

SimpleStream.prototype.end = function() {
    console.log("unexpected end");
};

SimpleStream.prototype.end = function(string, encoding) {
    console.log("unexpected end string");
};

SimpleStream.prototype.end = function(buffer) {
    console.log("unexpected end buffer");
};

module.exports = SimpleStream;
