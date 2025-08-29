# terse-uid
Factory of unique identifiers in the form of strings of 16 alphanumerical characters, all lowercase.\
The module exports a single anonymous function without argument that returns a unique identifier each time it is called.\
See test/terse-uid-test.js for a usage example.

## Install
```
$ npm install terse-uid
```

## Usage
```js
const uid = require('terse-uid');

for (let i = 0; i < 100; i++) {
    console.log(uid());
}
```

## Test ouput example
```sh
$ npm test

> terse-uid@1.1.3 test
> node test/terse-uid-test.js

Generating 1000000 UIDs...
OK, all UIDs are distinct.
Samples:
wm3uqxn45zk9fg00
71chmuz4dql9fg00
c3x7n0z4pol9fg00
3mbgzfp4a2l9fg00
cb2cnem40wk9fg00
zvvioos4p8l9fg00
```
