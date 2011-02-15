var webrepl = require('./webrepl');

var foo = { 'bar': 1, 'two': 'dos', 'today': new Date() };

webrepl.start(8080).context.foo = foo;
