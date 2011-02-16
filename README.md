About
=================
If you're familiar with [node.js](http://nodejs.org) then you're familiar with the provided REPL. You can embed a REPL in your programs and make it available via tcp or unix sockets so that you can connect to a long running node.js program and play around with it on a command line. Webrepl takes the same idea but makes the repl available via an interactive web page so that you can have all the fun of using a repl right in your web browser. Tab completion is included! Webrepl also makes the properties in your context accessible via restful http calls. 

[See a Screenshot](https://github.com/mmattozzi/webrepl/raw/master/doc/webrepl.png)

Requires: Node v0.4.0 or higher, but may work on older versions. I haven't tested this yet.

Installation
=================

    npm install webrepl
    
Or just dump all the files into your project's directory.

Usage
=================

    var webrepl = require('./webrepl');
    webrepl.start(8080);

Then point your browser to http://localhost:8080 and have fun!

You can provide context variables just like the regular repl:
    
    var webrepl = require('./webrepl');
    var foo = { 'bar': 1, 'day': new Date() };
    webrepl.start(8080).context.foo = foo;
    
You can also access context variables via HTTP, for example: 

    ~ mmattozzi$ curl -i "http://localhost:8080/context/foo"
    HTTP/1.1 200 OK
    Content-Type: application/json
    Connection: keep-alive
    Transfer-Encoding: chunked

    {"bar":1,"two":"dos","today":"2011-02-15T05:33:57.672Z"}
    
    ~ mmattozzi$ curl -i "http://localhost:8080/context/process.pid"
    HTTP/1.1 200 OK
    Content-Type: application/json
    Connection: keep-alive
    Transfer-Encoding: chunked

    33814
