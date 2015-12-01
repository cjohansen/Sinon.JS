var buster = require("buster");
var walk = require("../lib/sinon/util/core/walk");
var createInstance = require("../lib/sinon/util/core/create");
var spy = require("../lib/sinon/spy");
var assert = buster.assert;

buster.testCase("sinon.walk", {
    "should call iterator with value, key, and obj, with context as the receiver": function () {
        var target = Object.create(null);
        var rcvr = {};
        var iterator = spy();

        target.hello = "world";
        target.foo = 15;

        walk(target, iterator, rcvr);

        assert(iterator.calledTwice);
        assert(iterator.alwaysCalledOn(rcvr));
        assert(iterator.calledWithExactly("world", "hello", target));
        assert(iterator.calledWithExactly(15, "foo", target));
    },

    "should work with non-enumerable properties": function () {
        var target = Object.create(null);
        var iterator = spy();

        target.hello = "world";
        Object.defineProperty(target, "foo", {
            value: 15
        });

        walk(target, iterator);

        assert(iterator.calledTwice);
        assert(iterator.calledWith("world", "hello"));
        assert(iterator.calledWith(15, "foo"));
    },

    "should walk the prototype chain of an object": function () {
        var parentProto, proto, target, iterator;

        parentProto = Object.create(null, {
            nonEnumerableParentProp: {
                value: "non-enumerable parent prop"
            },
            enumerableParentProp: {
                value: "enumerable parent prop",
                enumerable: true
            }
        });

        proto = Object.create(parentProto, {
            nonEnumerableProp: {
                value: "non-enumerable prop"
            },
            enumerableProp: {
                value: "enumerable prop",
                enumerable: true
            }
        });

        target = Object.create(proto, {
            nonEnumerableOwnProp: {
                value: "non-enumerable own prop"
            },
            enumerableOwnProp: {
                value: "enumerable own prop",
                enumerable: true
            }
        });

        iterator = spy();

        walk(target, iterator);

        assert.equals(iterator.callCount, 6);
        assert(iterator.calledWith("non-enumerable own prop", "nonEnumerableOwnProp", target));
        assert(iterator.calledWith("enumerable own prop", "enumerableOwnProp", target));
        assert(iterator.calledWith("non-enumerable prop", "nonEnumerableProp", proto));
        assert(iterator.calledWith("enumerable prop", "enumerableProp", proto));
        assert(iterator.calledWith("non-enumerable parent prop", "nonEnumerableParentProp", parentProto));
        assert(iterator.calledWith("enumerable parent prop", "enumerableParentProp", parentProto));
    },

    "should always invoke getters on the original receiving object": function () {
        var Target = function Target() {
            this.o = { foo: "foo" };
        };
        Object.defineProperty(Target.prototype, "computedFoo", {
            enumerable: true,
            get: function () {
                return "computed " + this.o.foo;
            }
        });
        var target = new Target();
        var iterator = spy();

        walk(target, iterator);

        assert(iterator.calledWith("computed foo", "computedFoo", target));
    },

    "should fall back to for..in if getOwnPropertyNames is not available": function () {
        var getOwnPropertyNames = Object.getOwnPropertyNames;
        var Target = function Target() {
            this.hello = "world";
        };
        var target = new Target();
        var rcvr = {};
        var iterator = spy();
        var err = null;
        var numCalls = 0;
        var placeholder; // eslint-disable-line no-unused-vars

        Target.prototype.foo = 15;
        Object.getOwnPropertyNames = null;

        // Different environments may be inconsistent in how they handle for..in, therefore we
        // use it to track the number of expected calls, rather than setting it to a hard
        // number.
        /* eslint-disable guard-for-in */
        for (placeholder in target) {
            numCalls++;
        }
        /* eslint-enable guard-for-in */

        try {
            walk(target, iterator, rcvr);
            assert.equals(iterator.callCount, numCalls);
            assert(iterator.alwaysCalledOn(rcvr));
            assert(iterator.calledWith("world", "hello"));
            assert(iterator.calledWith(15, "foo"));
        } catch (e) {
            err = e;
        } finally {
            Object.getOwnPropertyNames = getOwnPropertyNames;
        }

        assert.isNull(err, "sinon.walk tests failed with message '" + (err && err.message) + "'");
    },

    "does not walk the same property twice": function () {
        var parent = {
            func: function () {}
        };
        var child = createInstance(parent);
        child.func = function () {};
        var iterator = spy();

        walk(child, iterator);

        assert.equals(iterator.callCount, 1);
    }
});
