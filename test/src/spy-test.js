import referee from "@sinonjs/referee";
import samsam from "@sinonjs/samsam";
import createSpy from "../../src/sinon/spy.js";
import createProxy from "../../src/sinon/proxy.js";
import sharedSpyStubEverythingTests from "./shared-spy-stub-everything-tests.js";

const globalContext = typeof global !== "undefined" ? global : window;
const assert = referee.assert;
const refute = referee.refute;
const match = samsam.createMatcher;

function spyCalledTests(method) {
    return function () {
        // eslint-disable-next-line mocha/no-top-level-hooks
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("returns false if spy was not called", function () {
            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns true if spy was called with args", function () {
            this.spy(1, 2, 3);

            assert(this.spy[method](1, 2, 3));
        });

        it("returns true if called with args at least once", function () {
            this.spy(1, 3, 3);
            this.spy(1, 2, 3);
            this.spy(3, 2, 3);

            assert(this.spy[method](1, 2, 3));
        });

        it("returns false if not called with args", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns false if not called with undefined", function () {
            this.spy();

            assert.isFalse(this.spy[method](undefined));
        });

        it("returns true for partial match", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert(this.spy[method](1, 3));
        });

        it("matchs all arguments individually, not as array", function () {
            this.spy([1, 2, 3]);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("uses matcher", function () {
            this.spy("abc");

            assert(this.spy[method](match.typeOf("string")));
        });

        it("uses matcher in object", function () {
            this.spy({ some: "abc" });

            assert(this.spy[method]({ some: match.typeOf("string") }));
        });

        // https://github.com/sinonjs/sinon/issues/1245
        // Using the `calledWithMatch` should work with objects that don't have
        // a hasOwnProperty function.
        describe("when called with an Object without a prototype", function () {
            it("must not throw", function () {
                const spy = this.spy;
                const objectWithoutPrototype = Object.create(null);

                objectWithoutPrototype.something = 2;

                spy[method]({
                    foo: 1,
                    objectWithoutPrototype: objectWithoutPrototype,
                });

                refute.exception(function () {
                    spy.calledWithMatch({
                        objectWithoutPrototype: objectWithoutPrototype,
                    });
                });
            });
        });
    };
}

