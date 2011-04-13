var vows = require('vows')
  , assert = require('assert')
  , deferred = require('../lib/deferred')
  , Deferred = deferred.Deferred
  , Failure = deferred.Failure
  , DeferredList = deferred.DeferredList
  , N = 5

vows.describe('DeferredList').addBatch({

    'A resolved list of Deferreds': {
        topic: function() {
            var n = N
              , ds = []
            while (n--) {
                ds.push(deferred.wrapResult(n))
            }
            return deferred.all(ds)
        },
        'is resolved when all its children are resolved': function(d) {
            d.then(function(results) {
                assert.ok(true)
                return results
            })
        },
        'has the same number of results as children': function(d) {
            d.then(function(results) {
                assert.equal(results.length, N)
                return results
            })
        },
        'has its results in the correct order': function(d) {
            d.then(function(results) {
                var n = N
                results.forEach(function(r) {
                    assert.equal(--n, r)
                })
                return results
            })
        }
    },
    
    'An empty DeferredList': {
        topic: null,
        'resolves immediately if fireOnFirstResult is false': function() {
            var dl = new DeferredList([])
            dl.then(function(results) {
                assert.ok(true)
                assert.equal(results.length, 0)
            })
        },
        'never resolves if fireOnFirstResult is true': function() {
            var dl = new DeferredList([], {fireOnFirstResult: true})
            dl.both(function() {
                assert.ok(false)
            })
        }
    },
    
    'A DeferredList that fires after one result': {
        topic: null,
        'is resolved after any of its Deferreds is resolved': function() {
            var d = new Deferred()
              , ds = [d, new Deferred()]
              , dl = new DeferredList(ds, {fireOnFirstResult: true})
            d.resolve(42)
            dl.then(function(answer) {
                assert.ok(true)
                assert.equal(answer, 42)
            })
        },
        'ignores results after the first result': function() {
            var d = new Deferred()
              , ds = [d, deferred.wrapResult(42)]
              , dl = new DeferredList(ds, {fireOnFirstResult: true})
            dl.then(function(answer) {
                assert.ok(true)
                assert.equal(answer, 42)
            })
            assert.doesNotThrow(function() {
                d.resolve(-42)
            })
        },
        'does not fire after an error': function() {
            var ds = [deferred.wrapFailure('broken'), new Deferred()]
              , dl = deferred.all(ds, {fireOnFirstResult: true})
            dl.then(function() {
                assert.ok(false)
            })
            assert.ok(true)
        }
    },
    
    'A DeferredList that fires after one error': {
        topic: null,
        'is rejected after any of its Deferreds is rejected': function() {
            var d = new Deferred()
              , ds = [d, new Deferred()]
              , dl = new DeferredList(ds, {fireOnFirstError: true})
            d.reject('broken')
            dl.fail(function(f) {
                assert.ok(true)
                assert.equal(f.value, 'broken')
            })
        },
        'ignores results after the first error': function() {
            var d = new Deferred()
              , ds = [d, deferred.wrapFailure('broken')]
              , dl = new DeferredList(ds, {fireOnFirstError: true})
            dl.fail(function(f) {
                assert.ok(true)
                assert.equal(f.value, 'broken')
            })
            assert.doesNotThrow(function() {
                d.reject('broken again')
            })
        },
        'does not fire after a result': function() {
            var ds = [deferred.wrapResult(42), new Deferred()]
              , dl = deferred.all(ds, {fireOnFirstError: true})
            dl.then(function() {
                assert.ok(false)
            })
            assert.ok(true)
        }
    },

    'A DeferredList that consumes errors': {
        topic: null,
        'always leaves its Deferreds executing the callback chain': function() {
            var d = deferred.wrapFailure('broken')
              , ds = [d, deferred.wrapResult(42)]
              , dl = new DeferredList(ds, {consumeErrors: true})
            dl.then(function() {
                assert.ok(true)
            })
            d.then(function(result) {
                assert.ok(true)
            })
        },
        'returns null instead of any Failures encountered': function() {
            var ds = [deferred.wrapFailure('broken'), deferred.wrapResult(42)]
              , dl = new DeferredList(ds, {consumeErrors: true})
            dl.then(function(results) {
                assert.equal(results[0], null)
                assert.equal(results[1], 42)
            })
        }
    },
    
    'A DeferredList with cancelDeferredsWhenCancelled set': {
        topic: null,
        'cancels its Deferreds when cancelled': function() {
            var canceller = function() {
                    assert.ok(true)
                }
              , d = new Deferred(canceller)
              , dl = new DeferredList([d], {cancelDeferredsWhenCancelled: true})
            d.fail(function(f) {
                assert.ok(true)
                assert.equal(f.value, 'cancelled')
            })
            dl.cancel()
        }
    }
    
}).export(module)
