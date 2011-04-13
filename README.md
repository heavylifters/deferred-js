HeavyLifters Deferred Library
=============================

Asynchronous programming is the norm in JavaScript, where callbacks are commonly used to manage async processes. Unfortunately, no consistently-followed convention for organizing flow control with callbacks has emerged. With the rise of [Node.js](http://nodejs.org/) and client-side web app frameworks, programmers with little experience with asynchronous programming are struggling to understand and organize their code.

Why should I use this?
----------------------

We've [seen](http://metaduck.com/post/2675027550/asynchronous-iteration-patterns-in-node-js) [many](http://stackoverflow.com/questions/5308514/prescriptive-nodejs) [developers](http://zef.me/3715/three-routes-to-spaghetti-free-javascript) complain about the difficulty of organizing asynchronous code: for example: calling a function when N async processes finish their work.

This is not a new problem, and solutions have existed for years. Our favourite is Twisted's `Deferred` class; our library brings it to JavaScript. HeavyLifters provides and uses implementations in Objective-C, Objective-J, JavaScript, and Java.

The biggest benefit you get by using [`Deferred`][D] objects in JavaScript is a consistent pattern for organizing callbacks and easily obtaining future values.

[`Deferred`][D] objects also make it easy to have async processes dependent on each other, including waiting for a list of async processes to finish, with optional notifications for the first completion or the first error. This simplifies flow control and makes your code much easier to reason about.

Requirements
------------

This library is designed to work in modern browsers and with Node.js, and should run in just about any ES3+ environment but no promises.

If it doesn't work in your preferred JavaScript environment, [submit a bug report](https://github.com/heavylifters/deferred-js/issues)!

Running Unit Tests
------------------

Install [Node.js](http://nodejs.org/) and [npm](http://github.com/isaacs/npm#readme), then:

    npm install vows
    cd deferred-js
    make test
    # for more detail, make spec

How it works
------------

You can create a [`Deferred`][D] object directly, but you typically request one from a **data source**. A data source is a function that returns a [`Deferred`][D] object.

The [`Deferred`][D] object provides access to the data source's data by allowing you to attach **callbacks** and/or **errbacks** to its **callback chain**.

When the data source has the result, it calls the `resolve(result)` method on the [`Deferred`][D] object, or `reject(failure)` (in the case of failure). This causes the [`Deferred`][D] object's callback chain to be **fired** - meaning each link in the chain (a callback or errback) is called in turn. The result is the input to the first callback, and its output is the input to the next callback (and so on).

If a callback (or errback) returns a [`Failure`][F] object, the next errback is called; otherwise the next callback is called.

![Deferred-process](https://github.com/heavylifters/HLDeferred-objc/raw/master/Documentation/images/twisted/deferred-process.png)

The Most Basic Example
----------------------

    function demonstration() {
        var d = new Deferred()
        console.log('created Deferred object')
        
        d.then(function(result) {
            console.log('Hello ' + result)
            return result
        })
        console.log('added a callback to the Deferred's callback chain')
        
        // resolve the Deferred, which fires the callback chain
        d.resolve('World')
        console.log('You should see Hello, World above this line in the console')
        
        // Note: use d.reject('DISASTER!') to indicate failure
    }

Adding callbacks and errbacks
-----------------------------

Each **link** in a callback chain is a pair of functions, representing a **callback** and an **errback**. Firing the chain executes the callback **OR** errback of **each link, in sequence**. For each link, its callback is executed if its input is a result; the errback is executed if its input is a failure (failures are represented by [`Failure`][F] objects).

### Adding (just) a callback ###

To append a link with a callback to an [`Deferred`][D] object, call the `then(cb)` method, passing in a callback function. Example:

    d.then(function(result) {
        // do something useful with the result
        return result
    })

[`Deferred`][D] adds a link to its chain with your callback and a "passthrough" errback. The passthrough errback simply returns its exception parameter.

### Adding (just) an errback ###

To append a link with an errback to an [`Deferred`][D] object, call the `fail(eb)` method, passing in an errback function.  Example:

    d.fail(function(failure) {
        // optionally do something useful with failure.value()
        return failure
    });

[`Deferred`][D] adds a link to its chain with your errback and a "passthrough" callback. The passthrough callback simply returns its result parameter.

### Adding a callback and an errback ###

To add a link with a callback *and* errback  to an [`Deferred`][D] object, call the `-then(cb, eb)` method or the `both(cb)` method.

Use `then(cb, eb)` when you want different behaviour in the case of success or failure:

    d.then(function(result) {
        // do something useful with the result
        return result
    }, function(failure) {
        // optionally do something useful with failure.value()
        return failure
    })

Use `both(cb)` when you intend to do the same thing in either case:

    d.both(function(result) {
        // in the case of failure, result is a Failure
        // do something in either case
        return result
    })

Deferred in practice
----------------------

By convention, names of methods returning an [`Deferred`][D] object are prefixed with "request", such as:

    // result is a MyThing object
    function requestDistantInformation()

We recommend you should document that information somewhere. This convention helps indicate that your function is asynchronous and returns a Deferred object.

A function that fetches something asynchronously can return a [`Deferred`][D] instead of accepting callback parameters. We call these functions **data sources**. When a data source has the requested value it `resolve`s the [`Deferred`][D] object, which fires the callback chain. If it encounters an error it will `reject` the deferred, which fires the errback chain.

Here's an example of reading a file using Node.js:

    // Reading a file in Node
    fs.readFile('/etc/passwd', function(err, data) {
        if (err) throw err
        console.log(data)
    })

Here's how you might wrap Node.js's readFile API to use the [`Deferred`][D] pattern:

    dfs.requestReadFile = function(name) {
        var d = new Deferred()
        fs.readFile(name, function(err, data) {
            if (err) d.reject(err)
            else d.resolve(data)
        })
        return d
    }
    
Now you can read a file and give the [`Deferred`][D] object out to any party interested in the contents:

    // Reading a file with Deferred (assuming we have a Deferred filesystem module)
    var contentsDeferred = dfs.requestReadFile('/etc/passwd')
    
    // anything interested in the contents of that file
    // can attach callbacks to contentsDeferred
    
    contentsDeferred.then(function(data) { console.log(data) })

This is not a flattering example. In the simplest of cases `Deferred` is more verbose, but it more complex scenarios it's easier to reason about what's going on.

Waiting on many asynchronous data sources
-----------------------------------------

You can wait for all the values in a list of [`Deferred`][D] objects, or start a bunch of `Deferred` operations and run the callback chain when the first one has succeeded or failed.

    // Note: dfs.requestReadFile is defined above
    
    var dPasswd = dfs.requestReadFile('/etc/passwd')
      , dShadow = dfs.requestReadFile('/etc/shadow')
      , dGroup = dfs.requestReadFile('/etc/group')
    
    // convert ['a', 'b', 'c'] to 'abc'
    function join(things) {
        return things.reduce(function(m, t) { return m + t })
    }
    
    // after all values are received, deferred.all runs the callback chain
    deferred.all([dPasswd, dShadow, dGroup]).then(join).thenCall(console.log)
    
    // or, after the first value is received, deferred.all runs the callback chain
    deferred.all([dPasswd, dShadow, dGroup], {fireOnFirstResult: true}).thenCall(console.log)
    
    // or, if any error occurs, deferred.all runs the errback chain
    var dAll = deferred.all([dPasswd, dShadow, dGroup], {fireOnFirstError: true})
    
    // callbacks and errbacks are supposed to return a value
    // the value is the input to the next link in the chain
    // thenCall and failCall are conveniences that call the
    // supplied function with the input and then return the input
    // this way you don't have to wrap functions that don't return
    // a value
    dAll.failCall(console.error)
    dAll.then(join).thenCall(console.log)

Composing Deferred objects arbitrarily
--------------------------------------

The return value of a callback is passed to the next callback. When a callback returns a [`Deferred`][D] object, the original `Deferred` will transparently wait for the other to receive its value and then run its own callback chain using that value. We call this nesting.

    var d = dfs.readFile('/etc/passwd').then(function(passwdData) {
        return dfs.readFile('/etc/group').then(function(groupData) {
            return passwdData + groupData
        })
    }).then(function(data) {
        console.log(data)
        return data
    })

Now you can do something with `d`, return it, pass it to another function, etc. Subsequent callbacks registered on `d` will receive the value returned from the innermost callback: `passwdData + groupData`.

`Deferred` shines when you have higher level constructs built on top of it, such as work queues and data sources for databases and filesystem access. We have more stuff coming out for Node.js soon!

Links
-----
- [Docs](https://github.com/heavylifters/deferred-js/wiki) (forthcoming)
- [Issue Tracker](https://github.com/heavylifters/deferred-js/issues) (please report bugs and feature requests!)

How to contribute
-----------------
- Fork [deferred-js on GitHub](https://github.com/heavylifters/deferred-js), send a pull request

Contributors
------------
- [samsonjs](https://github.com/samsonjs) of [HeavyLifters](https://github.com/heavylifters)
- [JimRoepcke](https://github.com/JimRoepcke) of [HeavyLifters](https://github.com/heavylifters)

Alternatives
------------

- [node-promise](https://github.com/kriszyp/node-promise) by [Kris Zyp](https://twitter.com/kriszyp)
- [q](https://github.com/kriskowal/q) by [Kris Kowal](https://twitter.com/kriskowal)
- [jQuery Deferred Object](http://api.jquery.com/category/deferred-object/)
- There are many more (forthcoming)
- Write your own! Control flow libraries are the new web frameworks

Credits
-------
- Based on [Twisted's Deferred](http://twistedmatrix.com/trac/browser/tags/releases/twisted-10.2.0/twisted/internet/defer.py) classes
- Sponsored by [HeavyLifters Network Ltd.](http://heavylifters.com/)

License
-------

Copyright 2011 [HeavyLifters Network Ltd.](http://heavylifters.com/) Licensed under the terms of the MIT license. See included [LICENSE](https://github.com/heavylifters/deferred-js/raw/master/LICENSE) file.

[D]: https://github.com/heavylifters/deferred-js/wiki/Deferred
[F]: https://github.com/heavylifters/deferred-js/wiki/Failure