function spyAlwaysCalledTests(method) {
    return function () {
        // eslint-disable-next-line mocha/no-top-level-hooks, mocha/no-sibling-hooks
        beforeEach(function () {
            this.spy = createSpy();
        });

        // eslint-disable-next-line mocha/no-identical-title
        it("returns false if spy was not called", function () {
            assert.isFalse(this.spy[method](1, 2, 3));
        });

        // eslint-disable-next-line mocha/no-identical-title
        it("returns true if spy was called with args", function () {
            this.spy(1, 2, 3);

            assert(this.spy[method](1, 2, 3));
        });

        it("returns false if called with args only once", function () {
            this.spy(1, 3, 3);
            this.spy(1, 2, 3);
            this.spy(3, 2, 3);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        // eslint-disable-next-line mocha/no-identical-title
        it("returns false if not called with args", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        // eslint-disable-next-line mocha/no-identical-title
        it("returns true for partial match", function () {
            this.spy(1, 3, 3);

            assert(this.spy[method](1, 3));
        });

        it("returns true for partial match on many calls", function () {
            this.spy(1, 3, 3);
            this.spy(1, 3);
            this.spy(1, 3, 4, 5);
            this.spy(1, 3, 1);

            assert(this.spy[method](1, 3));
        });

        // eslint-disable-next-line mocha/no-identical-title
        it("matchs all arguments individually, not as array", function () {
            this.spy([1, 2, 3]);

            assert.isFalse(this.spy[method](1, 2, 3));
        });
    };
}

function spyNeverCalledTests(method) {
    return function () {
        // eslint-disable-next-line mocha/no-top-level-hooks, mocha/no-sibling-hooks
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("returns true if spy was not called", function () {
            assert(this.spy[method](1, 2, 3));
        });

        it("returns false if spy was called with args", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns false if called with args at least once", function () {
            this.spy(1, 3, 3);
            this.spy(1, 2, 3);
            this.spy(3, 2, 3);

            assert.isFalse(this.spy[method](1, 2, 3));
        });

        it("returns true if not called with args", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert(this.spy[method](1, 2, 3));
        });

        it("returns false for partial match", function () {
            this.spy(1, 3, 3);
            this.spy(2);
            this.spy();

            assert.isFalse(this.spy[method](1, 3));
        });

        // eslint-disable-next-line mocha/no-identical-title
        it("matchs all arguments individually, not as array", function () {
            this.spy([1, 2, 3]);

            assert(this.spy[method](1, 2, 3));
        });
    };
}

function verifyFunctionName(func, expectedName) {
    const descriptor = Object.getOwnPropertyDescriptor(func, "name");
    if (descriptor && descriptor.configurable) {
        // IE 11 functions don't have a name.
        // Safari 9 has names that are not configurable.
        assert.equals(descriptor.value, expectedName);
        assert.equals(func.name, expectedName);
    }
}

describe("spy", function () {
    it("does not throw if called without function", function () {
        refute.exception(function () {
            createSpy();
        });
    });

    it("does not throw when calling anonymous spy", function () {
        const spy = createSpy();

        refute.exception(spy);

        assert(spy.called);
    });

    it("returns spy function", function () {
        const func = function () {
            return;
        };
        const spy = createSpy(func);

        assert.isFunction(spy);
        refute.same(func, spy);
    });

    it("mirrors custom properties on function", function () {
        const func = function () {
            return;
        };
        func.myProp = 42;
        const spy = createSpy(func);

        assert.equals(spy.myProp, func.myProp);
    });

    it("does not define create method", function () {
        const spy = createSpy();

        assert.isUndefined(spy.create);
    });

    it("does not overwrite original create property", function () {
        const func = function () {
            return;
        };
        const object = (func.create = {});
        const spy = createSpy(func);

        assert.same(spy.create, object);
    });

    it("sets up logging arrays", function () {
        const spy = createSpy();

        assert.isArray(spy.args);
        assert.isArray(spy.returnValues);
        assert.isArray(spy.thisValues);
        assert.isArray(spy.exceptions);
    });

    it("works with getters", function () {
        const object = {
            get property() {
                return 42;
            },
        };
        const spy = createSpy(object, "property", ["get"]);

        assert.equals(object.property, 42);
        assert(spy.get.calledOnce);
    });

    it("works with setters", function () {
        const object = {
            get test() {
                return this.property;
            },
            set test(value) {
                this.property = value * 2;
            },
        };
        const spy = createSpy(object, "test", ["set"]);

        object.test = 42;
        assert(spy.set.calledOnce);
        assert(spy.set.calledWith(42));

        assert.equals(object.test, 84);
        assert.equals(object.property, 84);
    });

    it("works with setters and getters combined", function () {
        const object = {
            get test() {
                return this.property;
            },
            set test(value) {
                this.property = value * 2;
            },
        };
        const spy = createSpy(object, "test", ["get", "set"]);

        object.test = 42;
        assert(spy.set.calledOnce);

        assert.equals(object.test, 84);
        assert(spy.get.calledOnce);
    });

    it("sets wrappedMethod on getter and setter", function () {
        const object = {
            get test() {
                return this.property;
            },
            set test(value) {
                this.property = value;
            },
        };

        const descriptor1 = Object.getOwnPropertyDescriptor(object, "test");
        const spy = createSpy(object, "test", ["get", "set"]);
        const descriptor2 = Object.getOwnPropertyDescriptor(object, "test");

        refute.equals(descriptor1, descriptor2);

        refute.isUndefined(spy.get.wrappedMethod);
        refute.isUndefined(spy.get.restore);
        refute.isUndefined(spy.set.wrappedMethod);
        refute.isUndefined(spy.set.restore);
        assert.isUndefined(spy.wrappedMethod);
        assert.isUndefined(spy.restore);

        spy.get.restore();
        spy.set.restore();

        const descriptor3 = Object.getOwnPropertyDescriptor(object, "test");
        assert.equals(descriptor1, descriptor3);
    });

    it("restores an inherited getter without invoking it", function () {
        let reads = 0;
        const prototype = {
            get property() {
                reads++;
                return 42;
            },
        };
        const object = Object.create(prototype);
        const spy = createSpy(object, "property", ["get"]);

        spy.get.restore();

        assert.equals(reads, 0);
        refute(Object.hasOwn(object, "property"));
        assert.equals(object.property, 42);
        refute(spy.get.called);
    });

    it("restores an inherited setter without invoking the paired getter", function () {
        let reads = 0;
        const prototype = {
            get property() {
                reads++;
                return this.stored;
            },
            set property(value) {
                this.stored = value;
            },
        };
        const object = Object.create(prototype);
        const spy = createSpy(object, "property", ["set"]);

        spy.set.restore();

        assert.equals(reads, 0);
        refute(Object.hasOwn(object, "property"));
        object.property = 42;
        assert.equals(object.stored, 42);
        refute(spy.set.called);
    });

    it("keeps the other inherited accessor spied until both are restored", function () {
        for (const first of ["get", "set"]) {
            const second = first === "get" ? "set" : "get";
            const prototype = {
                get property() {
                    return this.stored;
                },
                set property(value) {
                    this.stored = value;
                },
            };
            const original = Object.getOwnPropertyDescriptor(
                prototype,
                "property",
            );
            const object = Object.create(prototype);
            const spy = createSpy(object, "property", ["get", "set"]);

            spy[first].restore();

            const partial = Object.getOwnPropertyDescriptor(object, "property");
            assert.same(partial[first], original[first]);
            assert.same(partial[second], spy[second]);

            spy[second].restore();

            refute(Object.hasOwn(object, "property"));
            assert.equals(
                Object.getOwnPropertyDescriptor(prototype, "property"),
                original,
            );
        }
    });

    describe("global.Error", function () {
        beforeEach(function () {
            this.originalError = globalContext.Error;
        });

        afterEach(function () {
            globalContext.Error = this.originalError;
        });

        it("creates a spy for Error", function () {
            refute.exception(function () {
                createSpy(globalContext, "Error");
            });
        });
    });

    it("should work with combination of withArgs arguments and order of calling withArgs", function () {
        function assertSpy(spy) {
            // assert callCount
            assert.equals(spy.callCount, 4);
            assert.equals(spy.withArgs(1).callCount, 3);
            assert.equals(spy.withArgs(1, 1).callCount, 1);
            assert.equals(spy.withArgs(1, 2).callCount, 1);

            // assert call
            assert.isUndefined(spy.getCall(0).args[0]);
            assert.equals(spy.getCall(1).args[0], 1);
            assert.isUndefined(spy.getCall(1).args[1]);
            assert.equals(spy.getCall(2).args[0], 1);
            assert.equals(spy.getCall(2).args[1], 1);
            assert.isUndefined(spy.getCall(2).args[2]);
            assert.equals(spy.getCall(3).args[0], 1);
            assert.equals(spy.getCall(3).args[1], 2);
            assert.isUndefined(spy.getCall(3).args[2]);
            ["args", "callId"].forEach(function (propName) {
                assert.equals(
                    spy.withArgs(1).getCall(0)[propName],
                    spy.getCall(1)[propName],
                );
                assert.equals(
                    spy.withArgs(1).getCall(1)[propName],
                    spy.getCall(2)[propName],
                );
                assert.equals(
                    spy.withArgs(1).getCall(2)[propName],
                    spy.getCall(3)[propName],
                );
                assert.isNull(spy.withArgs(1).getCall(3));
                assert.equals(
                    spy.withArgs(1, 1).getCall(0)[propName],
                    spy.getCall(2)[propName],
                );
                assert.isNull(spy.withArgs(1, 1).getCall(1));
                assert.equals(
                    spy.withArgs(1, 2).getCall(0)[propName],
                    spy.getCall(3)[propName],
                );
                assert.isNull(spy.withArgs(1, 2).getCall(1));
            });

            // assert firstCall, secondCall, thirdCall, and lastCall
            assert.equals(spy.firstCall.callId, spy.getCall(0).callId);
            assert.equals(spy.secondCall.callId, spy.getCall(1).callId);
            assert.equals(spy.thirdCall.callId, spy.getCall(2).callId);
            assert.equals(spy.lastCall.callId, spy.getCall(3).callId);
            assert.equals(
                spy.withArgs(1).firstCall.callId,
                spy.withArgs(1).getCall(0).callId,
            );
            assert.equals(
                spy.withArgs(1).secondCall.callId,
                spy.withArgs(1).getCall(1).callId,
            );
            assert.equals(
                spy.withArgs(1).thirdCall.callId,
                spy.withArgs(1).getCall(2).callId,
            );
            assert.equals(
                spy.withArgs(1).lastCall.callId,
                spy.withArgs(1).getCall(2).callId,
            );
            assert.equals(
                spy.withArgs(1, 1).firstCall.callId,
                spy.withArgs(1, 1).getCall(0).callId,
            );
            assert.isNull(spy.withArgs(1, 1).secondCall);
            assert.isNull(spy.withArgs(1, 1).thirdCall);
            assert.equals(
                spy.withArgs(1, 1).lastCall.callId,
                spy.withArgs(1, 1).getCall(0).callId,
            );
            assert.equals(
                spy.withArgs(1, 2).firstCall.callId,
                spy.withArgs(1, 2).getCall(0).callId,
            );
            assert.isNull(spy.withArgs(1, 2).secondCall);
            assert.isNull(spy.withArgs(1, 2).thirdCall);
            assert.equals(
                spy.withArgs(1, 2).lastCall.callId,
                spy.withArgs(1, 2).getCall(0).callId,
            );
        }

        const object = {
            f1: function () {
                return;
            },
            f2: function () {
                return;
            },
        };

        // f1: the order of withArgs(1), withArgs(1, 1)
        const spy1 = createSpy(object, "f1");
        assert.equals(spy1.callCount, 0);
        assert.equals(spy1.withArgs(1).callCount, 0);
        assert.equals(spy1.withArgs(1, 1).callCount, 0);
        assert.isNull(spy1.getCall(0));
        assert.isNull(spy1.getCall(1));
        assert.isNull(spy1.getCall(2));
        assert.isNull(spy1.getCall(3));

        object.f1();
        object.f1(1);
        object.f1(1, 1);
        object.f1(1, 2);
        assertSpy(spy1);

        // f2: the order of withArgs(1, 1), withArgs(1)
        const spy2 = createSpy(object, "f2");
        assert.equals(spy2.callCount, 0);
        assert.equals(spy2.withArgs(1, 1).callCount, 0);
        assert.equals(spy2.withArgs(1).callCount, 0);
        assert.isNull(spy2.getCall(0));
        assert.isNull(spy2.getCall(1));
        assert.isNull(spy2.getCall(2));
        assert.isNull(spy2.getCall(3));

        object.f2();
        object.f2(1);
        object.f2(1, 1);
        object.f2(1, 2);
        assertSpy(spy2);
    });

    describe(".named", function () {
        it("sets name and displayName", function () {
            const spy = createSpy();
            const retval = spy.named("beep");
            assert.equals(spy.displayName, "beep");
            verifyFunctionName(spy, "beep");
            assert.same(spy, retval);
        });
    });

    describe("call", function () {
        it("calls underlying function", function () {
            let called = false;

            const spy = createSpy(function () {
                called = true;
            });

            spy();

            assert(called);
        });

        it("passes 'new' to underlying function", function () {
            function TestClass() {
                return;
            }

            const SpyClass = createSpy(TestClass);

            const instance = new SpyClass();

            assert(instance instanceof TestClass);
        });

        it("passes arguments to function", function () {
            let actualArgs;

            const func = function (a, b, c, d) {
                actualArgs = [a, b, c, d];
            };

            const args = [1, {}, [], ""];
            const spy = createSpy(func);
            spy(args[0], args[1], args[2], args[3]);

            assert.equals(actualArgs, args);
        });

        it("maintains this binding", function () {
            let actualThis;

            const func = function () {
                actualThis = this;
            };

            const object = {};
            const spy = createSpy(func);
            spy.call(object);

            assert.same(actualThis, object);
        });

        it("returns function's return value", function () {
            const object = {};

            const func = function () {
                return object;
            };

            const spy = createSpy(func);
            const actualReturn = spy();

            assert.same(actualReturn, object);
        });

        it("throws if function throws", function () {
            const err = new Error();
            const spy = createSpy(function () {
                throw err;
            });

            assert.exception(spy, err);
        });

        it("retains function name", function () {
            function test() {
                return;
            }

            const spy = createSpy(test);

            assert.equals(spy.displayName, "test");
            verifyFunctionName(spy, "test");
        });

        it("retains function length 0", function () {
            const spy = createSpy(function () {
                return;
            });

            assert.equals(spy.length, 0);
        });

        it("retains function length 1", function () {
            // eslint-disable-next-line no-unused-vars
            const spy = createSpy(function (a) {
                return;
            });

            assert.equals(spy.length, 1);
        });

        it("retains function length 2", function () {
            // eslint-disable-next-line no-unused-vars
            const spy = createSpy(function (a, b) {
                return;
            });

            assert.equals(spy.length, 2);
        });

        it("retains function length 3", function () {
            // eslint-disable-next-line no-unused-vars
            const spy = createSpy(function (a, b, c) {
                return;
            });

            assert.equals(spy.length, 3);
        });

        it("retains function length 4", function () {
            // eslint-disable-next-line no-unused-vars
            const spy = createSpy(function (a, b, c, d) {
                return;
            });

            assert.equals(spy.length, 4);
        });

        it("retains function length 12", function () {
            // eslint-disable-next-line no-unused-vars
            const func12Args = function (a, b, c, d, e, f, g, h, i, j, k, l) {
                return;
            };
            const spy = createSpy(func12Args);

            assert.equals(spy.length, 12);
        });
    });

    describe(".called", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.called);
        });

        it("is true after calling the spy once", function () {
            this.spy();

            assert(this.spy.called);
        });

        it("is true after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert(this.spy.called);
        });
    });

    describe(".notCalled", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is true prior to calling the spy", function () {
            assert.isTrue(this.spy.notCalled);
        });

        it("is false after calling the spy once", function () {
            this.spy();

            assert.isFalse(this.spy.notCalled);
        });
    });

    describe(".calledOnce", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.calledOnce);
        });

        it("is true after calling the spy once", function () {
            this.spy();

            assert(this.spy.calledOnce);
        });

        it("is false after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledOnce);
        });
    });

    describe(".calledTwice", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.calledTwice);
        });

        it("is false after calling the spy once", function () {
            this.spy();

            assert.isFalse(this.spy.calledTwice);
        });

        it("is true after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert(this.spy.calledTwice);
        });

        it("is false after calling the spy thrice", function () {
            this.spy();
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledTwice);
        });
    });

    describe(".calledThrice", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.calledThrice);
        });

        it("is false after calling the spy twice", function () {
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledThrice);
        });

        it("is true after calling the spy thrice", function () {
            this.spy();
            this.spy();
            this.spy();

            assert(this.spy.calledThrice);
        });

        it("is false after calling the spy four times", function () {
            this.spy();
            this.spy();
            this.spy();
            this.spy();

            assert.isFalse(this.spy.calledThrice);
        });
    });

    describe(".callCount", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("reports 0 calls", function () {
            assert.equals(this.spy.callCount, 0);
        });

        it("records one call", function () {
            this.spy();

            assert.equals(this.spy.callCount, 1);
        });

        it("records two calls", function () {
            this.spy();
            this.spy();

            assert.equals(this.spy.callCount, 2);
        });

        it("increases call count for each call", function () {
            this.spy();
            this.spy();
            assert.equals(this.spy.callCount, 2);

            this.spy();
            assert.equals(this.spy.callCount, 3);
        });
    });

    describe(".calledOn", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false if spy wasn't called", function () {
            assert.isFalse(this.spy.calledOn({}));
        });

        it("is true if called with thisValue", function () {
            const object = {};
            this.spy.call(object);

            assert(this.spy.calledOn(object));
        });

        describe("in browser", function () {
            before(function () {
                if (typeof window === "undefined") {
                    this.skip();
                }
            });

            it("is true if called on object at least once", function () {
                const object = {};
                this.spy();
                this.spy.call({});
                this.spy.call(object);
                this.spy.call(window);

                assert(this.spy.calledOn(object));
            });
        });

        it("returns false if not called on object", function () {
            const object = {};
            this.spy.call(object);
            this.spy();

            assert.isFalse(this.spy.calledOn({}));
        });

        it("is true if called with matcher that returns true", function () {
            const matcher = match(function () {
                return true;
            });
            this.spy();

            assert(this.spy.calledOn(matcher));
        });

        it("is false if called with matcher that returns false", function () {
            const matcher = match(function () {
                return false;
            });
            this.spy();

            assert.isFalse(this.spy.calledOn(matcher));
        });

        it("invokes matcher.test with given object", function () {
            const expected = {};
            let actual;
            this.spy.call(expected);

            this.spy.calledOn(
                match(function (value) {
                    actual = value;
                }),
            );

            assert.same(actual, expected);
        });
    });

    describe(".alwaysCalledOn", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false prior to calling the spy", function () {
            assert.isFalse(this.spy.alwaysCalledOn({}));
        });

        it("is true if called with thisValue once", function () {
            const object = {};
            this.spy.call(object);

            assert(this.spy.alwaysCalledOn(object));
        });

        it("is true if called with thisValue many times", function () {
            const object = {};
            this.spy.call(object);
            this.spy.call(object);
            this.spy.call(object);
            this.spy.call(object);

            assert(this.spy.alwaysCalledOn(object));
        });

        it("is false if called with another object atleast once", function () {
            const object = {};
            this.spy.call(object);
            this.spy.call(object);
            this.spy.call(object);
            this.spy();
            this.spy.call(object);

            assert.isFalse(this.spy.alwaysCalledOn(object));
        });

        it("is false if never called with expected object", function () {
            const object = {};
            this.spy();
            this.spy();
            this.spy();

            assert.isFalse(this.spy.alwaysCalledOn(object));
        });
    });

    describe(".calledWithNew", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false if spy wasn't called", function () {
            assert.isFalse(this.spy.calledWithNew());
        });

        it("is true if called with new", function () {
            const result = new this.spy(); // eslint-disable-line no-unused-vars, new-cap

            assert(this.spy.calledWithNew());
        });

        it("is true if called with new on custom constructor", function () {
            function MyThing() {
                return;
            }
            MyThing.prototype = {};
            const ns = { MyThing: MyThing };
            createSpy(ns, "MyThing");

            const result = new ns.MyThing(); // eslint-disable-line no-unused-vars
            assert(ns.MyThing.calledWithNew());
        });

        it("is false if called as function", function () {
            this.spy();

            assert.isFalse(this.spy.calledWithNew());
        });

        describe("in browser", function () {
            before(function () {
                if (typeof window === "undefined") {
                    this.skip();
                }
            });

            it("is true if called with new at least once", function () {
                const object = {};
                this.spy();
                const a = new this.spy(); // eslint-disable-line no-unused-vars, new-cap
                this.spy(object);
                this.spy(window);

                assert(this.spy.calledWithNew());
            });
        });

        it("is true newed constructor returns object", function () {
            function MyThing() {
                return {};
            }
            const object = { MyThing: MyThing };
            createSpy(object, "MyThing");

            const result = new object.MyThing(); // eslint-disable-line no-unused-vars

            assert(object.MyThing.calledWithNew());
        });

        describe("spied native function", function () {
            before(function () {
                try {
                    // eslint-disable-next-line no-console
                    console.log.apply({}, []);
                } catch (e) {
                    this.skip();
                }
            });

            it("is false when called on spied native function", function () {
                const log = { info: console.log }; // eslint-disable-line no-console
                createSpy(log, "info");

                // by logging an empty string, we're not polluting the test console output
                log.info("");

                assert.isFalse(log.info.calledWithNew());
            });
        });
    });

    describe(".alwaysCalledWithNew", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is false if spy wasn't called", function () {
            assert.isFalse(this.spy.alwaysCalledWithNew());
        });

        it("is true if always called with new", function () {
            /*eslint-disable no-unused-vars, new-cap*/
            const result = new this.spy();
            const result2 = new this.spy();
            const result3 = new this.spy();
            /*eslint-enable no-unused-vars, new-cap*/

            assert(this.spy.alwaysCalledWithNew());
        });

        it("is false if called as function once", function () {
            /*eslint-disable no-unused-vars, new-cap*/
            const result = new this.spy();
            const result2 = new this.spy();
            /*eslint-enable no-unused-vars, new-cap*/
            this.spy();

            assert.isFalse(this.spy.alwaysCalledWithNew());
        });
    });

    describe(".thisValues", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("contains one object", function () {
            const object = {};
            this.spy.call(object);

            assert.equals(this.spy.thisValues, [object]);
        });

        it("stacks up objects", function () {
            function MyConstructor() {
                return;
            }
            const objects = [{}, [], new MyConstructor(), { id: 243 }];
            this.spy();
            this.spy.call(objects[0]);
            this.spy.call(objects[1]);
            this.spy.call(objects[2]);
            this.spy.call(objects[3]);

            assert.equals(this.spy.thisValues, [this].concat(objects));
        });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    describe(".calledWith", spyCalledTests("calledWith"));
    // eslint-disable-next-line mocha/no-setup-in-describe
    describe(".calledWithMatch", spyCalledTests("calledWithMatch"));

    describe(".calledWithMatchSpecial", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("checks substring match", function () {
            this.spy("I like it");

            assert(this.spy.calledWithMatch("like"));
            assert.isFalse(this.spy.calledWithMatch("nope"));
        });

        it("checks for regexp match", function () {
            this.spy("I like it");

            assert(this.spy.calledWithMatch(/[a-z ]+/i));
            assert.isFalse(this.spy.calledWithMatch(/[0-9]+/));
        });

        it("checks for partial object match", function () {
            this.spy({ foo: "foo", bar: "bar" });

            assert(this.spy.calledWithMatch({ bar: "bar" }));
            assert.isFalse(this.spy.calledWithMatch({ same: "same" }));
        });
    });

    it("throws when trying to spy on an ES module namespace object", function () {
        const object = {};

        Object.defineProperty(object, Symbol.toStringTag, {
            value: "Module",
        });
        Object.seal(object);

        assert.exception(
            function () {
                createSpy(object);
            },
            {
                name: "TypeError",
                message: "ES Modules cannot be spied",
            },
        );
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    describe(".alwaysCalledWith", spyAlwaysCalledTests("alwaysCalledWith"));

    describe(
        ".alwaysCalledWithMatch",
        // eslint-disable-next-line mocha/no-setup-in-describe
        spyAlwaysCalledTests("alwaysCalledWithMatch"),
    );

    describe(".alwaysCalledWithMatchSpecial", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("checks true", function () {
            this.spy(true);

            assert(this.spy.alwaysCalledWithMatch(true));
            assert.isFalse(this.spy.alwaysCalledWithMatch(false));
        });

        it("checks false", function () {
            this.spy(false);

            assert(this.spy.alwaysCalledWithMatch(false));
            assert.isFalse(this.spy.alwaysCalledWithMatch(true));
        });

        it("checks substring match", function () {
            this.spy("test case");
            this.spy("some test");
            this.spy("all tests");

            assert(this.spy.alwaysCalledWithMatch("test"));
            assert.isFalse(this.spy.alwaysCalledWithMatch("case"));
        });

        it("checks regexp match", function () {
            this.spy("1");
            this.spy("2");
            this.spy("3");

            assert(this.spy.alwaysCalledWithMatch(/[123]/));
            assert.isFalse(this.spy.alwaysCalledWithMatch(/[12]/));
        });

        it("checks partial object match", function () {
            this.spy({ a: "a", b: "b" });
            this.spy({ c: "c", b: "b" });
            this.spy({ b: "b", d: "d" });

            assert(this.spy.alwaysCalledWithMatch({ b: "b" }));
            assert.isFalse(this.spy.alwaysCalledWithMatch({ a: "a" }));
        });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    describe(".neverCalledWith", spyNeverCalledTests("neverCalledWith"));

    describe(
        ".neverCalledWithMatch",
        // eslint-disable-next-line mocha/no-setup-in-describe
        spyNeverCalledTests("neverCalledWithMatch"),
    );

    describe(".neverCalledWithMatchSpecial", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("checks substring match", function () {
            this.spy("a test", "b test");

            assert(this.spy.neverCalledWithMatch("a", "a"));
            assert(this.spy.neverCalledWithMatch("b", "b"));
            assert(this.spy.neverCalledWithMatch("b", "a"));
            assert.isFalse(this.spy.neverCalledWithMatch("a", "b"));
        });

        it("checks regexp match", function () {
            this.spy("a test", "b test");

            assert(this.spy.neverCalledWithMatch(/a/, /a/));
            assert(this.spy.neverCalledWithMatch(/b/, /b/));
            assert(this.spy.neverCalledWithMatch(/b/, /a/));
            assert.isFalse(this.spy.neverCalledWithMatch(/a/, /b/));
        });

        it("checks partial object match", function () {
            this.spy({ a: "test", b: "test" });

            assert(this.spy.neverCalledWithMatch({ a: "nope" }));
            assert(this.spy.neverCalledWithMatch({ c: "test" }));
            assert.isFalse(this.spy.neverCalledWithMatch({ b: "test" }));
        });
    });

    describe(".args", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("contains real arrays", function () {
            this.spy();

            assert.isArray(this.spy.args[0]);
        });

        it("contains empty array when no arguments", function () {
            this.spy();

            assert.equals(this.spy.args, [[]]);
        });

        it("contains array with first call's arguments", function () {
            this.spy(1, 2, 3);

            assert.equals(this.spy.args, [[1, 2, 3]]);
        });

        it("stacks up arguments in nested array", function () {
            const objects = [{}, [], { id: 324 }];
            this.spy(1, objects[0], 3);
            this.spy(1, 2, objects[1]);
            this.spy(objects[2], 2, 3);

            assert.equals(this.spy.args, [
                [1, objects[0], 3],
                [1, 2, objects[1]],
                [objects[2], 2, 3],
            ]);
        });
    });

    describe(".calledWithExactly", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("returns false for partial match", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.calledWithExactly(1, 2));
        });

        it("returns false for missing arguments", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.calledWithExactly(1, 2, 3, 4));
        });

        it("returns true for exact match", function () {
            this.spy(1, 2, 3);

            assert(this.spy.calledWithExactly(1, 2, 3));
        });

        it("matchs by strict comparison", function () {
            this.spy({}, []);

            assert.isFalse(this.spy.calledWithExactly({}, [], null));
        });

        it("returns true for one exact match", function () {
            const object = {};
            const array = [];
            this.spy({}, []);
            this.spy(object, []);
            this.spy(object, array);

            assert(this.spy.calledWithExactly(object, array));
        });

        it("returns true when all properties of an object argument match", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert(this.spy.calledWithExactly({ a: 1, b: 2, c: 3 }));
        });

        it("returns false when a property of an object argument is set to undefined", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(
                this.spy.calledWithExactly({ a: 1, b: 2, c: undefined }),
            );
        });

        it("returns false when a property of an object argument is set to a different value", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(
                this.spy.calledWithExactly({ a: 1, b: 2, c: "blah" }),
            );
        });

        it("returns false when an object argument has a different property/value pair", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(
                this.spy.calledWithExactly({ a: 1, b: 2, foo: "blah" }),
            );
        });

        it("returns false when property of Object argument is set to undefined and has a different name", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(
                this.spy.calledWithExactly({ a: 1, b: 2, foo: undefined }),
            );
        });

        it("returns false when any properties of an object argument aren't present", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(this.spy.calledWithExactly({ a: 1, b: 2 }));
        });

        it("returns false when an object argument has extra properties", function () {
            this.spy({ a: 1, b: 2, c: 3 });

            assert.isFalse(
                this.spy.calledWithExactly({ a: 1, b: 2, c: 3, d: 4 }),
            );
        });
    });

    describe(".calledOnceWith", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("returns true for not exact match", function () {
            this.spy(1, 2, 3, 4);

            assert.isTrue(this.spy.calledOnceWith(1, 2, 3));
        });

        it("returns false for matching calls but called more then once", function () {
            this.spy(1, 2, 3, 4);
            this.spy(1, 2, 3, 6);

            assert.isFalse(this.spy.calledOnceWith(1, 2, 3));
        });

        it("return false for one mismatched call", function () {
            this.spy(1, 2);

            assert.isFalse(this.spy.calledOnceWith(1, 2, 3));
        });

        it("return false for one mismatched call with some other ", function () {
            this.spy(1, 2, 3);
            this.spy(1, 2);

            assert.isFalse(this.spy.calledOnceWith(1, 2, 3));
        });
    });

    describe(".calledOnceWithExactly", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("returns true for exact match", function () {
            this.spy(1, 2, 3);

            assert.isTrue(this.spy.calledOnceWithExactly(1, 2, 3));
        });

        it("returns false for exact parameters but called more then once", function () {
            this.spy(1, 2, 3);
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.calledOnceWithExactly(1, 2, 3));
        });

        it("return false for one mismatched call", function () {
            this.spy(1, 2);

            assert.isFalse(this.spy.calledOnceWithExactly(1, 2, 3));
        });

        it("return false for one mismatched call with some other ", function () {
            this.spy(1, 2, 3);
            this.spy(1, 2);

            assert.isFalse(this.spy.calledOnceWithExactly(1, 2, 3));
        });
    });

    describe(".calledOnceWithMatch", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("returns true for exact match", function () {
            this.spy(1, 2, 3);

            assert.isTrue(this.spy.calledOnceWithMatch(1, 2, 3));
        });

        it("returns true for partial match", function () {
            this.spy(1, 2, 3);

            assert.isTrue(this.spy.calledOnceWithMatch(1, 2));
        });

        it("returns false for exact parameters but called more then once", function () {
            this.spy(1, 2, 3);
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.calledOnceWithMatch(1, 2, 3));
        });

        it("return false for one mismatched call", function () {
            this.spy(1, 2);

            assert.isFalse(this.spy.calledOnceWithMatch(1, 2, 3));
        });

        it("return false for one mismatched call with some other", function () {
            this.spy(1, 2, 3);
            this.spy(1, 2);

            assert.isFalse(this.spy.calledOnceWithMatch(1, 2, 3));
        });
    });

    describe(".alwaysCalledWithExactly", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("returns false for partial match", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.alwaysCalledWithExactly(1, 2));
        });

        it("returns false for missing arguments", function () {
            this.spy(1, 2, 3);

            assert.isFalse(this.spy.alwaysCalledWithExactly(1, 2, 3, 4));
        });

        it("returns true for exact match", function () {
            this.spy(1, 2, 3);

            assert(this.spy.alwaysCalledWithExactly(1, 2, 3));
        });

        it("returns false for excess arguments", function () {
            this.spy({}, []);

            assert.isFalse(this.spy.alwaysCalledWithExactly({}, [], null));
        });

        it("returns false for one exact match", function () {
            const object = {};
            const array = [];
            this.spy({}, []);
            this.spy(object, []);
            this.spy(object, array);

            assert(this.spy.alwaysCalledWithExactly(object, array));
        });

        it("returns true for only exact matches", function () {
            const object = {};
            const array = [];

            this.spy(object, array);
            this.spy(object, array);
            this.spy(object, array);

            assert(this.spy.alwaysCalledWithExactly(object, array));
        });

        it("returns false for no exact matches", function () {
            const object = {};
            const array = [];

            this.spy(object, array, null);
            this.spy(object, array, undefined);
            this.spy(object, array, "");

            assert.isFalse(this.spy.alwaysCalledWithExactly(object, array));
        });
    });

    describe(".threw", function () {
        beforeEach(function () {
            this.spy = createSpy();

            this.spyWithTypeError = createSpy(function () {
                throw new TypeError();
            });

            this.spyWithStringError = createSpy(function () {
                // eslint-disable-next-line no-throw-literal
                throw "error";
            });
        });

        it("returns exception thrown by function", function () {
            const err = new Error();

            const spy = createSpy(function () {
                throw err;
            });

            assert.exception(spy);

            assert(spy.threw(err));
        });

        it("returns false if spy did not throw", function () {
            this.spy();

            assert.isFalse(this.spy.threw());
        });

        it("returns true if spy threw", function () {
            assert.exception(this.spyWithTypeError);

            assert(this.spyWithTypeError.threw());
        });

        it("returns true if string type matches", function () {
            assert.exception(this.spyWithTypeError);

            assert(this.spyWithTypeError.threw("TypeError"));
        });

        it("returns false if string did not match", function () {
            assert.exception(this.spyWithTypeError);

            assert.isFalse(this.spyWithTypeError.threw("Error"));
        });

        it("returns false if spy did not throw specified error", function () {
            this.spy();

            assert.isFalse(this.spy.threw("Error"));
        });

        it("returns true if string matches", function () {
            assert.exception(this.spyWithStringError);

            assert(this.spyWithStringError.threw("error"));
        });

        it("returns false if strings do not match", function () {
            assert.exception(this.spyWithStringError);

            assert.isFalse(this.spyWithStringError.threw("not the error"));
        });
    });

    describe(".alwaysThrew", function () {
        beforeEach(function () {
            this.spy = createSpy();

            this.spyWithTypeError = createSpy(function () {
                throw new TypeError();
            });
        });

        it("returns true when spy threw", function () {
            const err = new Error();

            const spy = createSpy(function () {
                throw err;
            });

            assert.exception(spy);

            assert(spy.alwaysThrew(err));
        });

        it("returns false if spy did not throw", function () {
            this.spy();

            assert.isFalse(this.spy.alwaysThrew());
        });

        it("returns true if spy threw", function () {
            assert.exception(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew());
        });

        it("returns true if string type matches", function () {
            assert.exception(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew("TypeError"));
        });

        it("returns false if string did not match", function () {
            assert.exception(this.spyWithTypeError);

            assert.isFalse(this.spyWithTypeError.alwaysThrew("Error"));
        });

        it("returns false if spy did not throw specified error", function () {
            this.spy();

            assert.isFalse(this.spy.alwaysThrew("Error"));
        });

        it("returns false if some calls did not throw", function () {
            let callCount = 0;

            this.spy = createSpy(function () {
                callCount += 1;
                if (callCount === 1) {
                    throw new Error("throwing on first call");
                }
            });

            assert.exception(this.spy);

            this.spy();

            assert.isFalse(this.spy.alwaysThrew());
        });

        it("returns true if all calls threw", function () {
            assert.exception(this.spyWithTypeError);

            assert.exception(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew());
        });

        it("returns true if all calls threw same type", function () {
            assert.exception(this.spyWithTypeError);

            assert.exception(this.spyWithTypeError);

            assert(this.spyWithTypeError.alwaysThrew("TypeError"));
        });
    });

    describe(".exceptions", function () {
        beforeEach(function () {
            this.spy = createSpy();
            const error = (this.error = {});

            this.spyWithTypeError = createSpy(function () {
                throw error;
            });
        });

        it("contains exception thrown by function", function () {
            assert.exception(this.spyWithTypeError);

            assert.equals(this.spyWithTypeError.exceptions, [this.error]);
        });

        it("contains undefined entry when function did not throw", function () {
            this.spy();

            assert.equals(this.spy.exceptions.length, 1);
            assert.isUndefined(this.spy.exceptions[0]);
        });

        it("stacks up exceptions and undefined", function () {
            let calls = 0;
            const err = this.error;

            const spy = createSpy(function () {
                calls += 1;

                if (calls % 2 === 0) {
                    throw err;
                }
            });

            spy();

            assert.exception(spy);

            spy();

            assert.exception(spy);

            spy();

            assert.equals(spy.exceptions.length, 5);
            assert.isUndefined(spy.exceptions[0]);
            assert.equals(spy.exceptions[1], err);
            assert.isUndefined(spy.exceptions[2]);
            assert.equals(spy.exceptions[3], err);
            assert.isUndefined(spy.exceptions[4]);
        });
    });

    describe(".returned", function () {
        it("returns true when no argument", function () {
            const spy = createSpy();
            spy();

            assert(spy.returned());
        });

        it("returns true for undefined when no explicit return", function () {
            const spy = createSpy();
            spy();

            assert(spy.returned(undefined));
        });

        it("returns true when returned value once", function () {
            const values = [
                {},
                2,
                "hey",
                function () {
                    return;
                },
            ];
            const spy = createSpy(function () {
                return values[spy.callCount];
            });

            spy();
            spy();
            spy();
            spy();

            assert(spy.returned(values[3]));
        });

        it("returns false when value is never returned", function () {
            const values = [
                {},
                2,
                "hey",
                function () {
                    return;
                },
            ];
            const spy = createSpy(function () {
                return values[spy.callCount];
            });

            spy();
            spy();
            spy();
            spy();

            assert.isFalse(spy.returned({ id: 42 }));
        });

        it("returns true when value is returned several times", function () {
            const object = { id: 42 };
            const spy = createSpy(function () {
                return object;
            });

            spy();
            spy();
            spy();

            assert(spy.returned(object));
        });

        it("compares values deeply", function () {
            const object = { deep: { id: 42 } };
            const spy = createSpy(function () {
                return object;
            });

            spy();

            assert(spy.returned({ deep: { id: 42 } }));
        });

        it("compares values strictly using match.same", function () {
            const object = { id: 42 };
            const spy = createSpy(function () {
                return object;
            });

            spy();

            assert.isFalse(spy.returned(match.same({ id: 42 })));
            assert(spy.returned(match.same(object)));
        });
    });

    describe(".returnValues", function () {
        it("contains undefined when function does not return explicitly", function () {
            const spy = createSpy();
            spy();

            assert.equals(spy.returnValues.length, 1);
            assert.isUndefined(spy.returnValues[0]);
        });

        it("contains return value", function () {
            const object = { id: 42 };

            const spy = createSpy(function () {
                return object;
            });

            spy();

            assert.equals(spy.returnValues, [object]);
        });

        it("contains undefined when function throws", function () {
            const spy = createSpy(function () {
                throw new Error();
            });

            assert.exception(spy);

            assert.equals(spy.returnValues.length, 1);
            assert.isUndefined(spy.returnValues[0]);
        });

        it("contains the created object for spied constructors", function () {
            const Spy = createSpy(function () {
                return;
            });

            const result = new Spy();

            assert.equals(Spy.returnValues[0], result);
        });

        it("contains the return value for spied constructors that explicitly return objects", function () {
            const Spy = createSpy(function () {
                return { isExplicitlyCreatedValue: true };
            });

            const result = new Spy();

            assert.isTrue(result.isExplicitlyCreatedValue);
            assert.equals(Spy.returnValues[0], result);
        });

        it("contains the created object for spied constructors that explicitly return primitive values", function () {
            const Spy = createSpy(function () {
                return 10;
            });

            const result = new Spy();

            refute.equals(result, 10);
            assert.equals(Spy.returnValues[0], result);
        });

        it("stacks up return values", function () {
            let calls = 0;

            /*eslint consistent-return: "off"*/
            const spy = createSpy(function () {
                calls += 1;

                if (calls % 2 === 0) {
                    return calls;
                }
            });

            spy();
            spy();
            spy();
            spy();
            spy();

            assert.equals(spy.returnValues.length, 5);
            assert.isUndefined(spy.returnValues[0]);
            assert.equals(spy.returnValues[1], 2);
            assert.isUndefined(spy.returnValues[2]);
            assert.equals(spy.returnValues[3], 4);
            assert.isUndefined(spy.returnValues[4]);
        });
    });

    describe(".calledBefore", function () {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledBefore);
        });

        it("returns true if first call to A was before first to B", function () {
            this.spyA();
            this.spyB();

            assert(this.spyA.calledBefore(this.spyB));
        });

        it("compares call order of calls directly", function () {
            this.spyA();
            this.spyB();

            assert(this.spyA.getCall(0).calledBefore(this.spyB.getCall(0)));
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledBefore(this.spyB));
        });

        it("returns true if other not called", function () {
            this.spyA();

            assert(this.spyA.calledBefore(this.spyB));
        });

        it("returns false if other called first", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert(this.spyA.calledBefore(this.spyB));
        });
    });

    describe(".calledAfter", function () {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledAfter);
        });

        it("returns true if first call to A was after first to B", function () {
            this.spyB();
            this.spyA();

            assert(this.spyA.calledAfter(this.spyB));
        });

        it("compares calls directly", function () {
            this.spyB();
            this.spyA();

            assert(this.spyA.getCall(0).calledAfter(this.spyB.getCall(0)));
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledAfter(this.spyB));
        });

        it("returns false if other not called", function () {
            this.spyA();

            assert.isFalse(this.spyA.calledAfter(this.spyB));
        });

        it("returns true if called anytime after other", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert.isTrue(this.spyA.calledAfter(this.spyB));
        });
    });

    describe(".calledImmediatelyAfter", function () {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
            this.spyC = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledImmediatelyAfter);
        });

        it("returns true if first call to A was immediately after first to B", function () {
            this.spyB();
            this.spyA();

            assert(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("compares calls directly", function () {
            this.spyB();
            this.spyA();

            assert(
                this.spyA
                    .getCall(0)
                    .calledImmediatelyAfter(this.spyB.getCall(0)),
            );
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("returns false if other not called", function () {
            this.spyA();

            assert.isFalse(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("returns false if other called last", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyAfter(this.spyB));
        });

        it("returns false if another spy called between", function () {
            this.spyA();
            this.spyC();
            this.spyB();

            assert.isFalse(this.spyB.calledImmediatelyAfter(this.spyA));
        });
    });

    describe(".calledImmediatelyBefore", function () {
        beforeEach(function () {
            this.spyA = createSpy();
            this.spyB = createSpy();
            this.spyC = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spyA.calledImmediatelyBefore);
        });

        it("returns true if first call to A was immediately after first to B", function () {
            this.spyB();
            this.spyA();

            assert(this.spyB.calledImmediatelyBefore(this.spyA));
        });

        it("compares calls directly", function () {
            this.spyB();
            this.spyA();

            assert(
                this.spyB
                    .getCall(0)
                    .calledImmediatelyBefore(this.spyA.getCall(0)),
            );
        });

        it("returns false if not called", function () {
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyBefore(this.spyB));
        });

        it("returns false if other not called", function () {
            this.spyA();

            assert.isFalse(this.spyA.calledImmediatelyBefore(this.spyB));
        });

        it("returns false if other called last", function () {
            this.spyB();
            this.spyA();
            this.spyB();

            assert.isFalse(this.spyB.calledImmediatelyBefore(this.spyA));
        });

        it("returns false if another spy called between", function () {
            this.spyA();
            this.spyC();
            this.spyB();

            assert.isFalse(this.spyA.calledImmediatelyBefore(this.spyB));
        });
    });

    describe(".firstCall", function () {
        it("is undefined by default", function () {
            const spy = createSpy();

            assert.isNull(spy.firstCall);
        });

        it("is equal to getCall(0) result after first call", function () {
            const spy = createSpy();

            spy();

            const call0 = spy.getCall(0);
            assert.equals(spy.firstCall.callId, call0.callId);
            assert.same(spy.firstCall.spy, call0.spy);
        });

        it("is equal to getCall(0) after first call when control flow has continued after invocation", function () {
            const spy = createSpy(runAsserts);

            function runAsserts() {
                const call0 = spy.getCall(0);
                assert.equals(spy.firstCall.callId, call0.callId);
                assert.same(spy.firstCall.spy, call0.spy);
            }

            spy();
        });

        it("is tracked even if exceptions are thrown", function () {
            const spy = createSpy(function () {
                throw new Error("an exception");
            });

            assert.exception(spy);

            refute.isNull(spy.firstCall);
        });

        it("has correct returnValue", function () {
            const spy = createSpy(function () {
                return 42;
            });

            spy();

            assert.equals(spy.firstCall.returnValue, 42);
            assert(spy.firstCall.returned(42));
        });

        it("has correct exception", function () {
            const err = new Error();
            const spy = createSpy(function () {
                throw err;
            });

            assert.exception(spy);

            assert.same(spy.firstCall.exception, err);
            assert(spy.firstCall.threw(err));
        });
    });

    describe(".secondCall", function () {
        it("is null by default", function () {
            const spy = createSpy();

            assert.isNull(spy.secondCall);
        });

        it("stills be null after first call", function () {
            const spy = createSpy();
            spy();

            assert.isNull(spy.secondCall);
        });

        it("is equal to getCall(1) result after second call", function () {
            const spy = createSpy();

            spy();
            spy();

            const call1 = spy.getCall(1);
            assert.equals(spy.secondCall.callId, call1.callId);
            assert.same(spy.secondCall.spy, call1.spy);
        });
    });

    describe(".thirdCall", function () {
        it("is undefined by default", function () {
            const spy = createSpy();

            assert.isNull(spy.thirdCall);
        });

        it("stills be undefined after second call", function () {
            const spy = createSpy();
            spy();
            spy();

            assert.isNull(spy.thirdCall);
        });

        it("is equal to getCall(1) result after second call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();

            const call2 = spy.getCall(2);
            assert.equals(spy.thirdCall.callId, call2.callId);
            assert.same(spy.thirdCall.spy, call2.spy);
        });
    });

    describe(".getCall", function () {
        it("is null for indexes >= length", function () {
            const spy = createSpy();

            spy();

            assert.isNull(spy.getCall(1));
            assert.isNull(spy.getCall(2));
        });

        it("is null for indexes < -length", function () {
            const spy = createSpy();

            spy();

            assert.isNull(spy.getCall(-2));
            assert.isNull(spy.getCall(-3));
        });

        it("is same as last call when passed index -1", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();

            assert.same(spy.getCall(-1).callId, spy.lastCall.callId);
            assert.same(spy.getCall(-1).spy, spy.lastCall.spy);
        });

        it("is same as n-1th call when passed index -2", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();

            assert.same(spy.getCall(-2).callId, spy.getCall(1).callId);
            assert.same(spy.getCall(-2).spy, spy.getCall(1).spy);
        });
    });

    describe(".lastCall", function () {
        it("is undefined by default", function () {
            const spy = createSpy();

            assert.isNull(spy.lastCall);
        });

        it("is same as firstCall after first call", function () {
            const spy = createSpy();

            spy();

            assert.same(spy.lastCall.callId, spy.firstCall.callId);
            assert.same(spy.lastCall.spy, spy.firstCall.spy);
        });

        it("is same as secondCall after second call", function () {
            const spy = createSpy();

            spy();
            spy();

            assert.same(spy.lastCall.callId, spy.secondCall.callId);
            assert.same(spy.lastCall.spy, spy.secondCall.spy);
        });

        it("is same as thirdCall after third call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();

            assert.same(spy.lastCall.callId, spy.thirdCall.callId);
            assert.same(spy.lastCall.spy, spy.thirdCall.spy);
        });

        it("is equal to getCall(3) result after fourth call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();
            spy();

            const call3 = spy.getCall(3);
            assert.equals(spy.lastCall.callId, call3.callId);
            assert.same(spy.lastCall.spy, call3.spy);
        });

        it("is equal to getCall(4) result after fifth call", function () {
            const spy = createSpy();

            spy();
            spy();
            spy();
            spy();
            spy();

            const call4 = spy.getCall(4);
            assert.equals(spy.lastCall.callId, call4.callId);
            assert.same(spy.lastCall.spy, call4.spy);
        });
    });

    describe(".getCalls", function () {
        it("returns an empty Array by default", function () {
            const spy = createSpy();

            assert.isArray(spy.getCalls());
            assert.equals(spy.getCalls().length, 0);
        });

        it("is analogous to using getCall(n)", function () {
            const spy = createSpy();

            spy();
            spy();

            assert.equals(spy.getCalls(), [spy.getCall(0), spy.getCall(1)]);
        });
    });

    describe(".callArg", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.callArg);
        });

        it("invokes argument at index for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.callArg(2);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if argument at index is not a function", function () {
            const spy = createSpy();
            spy();

            assert.exception(
                function () {
                    spy.callArg(1);
                },
                { name: "TypeError" },
            );
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();

            assert.exception(
                function () {
                    spy.callArg(0);
                },
                {
                    message:
                        "spy cannot call arg since it was not yet invoked.",
                },
            );
        });

        it("includes spy name in error message", function () {
            const api = {
                someMethod: function () {
                    return;
                },
            };
            const spy = createSpy(api, "someMethod");

            assert.exception(
                function () {
                    spy.callArg(0);
                },
                {
                    message:
                        "someMethod cannot call arg since it was not yet invoked.",
                },
            );
        });

        it("throws if index is not a number", function () {
            const spy = createSpy();
            spy();

            assert.exception(
                function () {
                    spy.callArg("");
                },
                { name: "TypeError" },
            );
        });

        it("passes additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy(callback);

            spy.callArg(0, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });

        it("returns callbacks return values for all calls", function () {
            const spy = createSpy();
            let i = 0;
            const callback = createSpy(function () {
                i++;
                return `useful value ${i}`;
            });
            spy(1, 2, callback);
            spy(3, 4, callback);

            const returnValues = spy.callArg(2);

            assert.equals(returnValues, ["useful value 1", "useful value 2"]);
        });
    });

    describe(".callArgOn", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.callArgOn);
        });

        it("invokes argument at index for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.callArgOn(2, thisObj);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
            assert(callback.alwaysCalledOn(thisObj));
        });

        it("throws if argument at index is not a function", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy();

            assert.exception(
                function () {
                    spy.callArgOn(1, thisObj);
                },
                { name: "TypeError" },
            );
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.exception(
                function () {
                    spy.callArgOn(0, thisObj);
                },
                {
                    message:
                        "spy cannot call arg since it was not yet invoked.",
                },
            );
        });

        it("includes spy name in error message", function () {
            const api = {
                someMethod: function () {
                    return;
                },
            };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            assert.exception(
                function () {
                    spy.callArgOn(0, thisObj);
                },
                {
                    message:
                        "someMethod cannot call arg since it was not yet invoked.",
                },
            );
        });

        it("throws if index is not a number", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy();

            assert.exception(
                function () {
                    spy.callArg("", thisObj);
                },
                { name: "TypeError" },
            );
        });

        it("pass additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            spy(callback);

            spy.callArgOn(0, thisObj, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
            assert(callback.calledOn(thisObj));
        });

        it("returns callbacks return values for all calls", function () {
            const spy = createSpy();
            let i = 0;
            const callback = createSpy(function () {
                i++;
                return `useful value ${i}`;
            });
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, callback);
            spy(3, 4, callback);

            const returnValues = spy.callArgOn(2, thisObj);

            assert.equals(returnValues, ["useful value 1", "useful value 2"]);
        });
    });

    describe(".callArgWith", function () {
        it("is alias for callArg", function () {
            const spy = createSpy();

            assert.same(spy.callArgWith, spy.callArg);
        });
    });

    describe(".callArgOnWith", function () {
        it("is alias for callArgOn", function () {
            const spy = createSpy();

            assert.same(spy.callArgOnWith, spy.callArgOn);
        });
    });

    describe(".yield", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yield);
        });

        it("invokes first function arg for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.yield();

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();

            assert.exception(
                function () {
                    spy.yield();
                },
                {
                    message: "spy cannot yield since it was not yet invoked.",
                },
            );
        });

        it("includes spy name in error message", function () {
            const api = {
                someMethod: function () {
                    return;
                },
            };
            const spy = createSpy(api, "someMethod");

            assert.exception(
                function () {
                    spy.yield();
                },
                {
                    message:
                        "someMethod cannot yield since it was not yet invoked.",
                },
            );
        });

        it("passes additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy(callback);

            spy.yield("abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });

        it("returns callbacks return values for all calls", function () {
            const spy = createSpy();
            let i = 0;
            const callback = createSpy(function () {
                i++;
                return `useful value ${i}`;
            });
            spy(1, 2, callback);
            spy(3, 4, callback);

            const returnValues = spy.yield();

            assert.equals(returnValues, ["useful value 1", "useful value 2"]);
        });
    });

    describe(".invokeCallback", function () {
        it("is alias for yield", function () {
            const spy = createSpy();

            assert.same(spy.invokeCallback, spy.yield);
        });
    });

    describe(".yieldOn", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yieldOn);
        });

        it("invokes first function arg for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, callback);
            spy(3, 4, callback);

            spy.yieldOn(thisObj);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
            assert(callback.alwaysCalledOn(thisObj));
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.exception(
                function () {
                    spy.yieldOn(thisObj);
                },
                {
                    message: "spy cannot yield since it was not yet invoked.",
                },
            );
        });

        it("includes spy name in error message", function () {
            const api = {
                someMethod: function () {
                    return;
                },
            };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            assert.exception(
                function () {
                    spy.yieldOn(thisObj);
                },
                {
                    message:
                        "someMethod cannot yield since it was not yet invoked.",
                },
            );
        });

        it("pass additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            spy(callback);

            spy.yieldOn(thisObj, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
            assert(callback.calledOn(thisObj));
        });

        it("returns callbacks return values for all calls", function () {
            const spy = createSpy();
            let i = 0;
            const callback = createSpy(function () {
                i++;
                return `useful value ${i}`;
            });
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, callback);
            spy(3, 4, callback);

            const returnValues = spy.yieldOn(thisObj);

            assert.equals(returnValues, ["useful value 1", "useful value 2"]);
        });
    });

    describe(".yieldTo", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yieldTo);
        });

        it("invokes first function arg for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            spy(1, 2, { success: callback });
            spy(3, 4, { success: callback });

            spy.yieldTo("success");

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();

            assert.exception(
                function () {
                    spy.yieldTo("success");
                },
                {
                    message:
                        "spy cannot yield to 'success' since it was not yet invoked.",
                },
            );
        });

        it("includes spy name in error message", function () {
            const api = {
                someMethod: function () {
                    return;
                },
            };
            const spy = createSpy(api, "someMethod");

            assert.exception(
                function () {
                    spy.yieldTo("success");
                },
                {
                    message:
                        "someMethod cannot yield to 'success' since it was not yet invoked.",
                },
            );
        });

        it("throws readable message for symbol when spy was not yet invoked", function () {
            if (typeof Symbol !== "function") {
                this.skip();
            }

            const spy = createSpy();

            assert.exception(
                function () {
                    spy.yieldTo(Symbol("apple pie"));
                },
                {
                    message:
                        "spy cannot yield to 'Symbol(apple pie)' since it was not yet invoked.",
                },
            );
        });

        it("pass additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            spy({ test: callback });

            spy.yieldTo("test", "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
        });

        it("returns callbacks return values for all calls", function () {
            const spy = createSpy();
            let i = 0;
            const callback = createSpy(function () {
                i++;
                return `useful value ${i}`;
            });
            spy(1, 2, { success: callback });
            spy(3, 4, { success: callback });

            const returnValues = spy.yieldTo("success");

            assert.equals(returnValues, ["useful value 1", "useful value 2"]);
        });
    });

    describe(".yieldToOn", function () {
        it("is function", function () {
            const spy = createSpy();

            assert.isFunction(spy.yieldToOn);
        });

        it("invokes first function arg for all calls", function () {
            const spy = createSpy();
            const callback = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, { success: callback });
            spy(3, 4, { success: callback });

            spy.yieldToOn("success", thisObj);

            assert(callback.calledTwice);
            assert(callback.alwaysCalledWith());
            assert(callback.alwaysCalledOn(thisObj));
        });

        it("throws if spy was not yet invoked", function () {
            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.exception(
                function () {
                    spy.yieldToOn("success", thisObj);
                },
                {
                    message:
                        "spy cannot yield to 'success' since it was not yet invoked.",
                },
            );
        });

        it("includes spy name in error message", function () {
            const api = {
                someMethod: function () {
                    return;
                },
            };
            const spy = createSpy(api, "someMethod");
            const thisObj = { name1: "value1", name2: "value2" };

            assert.exception(
                function () {
                    spy.yieldToOn("success", thisObj);
                },
                {
                    message:
                        "someMethod cannot yield to 'success' since it was not yet invoked.",
                },
            );
        });

        it("throws readable message for symbol when spy was not yet invoked", function () {
            if (typeof Symbol !== "function") {
                this.skip();
            }

            const spy = createSpy();
            const thisObj = { name1: "value1", name2: "value2" };

            assert.exception(
                function () {
                    spy.yieldToOn(Symbol("apple pie"), thisObj);
                },
                {
                    message:
                        "spy cannot yield to 'Symbol(apple pie)' since it was not yet invoked.",
                },
            );
        });

        it("pass additional arguments", function () {
            const spy = createSpy();
            const callback = createSpy();
            const array = [];
            const object = {};
            const thisObj = { name1: "value1", name2: "value2" };
            spy({ test: callback });

            spy.yieldToOn("test", thisObj, "abc", 123, array, object);

            assert(callback.calledWith("abc", 123, array, object));
            assert(callback.calledOn(thisObj));
        });

        it("returns callbacks return values for all calls", function () {
            const spy = createSpy();
            let i = 0;
            const callback = createSpy(function () {
                i++;
                return `useful value ${i}`;
            });
            const thisObj = { name1: "value1", name2: "value2" };
            spy(1, 2, { success: callback });
            spy(3, 4, { success: callback });

            const returnValues = spy.yieldToOn("success", thisObj);

            assert.equals(returnValues, ["useful value 1", "useful value 2"]);
        });
    });

    describe(".throwArg", function () {
        it("should be a function", function () {
            const spy = createSpy();

            assert.isFunction(spy.throwArg);
        });

        it("should throw if spy hasn't been called", function () {
            const spy = createSpy();

            assert.exception(
                function () {
                    spy.throwArg(0);
                },
                function (error) {
                    return (
                        error.message ===
                        "spy cannot throw arg since it was not yet invoked."
                    );
                },
            );
        });

        it("should throw if there aren't enough arguments in the previous spy call", function () {
            const spy = createSpy();

            spy("only", "four", "arguments", "here");

            assert.exception(
                function () {
                    spy.throwArg(7);
                },
                function (error) {
                    return (
                        error.message ===
                        "Not enough arguments: 7 required but only 4 present"
                    );
                },
            );
        });

        it("should throw specified argument", function () {
            const spy = createSpy();
            const expectedError = new TypeError("catpants");

            spy(true, false, null, expectedError, "meh");
            assert.exception(
                function () {
                    spy.throwArg(3);
                },
                function (error) {
                    return (
                        error instanceof TypeError &&
                        error.message === expectedError.message
                    );
                },
            );
        });
    });

    describe(".resetHistory", function () {
        it("return same object", function () {
            const spy = createSpy();
            const reset = spy.resetHistory();

            assert(reset === spy);
        });

        it("throws if called during spy invocation", function () {
            const spy = createSpy(function () {
                spy.resetHistory();
            });

            assert.exception(spy, "InvalidResetException");
        });
    });

    describe(".length", function () {
        it("is zero by default", function () {
            const spy = createSpy();

            assert.equals(spy.length, 0);
        });

        it("matches the function length", function () {
            const api = {
                // eslint-disable-next-line no-unused-vars
                someMethod: function (a, b, c) {
                    return;
                },
            };
            const spy = createSpy(api, "someMethod");

            assert.equals(spy.length, 3);
        });
    });

    describe(".matchingFakes", function () {
        beforeEach(function () {
            this.spy = createSpy();
        });

        it("is function", function () {
            assert.isFunction(this.spy.matchingFakes);
        });

        it("returns an empty array by default", function () {
            assert.equals(this.spy.matchingFakes([]), []);
            assert.equals(this.spy.matchingFakes([1]), []);
            assert.equals(this.spy.matchingFakes([1, 1]), []);
        });

        it("returns one matched fake", function () {
            this.spy.withArgs(1);
            this.spy.withArgs(2);

            assert.equals(this.spy.matchingFakes([1]), [this.spy.withArgs(1)]);
            assert.equals(this.spy.matchingFakes([2]), [this.spy.withArgs(2)]);
        });

        it("return some matched fake", function () {
            this.spy.withArgs(1);
            this.spy.withArgs(1, 1);
            this.spy.withArgs(2);

            assert.equals(this.spy.matchingFakes([]), []);
            assert.equals(this.spy.matchingFakes([1]), [this.spy.withArgs(1)]);
            assert.equals(this.spy.matchingFakes([1, 1]), [
                this.spy.withArgs(1),
                this.spy.withArgs(1, 1),
            ]);
        });
    });

    describe(".id", function () {
        it("should start with 'spy#'", function () {
            for (let i = 0; i < 10; i++) {
                assert.isTrue(createSpy().id.indexOf("spy#") === 0);
            }
        });
    });

    describe("non enumerable properties", function () {
        it("create and call spy apis", function () {
            const spy = createSpy();
            assert.equals(Object.keys(spy), []);

            // call spy and verify no enumerable properties are added
            spy(15);
            assert.equals(Object.keys(spy), []);

            // it should still work to add properties
            spy.fooBar = 1;
            assert.equals(Object.keys(spy), ["fooBar"]);

            // call some spy APIs and verify no enumerable properties are added
            spy.withArgs(1);
            spy.calledBefore(createSpy());
            spy.calledAfter(createSpy());
            spy.calledOn(undefined);
            spy.calledWith(15);
            spy.calledWithNew();
            spy.threw();
            spy.returned("ret");
            assert.equals(spy.thisValues.length, 1);
            assert.equals(spy.exceptions.length, 1);
            assert.equals(spy.returnValues.length, 1);
            assert.equals(Object.keys(spy), ["fooBar"]);

            // verify that reset history doesn't change enumerable properties
            spy.resetHistory();
            assert.equals(Object.keys(spy), ["fooBar"]);
        });

        it("create spy from function", function () {
            const func = function () {
                throw new Error("aError");
            };
            func.aProp = 42;
            const spy = createSpy(func);

            assert.equals(spy.aProp, 42);
            assert.equals(Object.keys(spy), Object.keys(func));
            assert.equals(Object.keys(spy), ["aProp"]);

            assert.exception(function () {
                spy();
            });
            assert(spy.threw());

            spy.resetHistory();
            assert.equals(Object.keys(spy), ["aProp"]);
        });
    });

    describe(".printf", function () {
        it("is delegated to proxy", function () {
            const f = function () {
                throw new Error("aError");
            };

            const spy = createSpy();
            const proxy = createProxy(f, f);

            assert.same(spy.printf, proxy.printf);
        });
    });

    describe("everything", function () {
        // eslint-disable-next-line mocha/no-setup-in-describe
        sharedSpyStubEverythingTests(createSpy);
    });
});
