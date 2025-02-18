"use strict";

const referee = require("@sinonjs/referee");
const createStub = require("../lib/sinon/stub");
const createSpy = require("../lib/sinon/spy");
const createProxy = require("../lib/sinon/proxy");
const match = require("@sinonjs/samsam").createMatcher;
const assert = referee.assert;
const refute = referee.refute;
const fail = referee.fail;
const globalContext = typeof global !== "undefined" ? global : window;

function verifyFunctionName(func, expectedName) {
    const descriptor = Object.getOwnPropertyDescriptor(func, "name");
    if (descriptor && descriptor.configurable) {
        // IE 11 functions don't have a name.
        // Safari 9 has names that are not configurable.
        assert.equals(descriptor.value, expectedName);
        assert.equals(func.name, expectedName);
    }
}

describe("stub", function () {
    it("is spy", function () {
        const stub = createStub();

        assert.isFalse(stub.called);
        assert.isFunction(stub.calledWith);
        assert.isFunction(stub.calledOn);
    });

    it("does not define create method", function () {
        const stub = createStub();

        assert.isUndefined(stub.create);
    });

    it("fails if stubbing property on null", function () {
        assert.exception(
            function () {
                createStub(null, "prop");
            },
            {
                message: "Trying to stub property 'prop' of null",
            },
        );
    });

    it("throws a readable error if stubbing Symbol on null", function () {
        if (typeof Symbol !== "function") {
            this.skip();
        }

        assert.exception(
            function () {
                createStub(null, Symbol("apple pie"));
            },
            {
                message: "Trying to stub property 'Symbol(apple pie)' of null",
            },
        );
    });

    it("should contain asynchronous versions of callsArg*, and yields* methods", function () {
        const stub = createStub();

        let syncVersions = 0;
        let asyncVersions = 0;

        for (const method in stub) {
            if (
                stub.hasOwnProperty(method) &&
                method.match(/^(callsArg|yields)/)
            ) {
                if (!method.match(/Async/)) {
                    syncVersions++;
                } else if (method.match(/Async/)) {
                    asyncVersions++;
                }
            }
        }

        assert.same(
            syncVersions,
            asyncVersions,
            "Stub prototype should contain same amount of synchronous and asynchronous methods",
        );
    });

    it("should allow overriding async behavior with sync behavior", function () {
        const stub = createStub();
        const callback = createSpy();

        stub.callsArgAsync(1);
        stub.callsArg(1);
        stub(1, callback);

        assert(callback.called);
    });

    it("should works with combination of withArgs arguments", function () {
        const stub = createStub();
        stub.returns(0);
        stub.withArgs(1, 1).returns(2);
        stub.withArgs(1).returns(1);

        assert.equals(stub(), 0);
        assert.equals(stub(1), 1);
        assert.equals(stub(1, 1), 2);
        assert.equals(stub(1, 1, 1), 2);
        assert.equals(stub(2), 0);
    });

    it("should work with combination of withArgs arguments", function () {
        const stub = createStub();

        stub.withArgs(1).returns(42);
        stub(1);

        refute.isNull(stub.withArgs(1).firstCall);
    });

    it("retains function name", function () {
        const object = {
            test: function test() {
                return;
            },
        };

        const stub = createStub(object, "test");

        assert.equals(stub.displayName, "test");
        verifyFunctionName(stub, "test");
    });

    describe("non enumerable properties", function () {
        it("create and call spy apis", function () {
            const stub = createStub();
            assert.equals(Object.keys(stub), []);

            // call spy and verify no enumerable properties are added
            stub(15);
            assert.equals(Object.keys(stub), []);

            // it should still work to add properties
            stub.fooBar = 1;
            assert.equals(Object.keys(stub), ["fooBar"]);

            // call some spy APIs and verify no enumerable properties are added
            stub.withArgs(1);
            stub.calledBefore(createStub());
            stub.calledAfter(createStub());
            stub.calledOn(undefined);
            stub.calledWith(15);
            stub.calledWithNew();
            stub.threw();
            stub.returned("ret");
            assert.equals(stub.thisValues.length, 1);
            assert.equals(stub.exceptions.length, 1);
            assert.equals(stub.returnValues.length, 1);
            assert.equals(Object.keys(stub), ["fooBar"]);

            // verify that reset history doesn't change enumerable properties
            stub.resetHistory();
            assert.equals(Object.keys(stub), ["fooBar"]);
        });

        it("create stub from function on object", function () {
            const func = function () {
                throw new Error("aError");
            };
            const object = {
                test: func,
            };
            func.aProp = 42;

            createStub(object, "test");

            assert.equals(object.test.aProp, 42);
            assert.equals(Object.keys(object.test), Object.keys(func));
            assert.equals(Object.keys(object.test), ["aProp"]);

            object.test();

            object.test.resetHistory();
            assert.equals(Object.keys(object.test), ["aProp"]);
        });
    });

    describe(".returns", function () {
        it("returns specified value", function () {
            const stub = createStub();
            const object = {};
            stub.returns(object);

            assert.same(stub(), object);
        });

        it("returns should return stub", function () {
            const stub = createStub();

            assert.same(stub.returns(""), stub);
        });

        it("returns undefined", function () {
            const stub = createStub();

            assert.isUndefined(stub());
        });

        it("supersedes previous throws", function () {
            const stub = createStub();
            stub.throws().returns(1);

            refute.exception(function () {
                stub();
            });
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().returns(2);
            const stub = createStub().callsFake(fakeFn).returns(1);

            assert.equals(stub(), 1);
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return 1;
                },
            };
            const stub = createStub(obj, "fn").callThrough().returns(2);

            assert.equals(stub(), 2);
        });

        it("throws only on the first call", function () {
            const stub = createStub();
            stub.returns("no exception");
            stub.onFirstCall().throws();

            assert.exception(function () {
                stub();
            });

            // on the second call there is no exception
            assert.same(stub(), "no exception");
        });
    });

    describe(".resolves", function () {
        before(function () {
            if (typeof Promise === "undefined") {
                this.skip();
            }
        });

        afterEach(function () {
            if (Promise.resolve.restore) {
                Promise.resolve.restore();
            }
        });

        it("returns a promise to the specified value", function () {
            const stub = createStub();
            const object = {};
            stub.resolves(object);

            return stub().then(function (actual) {
                assert.same(actual, object);
            });
        });

        it("should return the same stub", function () {
            const stub = createStub();

            assert.same(stub.resolves(""), stub);
        });

        it("supersedes previous throws", function () {
            const stub = createStub();
            stub.throws().resolves(1);

            refute.exception(function () {
                stub();
            });
        });

        it("supersedes previous rejects", function () {
            const stub = createStub();
            stub.rejects(Error("should be superseded")).resolves(1);

            return stub().then();
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return Promise.resolve(1);
                },
            };
            const stub = createStub(obj, "fn").callThrough().resolves(2);

            return stub().then(function (actual) {
                assert.equals(actual, 2);
            });
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().resolves(2);
            const stub = createStub().callsFake(fakeFn).resolves(1);

            return stub().then(function (actual) {
                assert.same(actual, 1);
                refute(fakeFn.called);
            });
        });

        it("can be superseded by returns", function () {
            const stub = createStub();
            stub.resolves(2).returns(1);

            assert.equals(stub(), 1);
        });

        it("does not invoke Promise.resolve when the behavior is added to the stub", function () {
            const resolveSpy = createSpy(Promise, "resolve");
            const stub = createStub();
            stub.resolves(2);

            assert.equals(resolveSpy.callCount, 0);
        });
    });

    describe(".rejects", function () {
        before(function () {
            if (typeof Promise === "undefined") {
                this.skip();
            }
        });

        afterEach(function () {
            if (Promise.reject.restore) {
                Promise.reject.restore();
            }
        });

        it("returns a promise which rejects for the specified reason", function () {
            const stub = createStub();
            const reason = new Error();
            stub.rejects(reason);

            return stub()
                .then(function () {
                    referee.fail("this should not resolve");
                })
                .catch(function (actual) {
                    assert.same(actual, reason);
                });
        });

        it("should return the same stub", function () {
            const stub = createStub();

            assert.same(stub.rejects({}), stub);
        });

        it("specifies exception message", function () {
            const stub = createStub();
            const message = "Oh no!";
            stub.rejects("Error", message);

            return stub()
                .then(function () {
                    referee.fail("Expected stub to reject");
                })
                .catch(function (reason) {
                    assert.equals(reason.message, message);
                });
        });

        it("does not specify exception message if not provided", function () {
            const stub = createStub();
            stub.rejects("Error");

            return stub()
                .then(function () {
                    referee.fail("Expected stub to reject");
                })
                .catch(function (reason) {
                    assert.equals(reason.message, "");
                });
        });

        it("rejects for a generic reason", function () {
            const stub = createStub();
            stub.rejects();

            return stub()
                .then(function () {
                    referee.fail("Expected stub to reject");
                })
                .catch(function (reason) {
                    assert.equals(reason.name, "Error");
                });
        });

        it("can be superseded by returns", function () {
            const stub = createStub();
            stub.rejects(2).returns(1);

            assert.equals(stub(), 1);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().resolves(2);
            const reason = new Error();
            const stub = createStub().callsFake(fakeFn).rejects(reason);

            return stub()
                .then(function () {
                    referee.fail("this should not resolve");
                })
                .catch(function (actual) {
                    assert.same(actual, reason);
                    refute(fakeFn.called);
                });
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return Promise.resolve(1);
                },
            };
            const reason = new Error();
            const stub = createStub(obj, "fn").callThrough().rejects(reason);

            return stub()
                .then(function () {
                    referee.fail("this should not resolve");
                })
                .catch(function (actual) {
                    assert.same(actual, reason);
                });
        });

        it("does not invoke Promise.reject when the behavior is added to the stub", function () {
            const rejectSpy = createSpy(Promise, "reject");
            const stub = createStub();
            stub.rejects(2);

            assert.equals(rejectSpy.callCount, 0);
        });
    });

    describe(".resolvesThis", function () {
        before(function () {
            if (typeof Promise === "undefined") {
                this.skip();
            }
        });

        afterEach(function () {
            if (Promise.resolve.restore) {
                Promise.resolve.restore();
            }
        });

        it("returns a promise resolved with this", function () {
            const instance = {};
            instance.stub = createStub();
            instance.stub.resolvesThis();

            return instance.stub().then(function (actual) {
                assert.same(actual, instance);
            });
        });

        it("returns a promise resolved with the context bound with stub#call", function () {
            const stub = createStub();
            stub.resolvesThis();
            const object = {};

            return stub.call(object).then(function (actual) {
                assert.same(actual, object);
            });
        });

        it("returns a promise resolved with the context bound with stub#apply", function () {
            const stub = createStub();
            stub.resolvesThis();
            const object = {};

            return stub.apply(object).then(function (actual) {
                assert.same(actual, object);
            });
        });

        it("returns the stub itself, allowing to chain function calls", function () {
            const stub = createStub();

            assert.same(stub.resolvesThis(), stub);
        });

        it("overrides throws behavior for error objects", function () {
            const instance = {};
            instance.stub = createStub().throws(new Error()).resolvesThis();

            return instance.stub().then(function (actual) {
                assert.same(actual, instance);
            });
        });

        it("overrides throws behavior for dynamically created errors", function () {
            const instance = {};
            instance.stub = createStub().throws().resolvesThis();

            return instance.stub().then(function (actual) {
                assert.same(actual, instance);
            });
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return Promise.resolve(1);
                },
            };
            createStub(obj, "fn").callThrough().resolvesThis();

            return obj.fn().then(function (actual) {
                assert.same(actual, obj);
            });
        });

        it("supersedes previous callsFake", function () {
            const fakeInstance = {};
            const fakeFn = createStub().resolves(fakeInstance);
            const instance = {};
            instance.stub = createStub().callsFake(fakeFn).resolvesThis();

            return instance.stub().then(function (actual) {
                assert.same(actual, instance);
                refute(fakeFn.called);
            });
        });
    });

    describe(".resolvesArg", function () {
        before(function () {
            if (typeof Promise === "undefined") {
                this.skip();
            }
        });

        afterEach(function () {
            if (Promise.resolve.restore) {
                Promise.resolve.restore();
            }
        });

        it("returns a promise to the argument at specified index", function () {
            const stub = createStub();
            const object = {};
            stub.resolvesArg(0);

            return stub(object).then(function (actual) {
                assert.same(actual, object);
            });
        });

        it("returns a promise to the argument at another specified index", function () {
            const stub = createStub();
            const object = {};
            stub.resolvesArg(2);

            return stub("ignored", "ignored again", object).then(
                function (actual) {
                    assert.same(actual, object);
                },
            );
        });

        it("should return the same stub", function () {
            const stub = createStub();

            assert.same(stub.resolvesArg(1), stub);
        });

        it("supersedes previous throws", function () {
            const stub = createStub();
            stub.throws().resolvesArg(1);

            refute.exception(function () {
                stub("zero", "one");
            });
        });

        it("supersedes previous rejects", function () {
            const stub = createStub();
            stub.rejects(Error("should be superseded")).resolvesArg(1);

            return stub("zero", "one").then(function (actual) {
                assert.same(actual, "one");
            });
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().resolves("fake");
            const stub = createStub().callsFake(fakeFn).resolvesArg(1);

            return stub("zero", "one").then(function (actual) {
                assert.same(actual, "one");
                refute(fakeFn.called);
            });
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return Promise.resolve("nooooo");
                },
            };
            createStub(obj, "fn").callThrough().resolvesArg(1);

            return obj.fn("zero", "one").then(function (actual) {
                assert.same(actual, "one");
            });
        });

        it("does not invoke Promise.resolve when the behavior is added to the stub", function () {
            const resolveSpy = createSpy(Promise, "resolve");
            const stub = createStub();
            stub.resolvesArg(2);

            assert(resolveSpy.notCalled);
        });

        it("throws if index is not a number", function () {
            const stub = createStub();

            assert.exception(
                function () {
                    stub.resolvesArg();
                },
                { name: "TypeError" },
            );
        });

        it("throws without enough arguments", function () {
            const stub = createStub();
            stub.resolvesArg(3);

            assert.exception(
                function () {
                    stub("zero", "one", "two");
                },
                {
                    name: "TypeError",
                    message:
                        "resolvesArg failed: 4 arguments required but only 3 present",
                },
            );
        });
    });

    describe(".returnsArg", function () {
        it("returns argument at specified index", function () {
            const stub = createStub();
            stub.returnsArg(0);
            const object = {};

            assert.same(stub(object), object);
        });

        it("returns stub", function () {
            const stub = createStub();

            assert.same(stub.returnsArg(0), stub);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().returns("fake");
            const stub = createStub().callsFake(fakeFn).returnsArg(0);

            assert.equals(stub("myarg"), "myarg");
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };
            createStub(obj, "fn").callThrough().returnsArg(0);

            assert.equals(obj.fn("myarg"), "myarg");
        });

        it("throws if no index is specified", function () {
            const stub = createStub();

            assert.exception(
                function () {
                    stub.returnsArg();
                },
                { name: "TypeError" },
            );
        });

        it("should throw without enough arguments", function () {
            const stub = createStub();
            stub.returnsArg(3);

            assert.exception(
                function () {
                    stub("only", "two arguments");
                },
                {
                    name: "TypeError",
                    message:
                        "returnsArg failed: 4 arguments required but only 2 present",
                },
            );
        });
    });

    describe(".throwsArg", function () {
        it("throws argument at specified index", function () {
            const stub = createStub();
            stub.throwsArg(0);
            const expectedError = new Error("The expected error message");

            assert.exception(
                function () {
                    stub(expectedError);
                },
                function (err) {
                    return err.message === expectedError.message;
                },
            );
        });

        it("returns stub", function () {
            const stub = createStub();

            assert.same(stub.throwsArg(0), stub);
        });

        it("throws TypeError if no index is specified", function () {
            const stub = createStub();

            assert.exception(
                function () {
                    stub.throwsArg();
                },
                { name: "TypeError" },
            );
        });

        it("should throw without enough arguments", function () {
            const stub = createStub();
            stub.throwsArg(3);

            assert.exception(
                function () {
                    stub("only", "two arguments");
                },
                {
                    name: "TypeError",
                    message:
                        "throwsArg failed: 4 arguments required but only 2 present",
                },
            );
        });

        it("should work with call-based behavior", function () {
            const stub = createStub();
            const expectedError = new Error("catpants");

            stub.returns(1);
            stub.onSecondCall().throwsArg(1);

            refute.exception(function () {
                assert.equals(1, stub(null, expectedError));
            });

            assert.exception(
                function () {
                    stub(null, expectedError);
                },
                function (error) {
                    return error.message === expectedError.message;
                },
            );
        });

        it("should be reset by .resetBehavior", function () {
            const stub = createStub();

            stub.throwsArg(0);
            stub.resetBehavior();

            refute.exception(function () {
                stub(new Error("catpants"));
            });
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub();
            const stub = createStub().callsFake(fakeFn).throwsArg(1);
            const expectedError = new Error("catpants");

            assert.exception(
                function () {
                    stub(null, expectedError);
                },
                function (error) {
                    return error.message === expectedError.message;
                },
            );

            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };
            createStub(obj, "fn").callThrough().throwsArg(1);
            const expectedError = new Error("catpants");

            assert.exception(
                function () {
                    obj.fn(null, expectedError);
                },
                function (error) {
                    return error.message === expectedError.message;
                },
            );
        });
    });

    describe(".returnsThis", function () {
        it("stub returns this", function () {
            const instance = {};
            instance.stub = createStub();
            instance.stub.returnsThis();

            assert.same(instance.stub(), instance);
        });

        it("stub returns undefined when detached", function () {
            const thisValue = (function () {
                return this;
            })();

            if (thisValue !== undefined) {
                this.skip();
            }

            const stub = createStub();
            stub.returnsThis();

            // Due to strict mode, would be `global` otherwise
            assert.same(stub(), undefined);
        });

        it("stub respects call/apply", function () {
            const stub = createStub();
            stub.returnsThis();
            const object = {};

            assert.same(stub.call(object), object);
            assert.same(stub.apply(object), object);
        });

        it("returns stub", function () {
            const stub = createStub();

            assert.same(stub.returnsThis(), stub);
        });

        it("supersedes previous callsFake", function () {
            const fakeInstance = {};
            const fakeFn = createStub().returns(fakeInstance);

            const instance = {};
            instance.stub = createStub();
            instance.stub.callsFake(fakeFn).returnsThis();

            assert.same(instance.stub(), instance);
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };
            createStub(obj, "fn").callThrough().returnsThis();

            assert.same(obj.fn(), obj);
        });
    });

    describe(".usingPromise", function () {
        before(function () {
            if (typeof Promise === "undefined") {
                this.skip();
            }
        });

        it("should exist and be a function", function () {
            const stub = createStub();

            assert(stub.usingPromise);
            assert.isFunction(stub.usingPromise);
        });

        it("should return the current stub", function () {
            const stub = createStub();

            assert.same(stub.usingPromise(Promise), stub);
        });

        it("should set the promise used by resolve", function () {
            const stub = createStub();
            const promise = {
                resolve: createStub().callsFake(function (value) {
                    return Promise.resolve(value);
                }),
            };
            const object = {};

            stub.usingPromise(promise).resolves(object);

            return stub().then(function (actual) {
                assert.same(actual, object, "Same object resolved");
                assert.isTrue(
                    promise.resolve.calledOnce,
                    "Custom promise resolve called once",
                );
                assert.isTrue(
                    promise.resolve.calledWith(object),
                    "Custom promise resolve called once with expected",
                );
            });
        });

        it("should set the promise used by reject", function () {
            const stub = createStub();
            const promise = {
                reject: createStub().callsFake(function (err) {
                    return Promise.reject(err);
                }),
            };
            const reason = new Error();

            stub.usingPromise(promise).rejects(reason);

            return stub()
                .then(function () {
                    referee.fail("this should not resolve");
                })
                .catch(function (actual) {
                    assert.same(actual, reason, "Same object resolved");
                    assert.isTrue(
                        promise.reject.calledOnce,
                        "Custom promise reject called once",
                    );
                    assert.isTrue(
                        promise.reject.calledWith(reason),
                        "Custom promise reject called once with expected",
                    );
                });
        });
    });

    describe(".throws", function () {
        it("throws specified exception", function () {
            const stub = createStub();
            const error = new Error();
            stub.throws(error);

            assert.exception(stub, error);
        });

        it("returns stub", function () {
            const stub = createStub();

            assert.same(stub.throws({}), stub);
        });

        it("sets type of exception to throw", function () {
            const stub = createStub();
            const exceptionType = "TypeError";
            stub.throws(exceptionType);

            assert.exception(function () {
                stub();
            }, exceptionType);
        });

        it("specifies exception message", function () {
            const stub = createStub();
            const message = "Oh no!";
            stub.throws("Error", message);

            assert.exception(stub, {
                message: message,
            });
        });

        it("does not specify exception message if not provided", function () {
            const stub = createStub();
            stub.throws("Error");

            assert.exception(stub, {
                message: "",
            });
        });

        it("throws generic error", function () {
            const stub = createStub();
            stub.throws();

            assert.exception(stub, "Error");
        });

        it("throws an exception created using a function", function () {
            const stub = createStub();

            stub.throws(function () {
                return new Error("not implemented");
            });

            assert.exception(stub, {
                message: "not implemented",
            });
            assert.same(stub.firstCall.exception.message, "not implemented");
            assert.contains(stub.firstCall.toString(), "not implemented");
        });

        it("creates a non empty error message when error is a string and no message is passed", function () {
            const stub = createStub();

            stub.withArgs(1).throws("TypeError");

            assert.exception(
                function () {
                    stub(1);
                },
                {
                    message: "Sinon-provided TypeError",
                },
            );
        });

        describe("lazy instantiation of exceptions", function () {
            let errorSpy;

            beforeEach(function () {
                this.originalError = globalContext.Error;
                errorSpy = createSpy(globalContext, "Error");
                // errorSpy starts with a call already made, not sure why
                errorSpy.resetHistory();
            });

            afterEach(function () {
                errorSpy.restore();
                globalContext.Error = this.originalError;
            });

            it("uses a lazily created exception for the generic error", function () {
                const stub = createStub();
                stub.throws();

                assert.isFalse(errorSpy.called);
                assert.exception(stub, "Error");
                assert.isTrue(errorSpy.called);
            });

            it("uses a lazily created exception for the named error", function () {
                const stub = createStub();
                stub.throws("Named Error", "error message");

                assert.isFalse(errorSpy.called);
                assert.exception(stub, {
                    name: "Named Error",
                    message: "error message",
                });
                assert.isTrue(errorSpy.called);
            });

            it("uses a lazily created exception provided by a function", function () {
                const stub = createStub();

                stub.throws(function () {
                    return new Error("not implemented");
                });

                assert.isFalse(errorSpy.called);
                assert.exception(stub, {
                    message: "not implemented",
                });
                assert.isTrue(errorSpy.called);
            });

            it("does not use a lazily created exception if the error object is provided", function () {
                const stub = createStub();
                const exception = new Error();
                stub.throws(exception);

                assert.same(errorSpy.callCount, 1);
                assert.exception(stub, exception);
                assert.same(errorSpy.callCount, 1);
            });
        });

        it("resets 'invoking' flag", function () {
            const stub = createStub();
            stub.throws();

            assert.exception(stub);

            assert.isUndefined(stub.invoking);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub();
            const expectedError = new Error("error");
            const stub = createStub().callsFake(fakeFn).throws(expectedError);

            assert.exception(stub, {
                message: expectedError.message,
            });
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };
            const expectedError = new Error("catpants");
            createStub(obj, "fn").callThrough().throws(expectedError);

            assert.exception(obj.fn, {
                message: expectedError.message,
            });
        });
    });

    describe(".callsArg", function () {
        beforeEach(function () {
            this.stub = createStub();
        });

        it("calls argument at specified index", function () {
            this.stub.callsArg(2);
            const callback = createStub();

            this.stub(1, 2, callback);

            assert(callback.called);
        });

        it("returns stub", function () {
            assert.isFunction(this.stub.callsArg(2));
        });

        it("throws if argument at specified index is not callable", function () {
            this.stub.callsArg(0);

            assert.exception(
                function () {
                    this.stub(1);
                },
                { name: "TypeError" },
            );
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArg();
                },
                { name: "TypeError" },
            );
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArg({});
                },
                { name: "TypeError" },
            );
        });

        it("should throw without enough arguments", function () {
            const stub = createStub();
            stub.callsArg(3);

            assert.exception(
                function () {
                    stub("only", "two arguments");
                },
                {
                    name: "TypeError",
                    message:
                        "callsArg failed: 4 arguments required but only 2 present",
                },
            );
        });

        it("returns result of invocant", function () {
            const stub = this.stub.callsArg(0);
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };
            const stub = createStub(obj, "fn").callThrough().callsArg(0);

            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
        });
    });

    describe(".callsArgWith", function () {
        beforeEach(function () {
            this.stub = createStub();
        });

        it("calls argument at specified index with provided args", function () {
            const object = {};
            this.stub.callsArgWith(1, object);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object));
        });

        it("returns function", function () {
            const stub = this.stub.callsArgWith(2, 3);

            assert.isFunction(stub);
        });

        it("calls callback without args", function () {
            this.stub.callsArgWith(1);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith());
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            this.stub.callsArgWith(1, object, array);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object, array));
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArgWith();
                },
                { name: "TypeError" },
            );
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArgWith({});
                },
                { name: "TypeError" },
            );
        });

        it("returns result of invocant", function () {
            const stub = this.stub.callsArgWith(0, "test");
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };
            const stub = createStub(obj, "fn")
                .callThrough()
                .callsArgWith(0, "test");
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
        });
    });

    describe(".callsArgOn", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = {
                foo: "bar",
            };
        });

        it("calls argument at specified index", function () {
            this.stub.callsArgOn(2, this.fakeContext);
            const callback = createStub();

            this.stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(this.fakeContext));
        });

        it("calls argument at specified index with undefined context", function () {
            this.stub.callsArgOn(2, undefined);
            const callback = createStub();

            this.stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with number context", function () {
            this.stub.callsArgOn(2, 5);
            const callback = createStub();

            this.stub(1, 2, callback);

            assert(callback.called);
            assert(callback.calledOn(5));
        });

        it("returns stub", function () {
            const stub = this.stub.callsArgOn(2, this.fakeContext);

            assert.isFunction(stub);
        });

        it("throws if argument at specified index is not callable", function () {
            this.stub.callsArgOn(0, this.fakeContext);

            assert.exception(
                function () {
                    this.stub(1);
                },
                { name: "TypeError" },
            );
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArgOn();
                },
                { name: "TypeError" },
            );
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArgOn(this.fakeContext, 2);
                },
                { name: "TypeError" },
            );
        });

        it("returns result of invocant", function () {
            const stub = this.stub.callsArgOn(0, this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };
            createStub(obj, "fn").callThrough().callsArgOn(0, this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(obj.fn(callback), "return value");
            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
        });
    });

    describe(".callsArgOnWith", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = { foo: "bar" };
        });

        it("calls argument at specified index with provided args", function () {
            const object = {};
            this.stub.callsArgOnWith(1, this.fakeContext, object);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(this.fakeContext));
        });

        it("calls argument at specified index with provided args and undefined context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, undefined, object);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with provided args and number context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, 5, object);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(5));
        });

        it("calls argument at specified index with provided args with undefined context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, undefined, object);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(undefined));
        });

        it("calls argument at specified index with provided args with number context", function () {
            const object = {};
            this.stub.callsArgOnWith(1, 5, object);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object));
            assert(callback.calledOn(5));
        });

        it("returns function", function () {
            const stub = this.stub.callsArgOnWith(2, this.fakeContext, 3);

            assert.isFunction(stub);
        });

        it("calls callback without args", function () {
            this.stub.callsArgOnWith(1, this.fakeContext);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith());
            assert(callback.calledOn(this.fakeContext));
        });

        it("calls callback with multiple args", function () {
            const object = {};
            const array = [];
            this.stub.callsArgOnWith(1, this.fakeContext, object, array);
            const callback = createStub();

            this.stub(1, callback);

            assert(callback.calledWith(object, array));
            assert(callback.calledOn(this.fakeContext));
        });

        it("throws if no index is specified", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArgOnWith();
                },
                { name: "TypeError" },
            );
        });

        it("throws if index is not number", function () {
            const stub = this.stub;

            assert.exception(
                function () {
                    stub.callsArgOnWith({});
                },
                { name: "TypeError" },
            );
        });

        it("returns result of invocant", function () {
            const object = {};
            const stub = this.stub.callsArgOnWith(0, this.fakeContext, object);
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
            assert(callback.calledWith(object));
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };

            const arg = "hello";
            createStub(obj, "fn")
                .callThrough()
                .callsArgOnWith(1, this.fakeContext, arg);
            const callback = createStub();

            obj.fn(1, callback);

            assert(callback.calledWith(arg));
            assert(callback.calledOn(this.fakeContext));
        });
    });

    describe(".callsFake", function () {
        beforeEach(function () {
            this.method = function () {
                throw new Error("Should be stubbed");
            };
            this.object = { method: this.method };
        });

        it("uses provided function as stub", function () {
            const fakeFn = createStub();
            this.stub = createStub(this.object, "method");

            this.stub.callsFake(fakeFn);
            this.object.method(1, 2);

            assert(fakeFn.calledWith(1, 2));
            assert(fakeFn.calledOn(this.object));
        });

        it("is overwritten by subsequent stub behavior", function () {
            const fakeFn = createStub();
            this.stub = createStub(this.object, "method");

            this.stub.callsFake(fakeFn).returns(3);
            const returned = this.object.method(1, 2);

            refute(fakeFn.called);
            assert(returned === 3);
        });

        it("supersedes previous throws(error)", function () {
            const fakeFn = createStub().returns(5);
            this.stub = createStub(this.object, "method");

            this.stub.throws(new Error("error")).callsFake(fakeFn);
            const returned = this.object.method(1, 2);

            assert(fakeFn.called);
            assert(returned === 5);
        });

        it("supersedes previous throws()", function () {
            const fakeFn = createStub().returns(5);
            this.stub = createStub(this.object, "method");

            this.stub.throws().callsFake(fakeFn);
            const returned = this.object.method(1, 2);

            assert(fakeFn.called);
            assert(returned === 5);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return "nooooo";
                },
            };

            createStub(obj, "fn")
                .callThrough()
                .callsFake(() => "yeees");

            assert.same(obj.fn(), "yeees");
        });
    });

    describe(".objectMethod", function () {
        beforeEach(function () {
            this.method = function () {
                return;
            };
            this.object = { method: this.method };
        });

        afterEach(function () {
            if (globalContext.console.info.restore) {
                globalContext.console.info.restore();
            }
        });

        it("throws when third argument is provided", function () {
            const object = this.object;

            assert.exception(
                function () {
                    createStub(object, "method", 1);
                },
                {
                    message:
                        "stub(obj, 'meth', fn) has been removed, see documentation",
                },
                { name: "TypeError" },
            );
        });

        it("stubbed method should be proper stub", function () {
            const stub = createStub(this.object, "method");

            assert.isFunction(stub.returns);
            assert.isFunction(stub.throws);
        });

        it("stub should be spy", function () {
            const stub = createStub(this.object, "method");
            this.object.method();

            assert(stub.called);
            assert(stub.calledOn(this.object));
        });

        it("stub should affect spy", function () {
            const stub = createStub(this.object, "method");
            stub.throws("TypeError");

            assert.exception(this.object.method);

            assert(stub.threw("TypeError"));
        });

        it("handles threw properly for lazily instantiated Errors", function () {
            const stub = createStub(this.object, "method");
            stub.throws(function () {
                return new TypeError();
            });

            assert.exception(this.object.method);

            assert(stub.threw("TypeError"));
        });

        it("returns standalone stub without arguments", function () {
            const stub = createStub();

            assert.isFunction(stub);
            assert.isFalse(stub.called);
        });

        it("successfully stubs falsy properties", function () {
            const obj = {
                0: function () {
                    return;
                },
            };

            createStub(obj, 0).callsFake(function () {
                return "stubbed value";
            });

            assert.equals(obj[0](), "stubbed value");
        });

        it("does not stub string", function () {
            assert.exception(function () {
                createStub("test");
            });
        });
    });

    describe("everything", function () {
        // eslint-disable-next-line mocha/no-setup-in-describe
        require("./shared-spy-stub-everything-tests")(createStub);

        it("returns function", function () {
            const func = function () {
                return;
            };

            assert.same(createStub(func), func);
        });

        it("stubs methods of function", function () {
            class FunctionType extends Function {
                func2() {
                    return 42;
                }
            }

            const func = new FunctionType();
            func.func1 = function () {
                return;
            };

            createStub(func);

            assert.isFunction(func.func1.restore);
            assert.isFunction(func.func2.restore);
        });

        it("does not call getter during restore", function () {
            const obj = {
                get prop() {
                    fail("should not call getter");
                    return;
                },
            };

            const stub = createStub(obj, "prop").get(function () {
                return 43;
            });
            assert.equals(obj.prop, 43);

            stub.restore();
        });
    });

    describe("stubbed function", function () {
        it("has toString method", function () {
            const obj = {
                meth: function () {
                    return;
                },
            };
            createStub(obj, "meth");

            assert.equals(obj.meth.toString(), "meth");
        });

        it("toString should say 'stub' when unable to infer name", function () {
            const stub = createStub();

            assert.equals(stub.toString(), "stub");
        });

        it("toString should prefer property name if possible", function () {
            const obj = {};
            obj.meth = createStub();
            obj.meth();

            assert.equals(obj.meth.toString(), "meth");
        });
    });

    describe(".yields", function () {
        it("invokes only argument as callback", function () {
            const stub = createStub().yields();
            const spy = createSpy();
            stub(spy);

            assert(spy.calledOnce);
            assert.equals(spy.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const stub = createStub().yields();

            assert.exception(stub, {
                message: "stub expected to yield, but no callback was passed.",
            });
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = {
                somethingAwesome: function () {
                    return;
                },
            };
            const stub = createStub(myObj, "somethingAwesome").yields();

            assert.exception(
                function () {
                    stub(23, 42);
                },
                {
                    message:
                        "somethingAwesome expected to yield, but no callback was passed. Received [23, 42]",
                },
            );
        });

        it("invokes last argument as callback", function () {
            const stub = createStub().yields();
            const spy = createSpy();
            stub(24, {}, spy);

            assert(spy.calledOnce);
            assert.equals(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", function () {
            const stub = createStub().yields();
            const spy = createSpy();
            const spy2 = createSpy();
            stub(24, {}, spy, spy2);

            assert(spy.calledOnce);
            assert(!spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const stub = createStub().yields(obj, "Crazy");
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const stub = createStub().yields(obj, "Crazy");
            const callback = createStub().throws();

            assert.exception(function () {
                stub(callback);
            });
        });

        it("throws takes precedent over yielded return value", function () {
            const stub = createStub().throws().yields();
            const callback = createStub().returns("return value");

            assert.exception(function () {
                stub(callback);
            });
            assert(callback.calledOnce);
        });

        it("returns takes precedent over yielded return value", function () {
            const obj = {};
            const stub = createStub().returns(obj).yields();
            const callback = createStub().returns("return value");

            assert.same(stub(callback), obj);
            assert(callback.calledOnce);
        });

        it("returnsArg takes precedent over yielded return value", function () {
            const stub = createStub().returnsArg(0).yields();
            const callback = createStub().returns("return value");

            assert.same(stub(callback), callback);
            assert(callback.calledOnce);
        });

        it("returnsThis takes precedent over yielded return value", function () {
            const obj = {};
            const stub = createStub().returnsThis().yields();
            const callback = createStub().returns("return value");

            assert.same(stub.call(obj, callback), obj);
            assert(callback.calledOnce);
        });

        it("returns the result of the yielded callback", function () {
            const stub = createStub().yields();
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().yields(1);
            const stub = createStub().callsFake(fakeFn).yields(2);
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith, 2);
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return 1;
                },
            };

            createStub(obj, "fn").callThrough().yields(2);
            const spy = createSpy();
            obj.fn(spy);

            assert(spy.calledWith, 2);
        });
    });

    describe(".yieldsRight", function () {
        it("invokes only argument as callback", function () {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            stub(spy);

            assert(spy.calledOnce);
            assert.equals(spy.args[0].length, 0);
        });

        it("throws understandable error if no callback is passed", function () {
            const stub = createStub().yieldsRight();

            assert.exception(stub, {
                message: "stub expected to yield, but no callback was passed.",
            });
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = {
                somethingAwesome: function () {
                    return;
                },
            };
            const stub = createStub(myObj, "somethingAwesome").yieldsRight();

            assert.exception(
                function () {
                    stub(23, 42);
                },
                {
                    message:
                        "somethingAwesome expected to yield, but no callback was passed. Received [23, 42]",
                },
            );
        });

        it("invokes last argument as callback", function () {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            stub(24, {}, spy);

            assert(spy.calledOnce);
            assert.equals(spy.args[0].length, 0);
        });

        it("invokes the last of two callbacks", function () {
            const stub = createStub().yieldsRight();
            const spy = createSpy();
            const spy2 = createSpy();
            stub(24, {}, spy, spy2);

            assert(!spy.called);
            assert(spy2.calledOnce);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsRight(obj, "Crazy");
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsRight(obj, "Crazy");
            const callback = createStub().throws();

            assert.exception(function () {
                stub(callback);
            });
        });

        it("throws takes precedent over yielded return value", function () {
            const stub = createStub().yieldsRight().throws();
            const callback = createStub().returns("return value");

            assert.exception(function () {
                stub(callback);
            });
            assert(callback.calledOnce);
        });

        it("returns takes precedent over yielded return value", function () {
            const obj = {};
            const stub = createStub().returns(obj).yieldsRight();
            const callback = createStub().returns("return value");

            assert.same(stub(callback), obj);
            assert(callback.calledOnce);
        });

        it("returnsArg takes precedent over yielded return value", function () {
            const stub = createStub().returnsArg(0).yieldsRight();
            const callback = createStub().returns("return value");

            assert.same(stub(callback), callback);
            assert(callback.calledOnce);
        });

        it("returnsThis takes precedent over yielded return value", function () {
            const obj = {};
            const stub = createStub().returnsThis().yieldsRight();
            const callback = createStub().returns("return value");

            assert.same(stub.call(obj, callback), obj);
            assert(callback.calledOnce);
        });

        it("returns the result of the yielded callback", function () {
            const stub = createStub().yields();
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().yieldsRight(1);
            const stub = createStub().callsFake(fakeFn).yieldsRight(2);
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith, 2);
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return 1;
                },
            };

            createStub(obj, "fn").callThrough().yieldsRight(2);
            const spy = createSpy();
            obj.fn(spy);

            assert(spy.calledWith, 2);
        });
    });

    describe(".yieldsOn", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = { foo: "bar" };
        });

        it("invokes only argument as callback", function () {
            const spy = createSpy();

            this.stub.yieldsOn(this.fakeContext);
            this.stub(spy);

            assert(spy.calledOnce);
            assert(spy.calledOn(this.fakeContext));
            assert.equals(spy.args[0].length, 0);
        });

        it("throws if no context is specified", function () {
            assert.exception(
                function () {
                    this.stub.yieldsOn();
                },
                { name: "TypeError" },
            );
        });

        it("throws understandable error if no callback is passed", function () {
            this.stub.yieldsOn(this.fakeContext);

            assert.exception(this.stub, {
                message: "stub expected to yield, but no callback was passed.",
            });
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = {
                somethingAwesome: function () {
                    return;
                },
            };
            const stub = createStub(myObj, "somethingAwesome").yieldsOn(
                this.fakeContext,
            );

            assert.exception(
                function () {
                    stub(23, 42);
                },
                {
                    message:
                        "somethingAwesome expected to yield, but no callback was passed. Received [23, 42]",
                },
            );
        });

        it("invokes last argument as callback", function () {
            const spy = createSpy();
            this.stub.yieldsOn(this.fakeContext);

            this.stub(24, {}, spy);

            assert(spy.calledOnce);
            assert(spy.calledOn(this.fakeContext));
            assert.equals(spy.args[0].length, 0);
        });

        it("invokes first of two callbacks", function () {
            const spy = createSpy();
            const spy2 = createSpy();

            this.stub.yieldsOn(this.fakeContext);
            this.stub(24, {}, spy, spy2);

            assert(spy.calledOnce);
            assert(spy.calledOn(this.fakeContext));
            assert(!spy2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const spy = createSpy();

            this.stub.yieldsOn(this.fakeContext, obj, "Crazy");
            this.stub(spy);

            assert(spy.calledWith(obj, "Crazy"));
            assert(spy.calledOn(this.fakeContext));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const callback = createStub().throws();

            this.stub.yieldsOn(this.fakeContext, obj, "Crazy");

            assert.exception(function () {
                this.stub(callback);
            });
        });

        it("throws takes precedent over yielded return value", function () {
            const stub = this.stub.throws().yieldsOn(this.fakeContext);
            const callback = createStub().returns("return value");

            assert.exception(function () {
                stub(callback);
            });
            assert(callback.calledOnce);
        });

        it("returns takes precedent over yielded return value", function () {
            const obj = {};
            const stub = this.stub.returns(obj).yieldsOn(this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(stub(callback), obj);
            assert(callback.calledOnce);
        });

        it("returnsArg takes precedent over yielded return value", function () {
            const stub = this.stub.returnsArg(0).yieldsOn();
            const callback = createStub().returns("return value");

            assert.same(stub(callback), callback);
            assert(callback.calledOnce);
        });

        it("returnsThis takes precedent over yielded return value", function () {
            const obj = {};
            const stub = this.stub.returnsThis().yieldsOn(this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(stub.call(obj, callback), obj);
            assert(callback.calledOnce);
        });

        it("returns the result of the yielded callback", function () {
            const stub = this.stub.yieldsOn(this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(stub(callback), "return value");
            assert(callback.calledOnce);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().yieldsOn(this.fakeContext, 1);
            const stub = createStub()
                .callsFake(fakeFn)
                .yieldsOn(this.fakeContext, 2);
            const spy = createSpy();
            stub(spy);

            assert(spy.calledWith, 2);
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return 1;
                },
            };

            createStub(obj, "fn").callThrough().yieldsOn(this.fakeContext, 2);
            const spy = createSpy();
            obj.fn(spy);

            assert(spy.calledWith, 2);
        });
    });

    describe(".yieldsTo", function () {
        it("yields to property of object argument", function () {
            const stub = createStub().yieldsTo("success");
            const callback = createSpy();

            stub({ success: callback });

            assert(callback.calledOnce);
            assert.equals(callback.args[0].length, 0);
        });

        it("throws understandable error if no object with callback is passed", function () {
            const stub = createStub().yieldsTo("success");

            assert.exception(stub, {
                message:
                    "stub expected to yield to 'success', but no object with such a property was passed.",
            });
        });

        it("throws understandable error if failing to yield callback by symbol", function () {
            if (typeof Symbol !== "function") {
                this.skip();
            }

            const symbol = Symbol("apple pie");

            const stub = createStub().yieldsTo(symbol);

            assert.exception(stub, {
                message:
                    "stub expected to yield to 'Symbol(apple pie)', but no object with such a property was passed.",
            });
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = {
                somethingAwesome: function () {
                    return;
                },
            };
            const stub = createStub(myObj, "somethingAwesome").yieldsTo(
                "success",
            );

            assert.exception(
                function () {
                    stub(23, 42);
                },
                {
                    message:
                        "somethingAwesome expected to yield to 'success', but " +
                        "no object with such a property was passed. " +
                        "Received [23, 42]",
                },
            );
        });

        it("invokes property on last argument as callback", function () {
            const stub = createStub().yieldsTo("success");
            const callback = createSpy();
            stub(24, {}, { success: callback });

            assert(callback.calledOnce);
            assert.equals(callback.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const stub = createStub().yieldsTo("error");
            const callback = createSpy();
            const callback2 = createSpy();
            stub(24, {}, { error: callback }, { error: callback2 });

            assert(callback.calledOnce);
            assert(!callback2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsTo("success", obj, "Crazy");
            const callback = createSpy();
            stub({ success: callback });

            assert(callback.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const stub = createStub().yieldsTo("error", obj, "Crazy");
            const callback = createStub().throws();

            assert.exception(function () {
                stub({ error: callback });
            });
        });

        it("throws takes precedent over yielded return value", function () {
            const stub = createStub().throws().yieldsTo("success");
            const callback = createStub().returns("return value");

            assert.exception(function () {
                stub({ success: callback });
            });
            assert(callback.calledOnce);
        });

        it("returns takes precedent over yielded return value", function () {
            const obj = {};
            const stub = createStub().returns(obj).yieldsTo("success");
            const callback = createStub().returns("return value");

            assert.same(stub({ success: callback }), obj);
            assert(callback.calledOnce);
        });

        it("returnsArg takes precedent over yielded return value", function () {
            const stub = createStub().returnsArg(0).yieldsTo("success");
            const callback = createStub().returns("return value");

            assert.equals(stub({ success: callback }), { success: callback });
            assert(callback.calledOnce);
        });

        it("returnsThis takes precedent over yielded return value", function () {
            const obj = {};
            const stub = createStub().returnsThis().yieldsTo("success");
            const callback = createStub().returns("return value");

            assert.same(stub.call(obj, { success: callback }), obj);
            assert(callback.calledOnce);
        });

        it("returns the result of the yielded callback", function () {
            const stub = createStub().yieldsTo("success");
            const callback = createStub().returns("return value");

            assert.same(stub({ success: callback }), "return value");
            assert(callback.calledOnce);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().yieldsTo("success", 1);
            const stub = createStub().callsFake(fakeFn).yieldsTo("success", 2);
            const callback = createSpy();
            stub({ success: callback });

            assert(callback.calledWith(2));
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return 1;
                },
            };

            createStub(obj, "fn").callThrough().yieldsTo("success", 2);
            const callback = createSpy();
            obj.fn({ success: callback });

            assert(callback.calledWith, 2);
        });
    });

    describe(".yieldsToOn", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = { foo: "bar" };
        });

        it("yields to property of object argument", function () {
            this.stub.yieldsToOn("success", this.fakeContext);
            const callback = createSpy();

            this.stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
            assert.equals(callback.args[0].length, 0);
        });

        it("yields to property of object argument with undefined context", function () {
            this.stub.yieldsToOn("success", undefined);
            const callback = createSpy();

            this.stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(undefined));
            assert.equals(callback.args[0].length, 0);
        });

        it("yields to property of object argument with number context", function () {
            this.stub.yieldsToOn("success", 5);
            const callback = createSpy();

            this.stub({ success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(5));
            assert.equals(callback.args[0].length, 0);
        });

        it("throws understandable error if no object with callback is passed", function () {
            this.stub.yieldsToOn("success", this.fakeContext);

            assert.exception(this.stub, {
                message:
                    "stub expected to yield to 'success', but no object with such a property was passed.",
            });
        });

        it("includes stub name and actual arguments in error", function () {
            const myObj = {
                somethingAwesome: function () {
                    return;
                },
            };
            const stub = createStub(myObj, "somethingAwesome").yieldsToOn(
                "success",
                this.fakeContext,
            );

            assert.exception(
                function () {
                    stub(23, 42);
                },
                {
                    message:
                        "somethingAwesome expected to yield to 'success', but " +
                        "no object with such a property was passed. " +
                        "Received [23, 42]",
                },
            );
        });

        it("invokes property on last argument as callback", function () {
            const callback = createSpy();

            this.stub.yieldsToOn("success", this.fakeContext);
            this.stub(24, {}, { success: callback });

            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
            assert.equals(callback.args[0].length, 0);
        });

        it("invokes first of two possible callbacks", function () {
            const callback = createSpy();
            const callback2 = createSpy();

            this.stub.yieldsToOn("error", this.fakeContext);
            this.stub(24, {}, { error: callback }, { error: callback2 });

            assert(callback.calledOnce);
            assert(callback.calledOn(this.fakeContext));
            assert(!callback2.called);
        });

        it("invokes callback with arguments", function () {
            const obj = { id: 42 };
            const callback = createSpy();

            this.stub.yieldsToOn("success", this.fakeContext, obj, "Crazy");
            this.stub({ success: callback });

            assert(callback.calledOn(this.fakeContext));
            assert(callback.calledWith(obj, "Crazy"));
        });

        it("throws if callback throws", function () {
            const obj = { id: 42 };
            const callback = createStub().throws();

            this.stub.yieldsToOn("error", this.fakeContext, obj, "Crazy");

            assert.exception(function () {
                this.stub({ error: callback });
            });
        });

        it("throws takes precedent over yielded return value", function () {
            const stub = this.stub
                .throws()
                .yieldsToOn("success", this.fakeContext);
            const callback = createStub().returns("return value");

            assert.exception(function () {
                stub({ success: callback });
            });
            assert(callback.calledOnce);
        });

        it("returns takes precedent over yielded return value", function () {
            const obj = {};
            const stub = this.stub
                .returns(obj)
                .yieldsToOn("success", this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(stub({ success: callback }), obj);
            assert(callback.calledOnce);
        });

        it("returnsArg takes precedent over yielded return value", function () {
            const stub = this.stub
                .returnsArg(0)
                .yieldsToOn("success", this.fakeContext);
            const callback = createStub().returns("return value");

            assert.equals(stub({ success: callback }), { success: callback });
            assert(callback.calledOnce);
        });

        it("returnsThis takes precedent over yielded return value", function () {
            const obj = {};
            const stub = this.stub
                .returnsThis()
                .yieldsToOn("success", this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(stub.call(obj, { success: callback }), obj);
            assert(callback.calledOnce);
        });

        it("returns the result of the yielded callback", function () {
            const stub = this.stub.yieldsToOn("success", this.fakeContext);
            const callback = createStub().returns("return value");

            assert.same(stub({ success: callback }), "return value");
            assert(callback.calledOnce);
        });

        it("supersedes previous callsFake", function () {
            const fakeFn = createStub().yieldsToOn(
                "success",
                this.fakeContext,
                1,
            );
            const stub = createStub()
                .callsFake(fakeFn)
                .yieldsToOn("success", this.fakeContext, 2);
            const callback = createSpy();
            stub({ success: callback });

            assert(callback.calledWith(2));
            refute(fakeFn.called);
        });

        it("supersedes previous callThrough", function () {
            const obj = {
                fn() {
                    return 1;
                },
            };

            createStub(obj, "fn")
                .callThrough()
                .yieldsToOn("success", this.fakeContext, 2);
            const callback = createSpy();
            obj.fn({ success: callback });

            assert(callback.calledWith(2));
        });
    });

    describe(".withArgs", function () {
        it("defines withArgs method", function () {
            const stub = createStub();

            assert.isFunction(stub.withArgs);
        });

        it("creates filtered stub", function () {
            const stub = createStub();
            const other = stub.withArgs(23);

            refute.same(other, stub);
            assert.isFunction(stub.returns);
            assert.isFunction(other.returns);
        });

        it("filters return values based on arguments", function () {
            const stub = createStub().returns(23);
            stub.withArgs(42).returns(99);

            assert.equals(stub(), 23);
            assert.equals(stub(42), 99);
        });

        it("filters exceptions based on arguments", function () {
            const stub = createStub().returns(23);
            stub.withArgs(42).throws();

            refute.exception(stub);
            assert.exception(function () {
                stub(42);
            });
        });

        it("ensure stub recognizes samsam match fuzzy arguments", function () {
            const stub = createStub().returns(23);
            stub.withArgs(match({ foo: "bar" })).returns(99);

            assert.equals(stub(), 23);
            assert.equals(stub({ foo: "bar", bar: "foo" }), 99);
        });

        it("ensure stub uses last matching arguments", function () {
            const unmatchedValue = "d3ada6a0-8dac-4136-956d-033b5f23eadf";
            const firstMatchedValue = "68128619-a639-4b32-a4a0-6519165bf301";
            const secondMatchedValue = "4ac2dc8f-3f3f-4648-9838-a2825fd94c9a";
            const expectedArgument = "3e1ed1ec-c377-4432-a33e-3c937f1406d1";

            const stub = createStub().returns(unmatchedValue);

            stub.withArgs(expectedArgument).returns(firstMatchedValue);
            stub.withArgs(expectedArgument).returns(secondMatchedValue);

            assert.equals(stub(), unmatchedValue);
            assert.equals(stub(expectedArgument), secondMatchedValue);
        });

        it("ensure stub uses last matching samsam match arguments", function () {
            const unmatchedValue = "0aa66a7d-3c50-49ef-8365-bdcab637b2dd";
            const firstMatchedValue = "1ab2c601-7602-4658-9377-3346f6814caa";
            const secondMatchedValue = "e2e31518-c4c4-4012-a61f-31942f603ffa";
            const expectedArgument = "90dc4a22-ef53-4c62-8e05-4cf4b4bf42fa";

            const stub = createStub().returns(unmatchedValue);
            stub.withArgs(expectedArgument).returns(firstMatchedValue);
            stub.withArgs(match(expectedArgument)).returns(secondMatchedValue);

            assert.equals(stub(), unmatchedValue);
            assert.equals(stub(expectedArgument), secondMatchedValue);
        });
    });

    describe(".callsArgAsync", function () {
        beforeEach(function () {
            this.stub = createStub();
        });

        it("asynchronously calls argument at specified index", function (done) {
            this.stub.callsArgAsync(2);
            const callback = createSpy(done);

            this.stub(1, 2, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgWithAsync", function () {
        beforeEach(function () {
            this.stub = createStub();
        });

        it("asynchronously calls callback at specified index with multiple args", function (done) {
            const object = {};
            const array = [];
            this.stub.callsArgWithAsync(1, object, array);

            const callback = createSpy(function () {
                assert(callback.calledWith(object, array));
                done();
            });

            this.stub(1, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgOnAsync", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = {
                foo: "bar",
            };
        });

        it("asynchronously calls argument at specified index with specified context", function (done) {
            const context = this.fakeContext;
            this.stub.callsArgOnAsync(2, context);

            const callback = createSpy(function () {
                assert(callback.calledOn(context));
                done();
            });

            this.stub(1, 2, callback);

            assert(!callback.called);
        });
    });

    describe(".callsArgOnWithAsync", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = { foo: "bar" };
        });

        it("asynchronously calls argument at specified index with provided context and args", function (done) {
            const object = {};
            const context = this.fakeContext;
            this.stub.callsArgOnWithAsync(1, context, object);

            const callback = createSpy(function () {
                assert(callback.calledOn(context));
                assert(callback.calledWith(object));
                done();
            });

            this.stub(1, callback);

            assert(!callback.called);
        });
    });

    describe(".yieldsAsync", function () {
        it("asynchronously invokes only argument as callback", function (done) {
            const stub = createStub().yieldsAsync();

            const spy = createSpy(done);

            stub(spy);

            assert(!spy.called);
        });
    });

    describe(".yieldsOnAsync", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = { foo: "bar" };
        });

        it("asynchronously invokes only argument as callback with given context", function (done) {
            const context = this.fakeContext;
            this.stub.yieldsOnAsync(context);

            const spy = createSpy(function () {
                assert(spy.calledOnce);
                assert(spy.calledOn(context));
                assert.equals(spy.args[0].length, 0);
                done();
            });

            this.stub(spy);

            assert(!spy.called);
        });
    });

    describe(".yieldsToAsync", function () {
        it("asynchronously yields to property of object argument", function (done) {
            const stub = createStub().yieldsToAsync("success");

            const callback = createSpy(function () {
                assert(callback.calledOnce);
                assert.equals(callback.args[0].length, 0);
                done();
            });

            stub({ success: callback });

            assert(!callback.called);
        });
    });

    describe(".yieldsToOnAsync", function () {
        beforeEach(function () {
            this.stub = createStub();
            this.fakeContext = { foo: "bar" };
        });

        it("asynchronously yields to property of object argument with given context", function (done) {
            const context = this.fakeContext;
            this.stub.yieldsToOnAsync("success", context);

            const callback = createSpy(function () {
                assert(callback.calledOnce);
                assert(callback.calledOn(context));
                assert.equals(callback.args[0].length, 0);
                done();
            });

            this.stub({ success: callback });
            assert(!callback.called);
        });
    });

    describe(".onCall", function () {
        it("can be used with returns to produce sequence", function () {
            const stub = createStub().returns(3);
            stub.onFirstCall().returns(1).onCall(2).returns(2);

            assert.same(stub(), 1);
            assert.same(stub(), 3);
            assert.same(stub(), 2);
            assert.same(stub(), 3);
        });

        it("can be used with returnsArg to produce sequence", function () {
            const stub = createStub().returns("default");
            stub.onSecondCall().returnsArg(0);

            assert.same(stub(1), "default");
            assert.same(stub(2), 2);
            assert.same(stub(3), "default");
        });

        it("can be used with returnsThis to produce sequence", function () {
            const instance = {};
            instance.stub = createStub().returns("default");
            instance.stub.onSecondCall().returnsThis();

            assert.same(instance.stub(), "default");
            assert.same(instance.stub(), instance);
            assert.same(instance.stub(), "default");
        });

        it("can be used with throwsException to produce sequence", function () {
            const stub = createStub();
            const error = new Error();
            stub.onSecondCall().throwsException(error);

            stub();

            assert.exception(stub, function (e) {
                return e === error;
            });
        });

        it("supports chained declaration of behavior", function () {
            const stub = createStub()
                .onCall(0)
                .returns(1)
                .onCall(1)
                .returns(2)
                .onCall(2)
                .returns(3);

            assert.same(stub(), 1);
            assert.same(stub(), 2);
            assert.same(stub(), 3);
        });

        describe("in combination with withArgs", function () {
            it("can produce a sequence for a fake", function () {
                const stub = createStub().returns(0);
                stub.withArgs(5)
                    .returns(-1)
                    .onFirstCall()
                    .returns(1)
                    .onSecondCall()
                    .returns(2);

                assert.same(stub(0), 0);
                assert.same(stub(5), 1);
                assert.same(stub(0), 0);
                assert.same(stub(5), 2);
                assert.same(stub(5), -1);
            });

            it("falls back to stub default behaviour if fake does not have its own default behaviour", function () {
                const stub = createStub().returns(0);
                stub.withArgs(5).onFirstCall().returns(1);

                assert.same(stub(5), 1);
                assert.same(stub(5), 0);
            });

            it("falls back to stub behaviour for call if fake does not have its own behaviour for call", function () {
                const stub = createStub().returns(0);
                stub.withArgs(5).onFirstCall().returns(1);
                stub.onSecondCall().returns(2);

                assert.same(stub(5), 1);
                assert.same(stub(5), 2);
                assert.same(stub(4), 0);
            });

            it("defaults to undefined behaviour once no more calls have been defined", function () {
                const stub = createStub();
                stub.withArgs(5)
                    .onFirstCall()
                    .returns(1)
                    .onSecondCall()
                    .returns(2);

                assert.same(stub(5), 1);
                assert.same(stub(5), 2);
                assert.isUndefined(stub(5));
            });

            it("does not create undefined behaviour just by calling onCall", function () {
                const stub = createStub().returns(2);
                stub.onFirstCall();

                assert.same(stub(6), 2);
            });

            it("works with fakes and reset", function () {
                const stub = createStub();
                stub.withArgs(5).onFirstCall().returns(1);
                stub.withArgs(5).onSecondCall().returns(2);

                assert.same(stub(5), 1);
                assert.same(stub(5), 2);
                assert.isUndefined(stub(5));

                stub.reset();

                assert.same(stub(5), undefined);
                assert.same(stub(5), undefined);
                assert.isUndefined(stub(5));
            });

            it("throws an understandable error when trying to use withArgs on behavior", function () {
                assert.exception(
                    function () {
                        createStub().onFirstCall().withArgs(1);
                    },
                    {
                        message: /not supported/,
                    },
                );
            });
        });

        it("can be used with yields* to produce a sequence", function () {
            const context = { foo: "bar" };
            const obj = { method1: createSpy(), method2: createSpy() };
            const obj2 = { method2: createSpy() };
            const stub = createStub().yieldsToOn("method2", context, 7, 8);
            stub.onFirstCall()
                .yields(1, 2)
                .onSecondCall()
                .yieldsOn(context, 3, 4)
                .onThirdCall()
                .yieldsTo("method1", 5, 6)
                .onCall(3)
                .yieldsToOn("method2", context, 7, 8);

            const spy1 = createSpy();
            const spy2 = createSpy();

            stub(spy1);
            stub(spy2);
            stub(obj);
            stub(obj);
            stub(obj2); // should continue with default behavior

            assert(spy1.calledOnce);
            assert(spy1.calledWithExactly(1, 2));

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));
            assert(spy2.calledOn(context));
            assert(spy2.calledWithExactly(3, 4));

            assert(obj.method1.calledOnce);
            assert(obj.method1.calledAfter(spy2));
            assert(obj.method1.calledWithExactly(5, 6));

            assert(obj.method2.calledOnce);
            assert(obj.method2.calledAfter(obj.method1));
            assert(obj.method2.calledOn(context));
            assert(obj.method2.calledWithExactly(7, 8));

            assert(obj2.method2.calledOnce);
            assert(obj2.method2.calledAfter(obj.method2));
            assert(obj2.method2.calledOn(context));
            assert(obj2.method2.calledWithExactly(7, 8));
        });

        it("can be used with callsArg* to produce a sequence", function () {
            const spy1 = createSpy();
            const spy2 = createSpy();
            const spy3 = createSpy();
            const spy4 = createSpy();
            const spy5 = createSpy();
            const decoy = createSpy();
            const context = { foo: "bar" };

            const stub = createStub().callsArgOnWith(3, context, "c", "d");
            stub.onFirstCall()
                .callsArg(0)
                .onSecondCall()
                .callsArgWith(1, "a", "b")
                .onThirdCall()
                .callsArgOn(2, context)
                .onCall(3)
                .callsArgOnWith(3, context, "c", "d");

            stub(spy1);
            stub(decoy, spy2);
            stub(decoy, decoy, spy3);
            stub(decoy, decoy, decoy, spy4);
            stub(decoy, decoy, decoy, spy5); // should continue with default behavior

            assert(spy1.calledOnce);

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));
            assert(spy2.calledWithExactly("a", "b"));

            assert(spy3.calledOnce);
            assert(spy3.calledAfter(spy2));
            assert(spy3.calledOn(context));

            assert(spy4.calledOnce);
            assert(spy4.calledAfter(spy3));
            assert(spy4.calledOn(context));
            assert(spy4.calledWithExactly("c", "d"));

            assert(spy5.calledOnce);
            assert(spy5.calledAfter(spy4));
            assert(spy5.calledOn(context));
            assert(spy5.calledWithExactly("c", "d"));

            assert(decoy.notCalled);
        });

        it("can be used with yields* and callsArg* in combination to produce a sequence", function () {
            const stub = createStub().yields(1, 2);
            stub.onSecondCall()
                .callsArg(1)
                .onThirdCall()
                .yieldsTo("method")
                .onCall(3)
                .callsArgWith(2, "a", "b");

            const obj = { method: createSpy() };
            const spy1 = createSpy();
            const spy2 = createSpy();
            const spy3 = createSpy();
            const decoy = createSpy();

            stub(spy1);
            stub(decoy, spy2);
            stub(obj);
            stub(decoy, decoy, spy3);

            assert(spy1.calledOnce);

            assert(spy2.calledOnce);
            assert(spy2.calledAfter(spy1));

            assert(obj.method.calledOnce);
            assert(obj.method.calledAfter(spy2));

            assert(spy3.calledOnce);
            assert(spy3.calledAfter(obj.method));
            assert(spy3.calledWithExactly("a", "b"));

            assert(decoy.notCalled);
        });

        it("should interact correctly with assertions (GH-231)", function () {
            const stub = createStub();
            const spy = createSpy();

            stub.callsArgWith(0, "a");

            stub(spy);
            assert(spy.calledWith("a"));

            stub(spy);
            assert(spy.calledWith("a"));

            stub.onThirdCall().callsArgWith(0, "b");

            stub(spy);
            assert(spy.calledWith("b"));
        });
    });

    describe(".reset", function () {
        it("resets behavior", function () {
            const obj = {
                a: function () {
                    return;
                },
            };
            const spy = createSpy();
            createStub(obj, "a").callsArg(1);

            obj.a(null, spy);
            obj.a.reset();
            obj.a(null, spy);

            assert(spy.calledOnce);
        });

        it("resets call history", function () {
            const stub = createStub();

            stub(1);
            stub.reset();
            stub(2);

            assert(stub.calledOnce);
            assert.equals(stub.getCall(0).args[0], 2);
        });
    });

    describe(".resetHistory", function () {
        it("resets history", function () {
            const stub = createStub();

            stub(1);
            stub.reset();
            stub(2);

            assert(stub.calledOnce);
            assert.equals(stub.getCall(0).args[0], 2);
        });

        it("doesn't reset behavior defined using withArgs", function () {
            const stub = createStub();
            stub.withArgs("test").returns(10);

            stub.resetHistory();

            assert.equals(stub("test"), 10);
        });

        it("doesn't reset behavior", function () {
            const stub = createStub();
            stub.returns(10);

            stub.resetHistory();

            assert.equals(stub("test"), 10);
        });
    });

    describe(".resetBehavior", function () {
        it("clears yields* and callsArg* sequence", function () {
            const stub = createStub().yields(1);
            stub.onFirstCall().callsArg(1);
            stub.resetBehavior();
            stub.yields(3);
            const spyWanted = createSpy();
            const spyNotWanted = createSpy();

            stub(spyWanted, spyNotWanted);

            assert(spyNotWanted.notCalled);
            assert(spyWanted.calledOnce);
            assert(spyWanted.calledWithExactly(3));
        });

        it("cleans 'returns' behavior", function () {
            const stub = createStub().returns(1);

            stub.resetBehavior();

            assert.isUndefined(stub());
        });

        it("cleans behavior of fakes returned by withArgs", function () {
            const stub = createStub();
            stub.withArgs("lolz").returns(2);

            stub.resetBehavior();

            assert.isUndefined(stub("lolz"));
        });

        it("does not clean parents' behavior when called on a fake returned by withArgs", function () {
            const parentStub = createStub().returns(false);
            const childStub = parentStub.withArgs("lolz").returns(true);

            childStub.resetBehavior();

            assert.same(parentStub("lolz"), false);
            assert.same(parentStub(), false);
        });

        it("cleans 'returnsArg' behavior", function () {
            const stub = createStub().returnsArg(0);

            stub.resetBehavior();

            assert.isUndefined(stub("defined"));
        });

        it("cleans 'returnsThis' behavior", function () {
            const instance = {};
            instance.stub = createStub();
            instance.stub.returnsThis();

            instance.stub.resetBehavior();

            assert.isUndefined(instance.stub());
        });

        it("cleans 'resolvesThis' behavior, so the stub does not resolve nor returns anything", function () {
            const instance = {};
            instance.stub = createStub();
            instance.stub.resolvesThis();

            instance.stub.resetBehavior();

            assert.isUndefined(instance.stub());
        });

        describe("does not touch properties that are reset by 'reset'", function () {
            it(".calledOnce", function () {
                const stub = createStub();
                stub(1);

                stub.resetBehavior();

                assert(stub.calledOnce);
            });

            it("called multiple times", function () {
                const stub = createStub();
                stub(1);
                stub(2);
                stub(3);

                stub.resetBehavior();

                assert(stub.called);
                assert.equals(stub.args.length, 3);
                assert.equals(stub.returnValues.length, 3);
                assert.equals(stub.exceptions.length, 3);
                assert.equals(stub.thisValues.length, 3);
                refute.isUndefined(stub.firstCall);
                refute.isUndefined(stub.secondCall);
                refute.isUndefined(stub.thirdCall);
                refute.isUndefined(stub.lastCall);
            });

            it("call order state", function () {
                const stubs = [createStub(), createStub()];
                stubs[0]();
                stubs[1]();

                stubs[0].resetBehavior();

                assert(stubs[0].calledBefore(stubs[1]));
            });

            it("fakes returned by withArgs", function () {
                const stub = createStub();
                const fakeA = stub.withArgs("a");
                const fakeB = stub.withArgs("b");
                stub("a");
                stub("b");
                stub("c");
                const fakeC = stub.withArgs("c");

                stub.resetBehavior();

                assert(fakeA.calledOnce);
                assert(fakeB.calledOnce);
                assert(fakeC.calledOnce);
            });
        });
    });

    describe(".length", function () {
        it("is zero by default", function () {
            const stub = createStub();

            assert.equals(stub.length, 0);
        });

        it("retains function length 0", function () {
            const object = {
                test: function () {
                    return;
                },
            };

            const stub = createStub(object, "test");

            assert.equals(stub.length, 0);
        });

        it("retains function length 1", function () {
            const object = {
                // eslint-disable-next-line no-unused-vars
                test: function (a) {
                    return;
                },
            };

            const stub = createStub(object, "test");

            assert.equals(stub.length, 1);
        });

        it("retains function length 2", function () {
            const object = {
                // eslint-disable-next-line no-unused-vars
                test: function (a, b) {
                    return;
                },
            };

            const stub = createStub(object, "test");

            assert.equals(stub.length, 2);
        });

        it("retains function length 3", function () {
            const object = {
                // eslint-disable-next-line no-unused-vars
                test: function (a, b, c) {
                    return;
                },
            };

            const stub = createStub(object, "test");

            assert.equals(stub.length, 3);
        });

        it("retains function length 4", function () {
            const object = {
                // eslint-disable-next-line no-unused-vars
                test: function (a, b, c, d) {
                    return;
                },
            };

            const stub = createStub(object, "test");

            assert.equals(stub.length, 4);
        });

        it("retains function length 12", function () {
            // eslint-disable-next-line no-unused-vars
            const func12Args = function (a, b, c, d, e, f, g, h, i, j, k, l) {
                return;
            };
            const object = {
                test: func12Args,
            };

            const stub = createStub(object, "test");

            assert.equals(stub.length, 12);
        });
    });

    describe(".callThrough", function () {
        it("does not call original function when arguments match conditional stub", function () {
            // We need a function here because we can't wrap properties that are already stubs
            let callCount = 0;
            const originalFunc = function increaseCallCount() {
                callCount++;
            };

            const myObj = {
                prop: originalFunc,
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough();

            const result = myObj.prop("foo");

            assert.equals(result, "bar");
            assert.equals(callCount, 0);
        });

        it("calls original function when arguments do not match conditional stub", function () {
            // We need a function here because we can't wrap properties that are already stubs
            let callCount = 0;

            const originalFunc = function increaseCallCount() {
                callCount++;
                return 1337;
            };

            const myObj = {
                prop: originalFunc,
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough(propStub);

            const result = myObj.prop("not foo");

            assert.equals(result, 1337);
            assert.equals(callCount, 1);
        });

        it("calls original function with same arguments when call does not match conditional stub", function () {
            // We need a function here because we can't wrap properties that are already stubs
            let callArgs = [];

            const originalFunc = function increaseCallCount() {
                callArgs = arguments;
            };

            const myObj = {
                prop: originalFunc,
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough();

            myObj.prop("not foo");

            assert.equals(callArgs.length, 1);
            assert.equals(callArgs[0], "not foo");
        });

        it("calls original function with same `this` reference when call does not match conditional stub", function () {
            // We need a function here because we can't wrap properties that are already stubs
            let reference = {};

            const originalFunc = function increaseCallCount() {
                reference = this;
            };

            const myObj = {
                prop: originalFunc,
            };

            const propStub = createStub(myObj, "prop");
            propStub.withArgs("foo").returns("bar");
            propStub.callThrough();

            myObj.prop("not foo");

            assert.equals(reference, myObj);
        });
    });

    describe(".callThroughWithNew", function () {
        it("does not call original function with new when arguments match conditional stub", function () {
            // We need a function here because we can't wrap properties that are already stubs
            let callCount = 0;
            const OriginalClass = function SomeClass() {
                this.foo = "bar";
                callCount++;
            };

            const myObj = {
                MyClass: OriginalClass,
            };

            const propStub = createStub(myObj, "MyClass");
            propStub.withArgs("foo").returns({ foo: "bar" });
            propStub.callThroughWithNew(propStub);

            const result = new myObj.MyClass("foo");

            assert.equals(result.foo, "bar");
            assert.equals(callCount, 0);
        });

        context("when call does not match conditional stub", function () {
            it("calls original function with new with same arguments", function () {
                // We need a function here because we can't wrap properties that are already stubs
                let callArgs = [];

                function OriginalClass() {
                    callArgs = arguments;
                    this.foo = "baz";
                }

                const myObj = {
                    MyClass: OriginalClass,
                };

                const propStub = createStub(myObj, "MyClass");
                propStub.withArgs("foo").returns({ foo: "bar" });
                propStub.callThroughWithNew(propStub);

                const result = new myObj.MyClass("not foo", [
                    "definitely",
                    "not",
                    "foo",
                ]);
                assert.equals(callArgs[0], "not foo");
                assert.equals(callArgs[1], ["definitely", "not", "foo"]);
                assert.equals(result.foo, "baz");
            });
        });
    });

    describe(".get", function () {
        it("allows users to stub getter functions for properties", function () {
            const myObj = {
                prop: "foo",
            };

            createStub(myObj, "prop").get(function getterFn() {
                return "bar";
            });

            assert.equals(myObj.prop, "bar");
        });

        it("allows users to stub getter functions for functions", function () {
            const myObj = {
                prop: function propGetter() {
                    return "foo";
                },
            };

            createStub(myObj, "prop").get(function getterFn() {
                return "bar";
            });

            assert.equals(myObj.prop, "bar");
        });

        it("replaces old getters", function () {
            const myObj = {
                get prop() {
                    fail("should not call the old getter");
                    return;
                },
            };

            createStub(myObj, "prop").get(function getterFn() {
                return "bar";
            });

            assert.equals(myObj.prop, "bar");
        });

        it("can restore stubbed setters for functions", function () {
            const propFn = function propFn() {
                return "bar";
            };

            const myObj = {
                prop: propFn,
            };

            const stub = createStub(myObj, "prop");

            stub.get(function getterFn() {
                return "baz";
            });

            stub.restore();

            assert.equals(myObj.prop, propFn);
        });

        it("can restore stubbed getters for properties", function () {
            const myObj = {
                get prop() {
                    return "bar";
                },
            };

            const stub = createStub(myObj, "prop");

            stub.get(function getterFn() {
                return "baz";
            });

            stub.restore();

            assert.equals(myObj.prop, "bar");
        });
    });

    describe(".set", function () {
        it("allows users to stub setter functions for properties", function () {
            const myObj = {
                prop: "foo",
            };

            createStub(myObj, "prop").set(function setterFn() {
                myObj.example = "bar";
            });

            myObj.prop = "baz";

            assert.equals(myObj.example, "bar");
        });

        it("allows users to stub setter functions for functions", function () {
            const myObj = {
                prop: function propSetter() {
                    return "foo";
                },
            };

            createStub(myObj, "prop").set(function setterFn() {
                myObj.example = "bar";
            });

            myObj.prop = "baz";

            assert.equals(myObj.example, "bar");
        });

        it("replaces old setters", function () {
            const myObj = {
                // eslint-disable-next-line accessor-pairs
                set prop(val) {
                    fail("should not call the old setter");
                },
            };

            createStub(myObj, "prop").set(function setterFn() {
                myObj.example = "bar";
            });

            myObj.prop = "foo";

            assert.equals(myObj.example, "bar");
        });

        it("can restore stubbed setters for functions", function () {
            const propFn = function propFn() {
                return "bar";
            };

            const myObj = {
                prop: propFn,
            };

            const stub = createStub(myObj, "prop");

            stub.set(function setterFn() {
                myObj.otherProp = "baz";
            });

            stub.restore();

            assert.equals(myObj.prop, propFn);
        });

        it("can restore stubbed setters for properties", function () {
            const myObj = {
                // eslint-disable-next-line accessor-pairs
                set prop(val) {
                    this.otherProp = "bar";
                },
            };

            const stub = createStub(myObj, "prop");

            stub.set(function setterFn() {
                myObj.otherProp = "baz";
            });

            stub.restore();

            myObj.prop = "foo";
            assert.equals(myObj.otherProp, "bar");
        });
    });

    describe(".value", function () {
        it("allows stubbing property descriptor values", function () {
            const myObj = {
                prop: "rawString",
            };

            createStub(myObj, "prop").value("newString");
            assert.equals(myObj.prop, "newString");
        });

        it("allows restoring stubbed property descriptor values", function () {
            const myObj = {
                prop: "rawString",
            };

            const stub = createStub(myObj, "prop").value("newString");
            stub.restore();

            assert.equals(myObj.prop, "rawString");
        });

        it("allows stubbing function static properties", function () {
            const myFunc = function () {
                return;
            };
            myFunc.prop = "rawString";

            createStub(myFunc, "prop").value("newString");
            assert.equals(myFunc.prop, "newString");
        });

        it("allows restoring function static properties", function () {
            const myFunc = function () {
                return;
            };
            myFunc.prop = "rawString";

            const stub = createStub(myFunc, "prop").value("newString");
            stub.restore();

            assert.equals(myFunc.prop, "rawString");
        });

        it("allows stubbing getters", function () {
            const y = {
                get foo() {
                    return "bar";
                },
            };
            refute.exception(function () {
                createStub(y, "foo").value("bar");
            });
        });

        it("disallows stubbing non-accessor methods", function () {
            const x = {
                getFoo: function getFoo() {
                    return "bar";
                },
            };

            assert.exception(function () {
                createStub(x, "getFoo").value("baz");
            }, "Error: getFoo is a function, not a getter or value. Use .returns() instead of .value()");
        });

        it("allows stubbing object props with configurable false", function () {
            const myObj = {};
            Object.defineProperty(myObj, "prop", {
                configurable: false,
                enumerable: true,
                writable: true,
                value: "static",
            });

            createStub(myObj, "prop").value("newString");
            assert.equals(myObj.prop, "newString");
        });
    });

    describe(".id", function () {
        it("should start with 'stub#'", function () {
            for (let i = 0; i < 10; i++) {
                assert.isTrue(createStub().id.indexOf("stub#") === 0);
            }
        });
    });

    describe(".printf", function () {
        it("is delegated to proxy", function () {
            const f = function () {
                throw new Error("aError");
            };

            const stub = createStub();
            const proxy = createProxy(f, f);

            assert.same(stub.printf, proxy.printf);
        });
    });

    describe(".wrappedMethod", function () {
        it("should return the original method being stubbed", function () {
            const myFn = function () {
                return "foo";
            };
            const myObj = {
                fn: myFn,
            };
            createStub(myObj, "fn");
            assert.same(myFn, myObj.fn.wrappedMethod);
        });

        it("should not exist for accessors", function () {
            const myObj = {
                get prop() {
                    return "foo";
                },
            };
            createStub(myObj, "prop").get(function () {
                return "bar";
            });
            assert.isUndefined(myObj.prop.wrappedMethod);
        });
    });
});
