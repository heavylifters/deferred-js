var vows = require('vows')
  , assert = require('assert')
  , deferred = require('../lib/deferred')
  , Deferred = deferred.Deferred
  , Failure = deferred.Failure

Deferred.consumeThrownExceptions = false

vows.describe('Deferred').addBatch({

    'A new Deferred': {
        topic: new Deferred(),
        'has not been called': function(d) {
            assert.ok(!d.called)
        },
        'is not running': function(d) {
            assert.ok(!d.running)
        },
        'has no callbacks': function(d) {
            assert.equal(d.callbacks.length, 0)
        },
        'has no result': function(d) {
            assert.equal(d.result, null)
        },
        'is not paused': function(d) {
            assert.equal(d.pauseCount, 0)
        },
        'can have callbacks added to it': function(d) {
            d.then(console.log)
            assert.equal(d.callbacks.length, 1)
            assert.equal(d.callbacks[0].callback, console.log)
            assert.ok(!d.callbacks[0].errback)
            
            // cheat, clear the callback chain
            d.callbacks = []
        },
        'can have errbacks added to it': function(d) {
            d.fail(console.log)
            assert.equal(d.callbacks.length, 1)
            assert.equal(d.callbacks[0].errback, console.log)
            assert.ok(!d.callbacks[0].callback)

            // cheat, clear the callback chain
            d.callbacks = []
        },
        'can have a callback added for both success and failure': function(d) {
            d.both(console.log)
            assert.equal(d.callbacks.length, 1)
            assert.equal(d.callbacks[0].callback, console.log)
            assert.equal(d.callbacks[0].errback, console.log)

            // cheat, clear the callback chain
            d.callbacks = []
        }
    },

    'A resolved Deferred': {
        topic: deferred.wrapResult(42),
        'has been called': function(d) {
            assert.ok(d.called)
        },
        'has the correct result': function(d) {
            assert.equal(d.result, 42)
        },
        'fires new callbacks immediately (synchronously)': function(d) {
            d.thenCall(assert.ok)
        },
        'cannot be resolved again': function(d) {
            assert.throws(function() {
                d.resolve()
            })
        },
        'cannot be rejected': function(d) {
            assert.throws(function() {
                d.reject()
            })
        },
        'sets its result to the value returned by its callbacks': function(d) {
            d.then(function(x) {
                return 'something else'
            }).then(function(x) {
                assert.equal(x, 'something else')
                return x
            })
        }
    },
    
    'Another resolved Deferred': {
        topic: deferred.wrapResult(42),
        'switches to the fail branch when a callback returns a Failure': function(d) {
            d.then(function(x) {
                return new Failure('broken')
            }).fail(function(e) {
                assert.equal(e.value, 'broken')
                return e
            })
        }
    },
    
    'Yet another resolved Deferred': {
        topic: deferred.wrapResult(42),
        'switches to the fail branch when a callback throws an Error': function(d) {
            Deferred.consumeThrownExceptions = true
            d.then(function() {
                throw new Error('broken')
            }).fail(function(e) {
                assert.ok(e)
                assert.instanceOf(e.value, Failure)
                assert.equal(e.value.message, 'broken')
                return e
            })
            Deferred.consumeThrownExceptions = false
        }
    },
    
    'Yet one more resolved Deferred': {
        topic: deferred.wrapFailure('broken'),
        'switches to the success branch when an errback returns a non-Failure': function(d) {
            d.fail(function() {
                return 42
            }).then(function(x) {
                assert.equal(x, 42)
                return x
            })
        }
    },

    'A rejected Deferred': {
        topic: deferred.wrapFailure('broken'),
        'has been called': function(d) {
            assert.ok(d.called)
        },
        'has the correct result': function(d) {
            assert.equal(d.result.value, 'broken')
        },
        'fires new callbacks immediately (synchronously)': function(d) {
            d.fail(function(e) {
                assert.ok(e)
                return e
            })
        },
        'cannot be rejected again': function(d) {
            assert.throws(function() {
                d.reject()
            })
        },
        'cannot be resolved': function(d) {
            assert.throws(function() {
                d.resolve()
            })
        }
    },
    
    'A Deferred resolved with a nested Deferred': {
        topic: deferred.wrapResult(deferred.wrapResult(42)),
        'waits for and assumes the result of the nested Deferred': function(d) {
            d.then(function(result) {
                assert.equal(result, 42)
                return result
            })
        }
    },
    
    'A Deferred with a nested Deferred returned in a callback': {
        topic: new Deferred(),
        'waits for and assumes the result of the nested Deferred': function(d) {
            var innerD = new Deferred()
            d.then(function() {
                return innerD
            })
            d.resolve()
            assert.ok(d.pauseCount > 0)
            innerD.resolve(42)
            d.then(function(result) {
                assert.equal(result, 42)
                return result
            })
        }
    },
    
    'When nesting, the outter Deferred': {
        topic: deferred.wrapResult().then(function() {
            return new Deferred()
        }),
        'is paused while waiting for the inner Deferred': function(d) {
            assert.equal(d.pauseCount, 1)
            assert.ok(d.called)
            assert.ok(!d.result.called)
        },
        'is unpaused when the inner Deferred is resolved': function(d) {
            d.result.resolve(42)
            assert.equal(d.pauseCount, 0)
            assert.equal(d.result, 42)
        }
    },
    
    'The result of a Deferred': {
        topic: deferred.wrapResult(42),
        'can be set without a callback using thenReturn': function(d) {
            d.thenReturn('new result').then(function(result) {
                assert.equal(result, 'new result')
                return result
            })
        },
        'can be preserved regardless of a callback\'s return value using thenCall': function(d) {
            function noop(x) { /* discard result, could have side effects */ }
            d.thenReturn(42).thenCall(noop).then(function(result) {
                assert.equal(result, 42)
            })
        }
    },
    
    'The result of a failed Deferred': {
        topic: null,
        'can be set without a callback using failReturn': function() {
            var d = deferred.wrapFailure(42)
            d.failReturn(new Failure('new result')).fail(function(failure) {
                assert.equal(failure.value, 'new result')
                return failure
            })
        },
        'can be preserved regardless of a callback\'s return value using failCall': function() {
            var d = deferred.wrapFailure(42)
            function noop(x) { /* discard result, could have side effects */ }
            d.failCall(noop).fail(function(failure) {
                assert.equal(failure.value, 42)
            })
        }
    },

    // TODO: cancel (including _suppressAlreadyCalled)
    //       nested deferred gets cancel() called
    'A Deferred with a canceller': {
        topic: null,
        'calls the canceller when cancelled': function() {
            var canceller = function() { assert.ok(true) }
              , d = new Deferred(canceller)
            d.cancel()
        },
        'fires the errback chain if cancelled before being called': function() {
            var d = new Deferred()
            d.fail(function(e) {
                assert.ok(true)
                assert.equal(e.value, 'cancelled')
            })
            d.cancel()
        }
    },
    
    'A Deferred without a canceller': {
        topic: null,
        'supresses "already called" error once if resolved after cancellation': function() {
            var d = new Deferred()
            d.cancel()
            assert.doesNotThrow(function() {
                d.resolve()
            })
            assert.throws(function() {
                d.resolve()
            })
        },
        'supresses "already called" error once if rejected after cancellation': function() {
            var d = new Deferred()
            d.cancel()
            assert.doesNotThrow(function() {
                d.reject()
            })
            assert.throws(function() {
                d.reject()
            })
        }
    },
    
    'A called Deferred': {
        topic: null,
        'cancels a nested Deferred when cancelled': function() {
            var canceller = function(d) {
                    assert.ok(true)
                    assert.equal(d, nestedD)
                }
              , nestedD = new Deferred(canceller)
              , outerD = deferred.wrapResult(nestedD)
            outerD.cancel()
        }
    }

}).export(module)