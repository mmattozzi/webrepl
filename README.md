Requires: Node v0.4.0 or higher, but may work on older versions. I haven't tested this yet.

Usage:

    var webrepl = require('./webrepl');
    webrepl.start(8080).context.foo = { 'bar' : 1 };

Enjoy using a repl via your browser!
