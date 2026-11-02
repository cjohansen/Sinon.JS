import referee from "@sinonjs/referee";
import commons from "@sinonjs/commons";
import samsam from "@sinonjs/samsam";
import Sandbox from "../../src/sinon/sandbox.js";
import createSandbox from "../../src/sinon/create-sandbox.js";
import sinonFake from "../../src/sinon/fake.js";
import sinonSpy from "../../src/sinon/spy.js";
import sinonStub from "../../src/sinon/stub.js";
import createSinonApi from "../../src/create-sinon-api.js";
import "../test-helper.js";

const assert = referee.assert;
const deprecated = commons.deprecated;
const refute = referee.refute;
const match = samsam.createMatcher;
const createApi = createSinonApi;

const globalContext = typeof global !== "undefined" ? global : window;

describe("Sandbox", function () {
    function noop() {
        return;
    }

    it("exposes match", function () {
        const sandbox = new Sandbox();

        assert.same(sandbox.match, match);
    });

    describe("error handling and cleanup helpers", function () {
        it("throws if restore is called with arguments", function () {
            const sandbox = createSandbox();

            assert.exception(
                function () {
                    sandbox.restore("unexpected");
                },
                {
                    message:
                        "sandbox.restore() does not take any parameters. Perhaps you meant stub.restore()",
                },
            );
        });

        it("removes injected keys on restoreContext", function () {
            const target = {};
            const sandbox = createSandbox({
                injectInto: target,
                properties: ["spy", "stub"],
            });

            assert.isFunction(target.spy);
            assert.isFunction(target.stub);

            sandbox.restoreContext();

            assert.isFalse("spy" in target);
            assert.isFalse("stub" in target);
            assert.equals(sandbox.injectedKeys.length, 0);
        });
    });

    describe(".mock", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        it("returns a mock", function () {
            const object = {
                method: function () {
                    return;
                },
            };

            const actual = this.sandbox.mock(object);
            actual.expects("method");

            assert.equals(typeof actual.verify, "function");
            assert.equals(typeof object.method.restore, "function");
        });

        it("adds mock to fake array", function () {
            const fakes = this.sandbox.getFakes();
            const object = {
                method: function () {
                    return;
                },
            };
            const expected = this.sandbox.mock(object);

            assert(fakes.indexOf(expected) !== -1);
        });

        it("appends mocks to fake array", function () {
            const fakes = this.sandbox.getFakes();

            this.sandbox.mock({});
            this.sandbox.mock({});

            assert.equals(fakes.length, 2);
        });
    });

    describe("property helpers", function () {
        it("throws when defining an already existing own property", function () {
            const sandbox = createSandbox();
            const object = {
                prop: "original",
            };

            assert.exception(
                function () {
                    sandbox.define(object, "prop", "replacement");
                },
                {
                    message: /Cannot define the already existing property/,
                },
            );
        });

        it("throws when replacing a non-configurable setter", function () {
            const sandbox = createSandbox();
            const object = {};

            /* eslint-disable accessor-pairs */
            Object.defineProperty(object, "prop", {
                set: function prop(value) {
                    object.setterValue = value;
                },
                configurable: false,
            });
            /* eslint-enable accessor-pairs */

            assert.exception(
                function () {
                    sandbox.replaceSetter(object, "prop", function () {
                        return;
                    });
                },
                {
                    message: /is not configurable/,
                },
            );
        });

        it("throws when replacing a non-configurable getter", function () {
            const sandbox = createSandbox();
            const object = {};

            Object.defineProperty(object, "prop", {
                get: function prop() {
                    return "original";
                },
                configurable: false,
            });

            assert.exception(
                function () {
                    sandbox.replaceGetter(object, "prop", function () {
                        return "replacement";
                    });
                },
                {
                    message: /is not configurable/,
                },
            );
        });
    });

    describe("stub and mock test", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        it("appends mocks and stubs to fake array", function () {
            const fakes = this.sandbox.getFakes();

            this.sandbox.mock(
                {
                    method: function () {
                        return;
                    },
                },
                "method",
            );
            this.sandbox.stub(
                {
                    method: function () {
                        return;
                    },
                },
                "method",
            );

            assert.equals(fakes.length, 2);
        });

        describe("warns of potential leak when", function () {
            let warn;

            beforeEach(function () {
                warn = this.sandbox.stub(deprecated, "printWarning");
            });

            afterEach(function () {
                warn.restore();
            });

            it("many fakes are created", function () {
                assert.equals(typeof this.sandbox.leakThreshold, "number");

                createTooManyFakes(this.sandbox);

                assert(warn.called);
            });

            it("a configurable number of fakes are created", function () {
                this.sandbox.leakThreshold = 20;

                createTooManyFakes(this.sandbox);

                assert(warn.called);
            });

            it("a leak warning has not already been output", function () {
                this.sandbox.leakThreshold = 20;

                createTooManyFakes(this.sandbox);
                this.sandbox.restore();
                warn.resetHistory();

                createTooManyFakes(this.sandbox);
                assert(!warn.called);
            });

            function createTooManyFakes(sandbox) {
                for (let i = 0; i < sandbox.leakThreshold; i++) {
                    sandbox.spy();
                }
            }
        });
    });

    describe(".spy", function () {
        it("should return a spy", function () {
            const sandbox = createSandbox();
            const spy = sandbox.spy();

            assert.isFunction(spy);
            assert.equals(spy.displayName, "spy");
        });

        it("should add a spy to the internal collection", function () {
            const sandbox = createSandbox();
            const fakes = sandbox.getFakes();

            const expected = sandbox.spy();

            assert.isTrue(fakes.indexOf(expected) !== -1);
        });
    });

    describe(".createStubInstance", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        it("stubs existing methods", function () {
            const Class = function () {
                return;
            };
            Class.prototype.method = function () {
                return;
            };

            const stub = this.sandbox.createStubInstance(Class);
            stub.method.returns(3);
            assert.equals(3, stub.method());
        });

        it("should require a function", function () {
            const sandbox = this.sandbox;

            assert.exception(
                function () {
                    sandbox.createStubInstance("not a function");
                },
                {
                    name: "TypeError",
                    message: "The constructor should be a function.",
                },
            );
        });

        it("resets all stub methods on reset()", function () {
            const Class = function () {
                return;
            };
            Class.prototype.method1 = function () {
                return;
            };
            Class.prototype.method2 = function () {
                return;
            };
            Class.prototype.method3 = function () {
                return;
            };

            const stub = this.sandbox.createStubInstance(Class);
            stub.method1.returns(1);
            stub.method2.returns(2);
            stub.method3.returns(3);

            assert.equals(3, stub.method3());

            this.sandbox.reset();
            assert.isUndefined(stub.method1());
            assert.isUndefined(stub.method2());
            assert.isUndefined(stub.method3());
        });

        it("doesn't stub fake methods", function () {
            const Class = function () {
                return;
            };
            Class.prototype.noop = noop;

            const stub = this.sandbox.createStubInstance(Class);
            assert.exception(function () {
                stub.method.returns(3);
            });
        });

        it("doesn't call the constructor", function () {
            const Class = function (a, b) {
                const c = a + b;
                throw c;
            };
            Class.prototype.method = function () {
                return;
            };

            const stub = this.sandbox.createStubInstance(Class);
            refute.exception(function () {
                stub.method(3);
            });
        });

        it("retains non function values", function () {
            const TYPE = "some-value";
            const Class = function () {
                return;
            };
            Class.prototype.noop = noop;
            Class.prototype.type = TYPE;

            const stub = this.sandbox.createStubInstance(Class);
            assert.equals(TYPE, stub.type);
        });

        it("has no side effects on the prototype", function () {
            const proto = {
                method: function () {
                    throw new Error("error");
                },
            };
            const Class = function () {
                return;
            };
            Class.prototype = proto;

            const stub = this.sandbox.createStubInstance(Class);
            refute.exception(stub.method);
            assert.exception(proto.method);
        });

        it("throws exception for non function params", function () {
            const types = [{}, 3, "hi!"];

            for (let i = 0; i < types.length; i++) {
                // yes, it's silly to create functions in a loop, it's also a test

                assert.exception(function () {
                    this.sandbox.createStubInstance(types[i]);
                });
            }
        });

        it("allows providing optional overrides", function () {
            const Class = function () {
                return;
            };
            Class.prototype.method = function () {
                return;
            };

            const stub = this.sandbox.createStubInstance(Class, {
                method: sinonStub().returns(3),
            });

            assert.equals(3, stub.method());
        });

        it("allows providing optional returned values", function () {
            const Class = function () {
                return;
            };
            Class.prototype.method = function () {
                return;
            };

            const stub = this.sandbox.createStubInstance(Class, {
                method: 3,
            });

            assert.equals(3, stub.method());
        });

        it("allows providing null as a return value", function () {
            const Class = function () {
                return;
            };
            Class.prototype.method = function () {
                return;
            };

            const stub = this.sandbox.createStubInstance(Class, {
                method: null,
            });

            assert.equals(null, stub.method());
        });

        it("throws an exception when trying to override non-existing property", function () {
            const Class = function () {
                return;
            };
            Class.prototype.method = function () {
                return;
            };

            const sandbox = this.sandbox;

            assert.exception(
                function () {
                    sandbox.createStubInstance(Class, {
                        foo: sinonStub().returns(3),
                    });
                },
                { message: "Cannot stub foo. Property does not exist!" },
            );
        });

        it("restores an instance where every function of the prototype has been replaced by a no-op (#2477)", function () {
            const sandbox = this.sandbox;

            class SystemUnderTest {
                constructor() {
                    this.privateGetter = () => 42;
                }

                getValue() {
                    return this.privateGetter();
                }
            }

            const stubInstance = sandbox.createStubInstance(SystemUnderTest);
            sandbox.restore();

            refute.exception(stubInstance.getValue);
            assert.isUndefined(stubInstance.getValue());
        });
    });

    describe(".stub", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        it("fails if stubbing property on null", function () {
            const sandbox = this.sandbox;

            assert.exception(
                function () {
                    sandbox.stub(null, "prop");
                },
                {
                    message: "Trying to stub property 'prop' of null",
                },
            );
        });

        it("fails if stubbing symbol on null", function () {
            if (typeof Symbol === "function") {
                const sandbox = this.sandbox;

                assert.exception(
                    function () {
                        sandbox.stub(null, Symbol("apple pie"));
                    },
                    {
                        message:
                            "Trying to stub property 'Symbol(apple pie)' of null",
                    },
                );
            }
        });

        it("creates a stub", function () {
            const object = {
                method: function () {
                    return;
                },
            };

            this.sandbox.stub(object, "method");

            assert.equals(typeof object.method.restore, "function");
        });

        it("adds stub to fake array", function () {
            const fakes = this.sandbox.getFakes();
            const object = {
                method: function () {
                    return;
                },
            };
            const stub = this.sandbox.stub(object, "method");

            assert.isTrue(fakes.indexOf(stub) !== -1);
        });

        it("appends stubs to fake array", function () {
            const fakes = this.sandbox.getFakes();

            this.sandbox.stub(
                {
                    method: function () {
                        return;
                    },
                },
                "method",
            );
            this.sandbox.stub(
                {
                    method: function () {
                        return;
                    },
                },
                "method",
            );

            assert.equals(fakes.length, 2);
        });

        it("adds all object methods to fake array", function () {
            const fakes = this.sandbox.getFakes();
            const object = {
                method: function () {
                    return;
                },
                method2: function () {
                    return;
                },
                method3: function () {
                    return;
                },
            };

            Object.defineProperty(object, "method3", {
                enumerable: false,
            });

            this.sandbox.stub(object);

            assert.isTrue(fakes.indexOf(object.method) !== -1);
            assert.isTrue(fakes.indexOf(object.method2) !== -2);
            assert.isTrue(fakes.indexOf(object.method3) !== -3);
            assert.equals(fakes.length, 3);
        });

        it("returns a stubbed object", function () {
            const object = {
                method: function () {
                    return;
                },
            };
            assert.equals(this.sandbox.stub(object), object);
        });

        it("returns a stubbed method", function () {
            const object = {
                method: function () {
                    return;
                },
            };
            assert.equals(this.sandbox.stub(object, "method"), object.method);
        });

        describe("on node", function () {
            before(function () {
                if (typeof process === "undefined" || !process.env) {
                    this.skip();
                }
            });

            beforeEach(function () {
                process.env.HELL = "Ain't too bad";
            });

            it("stubs environment property", function () {
                const originalPrintWarning = deprecated.printWarning;
                deprecated.printWarning = function () {
                    return;
                };

                this.sandbox.stub(process.env, "HELL").value("froze over");
                assert.equals(process.env.HELL, "froze over");

                deprecated.printWarning = originalPrintWarning;
            });
        });
    });

    describe("stub anything", function () {
        beforeEach(function () {
            this.object = { property: 42 };
            this.sandbox = new Sandbox();
        });

        it("stubs number property", function () {
            const originalPrintWarning = deprecated.printWarning;
            deprecated.printWarning = function () {
                return;
            };

            this.sandbox.stub(this.object, "property").value(1);

            assert.equals(this.object.property, 1);

            deprecated.printWarning = originalPrintWarning;
        });

        it("restores number property", function () {
            const originalPrintWarning = deprecated.printWarning;
            deprecated.printWarning = function () {
                return;
            };

            this.sandbox.stub(this.object, "property").value(1);
            this.sandbox.restore();

            assert.equals(this.object.property, 42);

            deprecated.printWarning = originalPrintWarning;
        });

        it("fails if property does not exist", function () {
            const originalPrintWarning = deprecated.printWarning;
            deprecated.printWarning = function () {
                return;
            };

            const sandbox = this.sandbox;
            const object = {};

            assert.exception(function () {
                sandbox.stub(object, "prop", 1);
            });

            deprecated.printWarning = originalPrintWarning;
        });

        it("fails if Symbol does not exist", function () {
            if (typeof Symbol === "function") {
                const sandbox = this.sandbox;
                const object = {};

                const originalPrintWarning = deprecated.printWarning;
                deprecated.printWarning = function () {
                    return;
                };

                assert.exception(
                    function () {
                        sandbox.stub(object, Symbol("apple pie"));
                    },
                    {
                        message:
                            "Cannot stub non-existent property Symbol(apple pie)",
                    },
                    TypeError,
                );

                deprecated.printWarning = originalPrintWarning;
            }
        });
    });

    describe(".fake", function () {
        it("should return a fake", function () {
            const sandbox = createSandbox();
            const fake = sandbox.fake();

            assert.isFunction(fake);
            assert.equals(fake.displayName, "fake");
        });

        it("should add a fake to the internal collection", function () {
            const sandbox = createSandbox();
            const fakes = sandbox.getFakes();

            const expected = sandbox.fake();

            assert.isTrue(fakes.indexOf(expected) !== -1);
        });

        describe(".returns", function () {
            it("should return a fake behavior", function () {
                const sandbox = createSandbox();
                const fake = sandbox.fake.returns();

                assert.isFunction(fake);
                assert.equals(fake.displayName, "fake");
            });

            it("should add a fake behavior to the internal collection", function () {
                const sandbox = createSandbox();
                const fakes = sandbox.getFakes();

                const expected = sandbox.fake.returns();

                assert.isTrue(fakes.indexOf(expected) !== -1);
            });
        });

        describe(".throws", function () {
            it("should return a fake behavior", function () {
                const sandbox = createSandbox();
                const fake = sandbox.fake.throws();

                assert.isFunction(fake);
                assert.equals(fake.displayName, "fake");
            });

            it("should add a fake behavior to the internal collection", function () {
                const sandbox = createSandbox();
                const fakes = sandbox.getFakes();

                const expected = sandbox.fake.throws();

                assert.isTrue(fakes.indexOf(expected) !== -1);
            });
        });

        describe(".resolves", function () {
            it("should return a fake behavior", function () {
                const sandbox = createSandbox();
                const fake = sandbox.fake.resolves();

                assert.isFunction(fake);
                assert.equals(fake.displayName, "fake");
            });

            it("should add a fake behavior to the internal collection", function () {
                const sandbox = createSandbox();
                const fakes = sandbox.getFakes();

                const expected = sandbox.fake.resolves();

                assert.isTrue(fakes.indexOf(expected) !== -1);
            });
        });

        describe(".rejects", function () {
            it("should return a fake behavior", function () {
                const sandbox = createSandbox();
                const fake = sandbox.fake.rejects();

                assert.isFunction(fake);
                assert.equals(fake.displayName, "fake");
            });

            it("should add a fake behavior to the internal collection", function () {
                const sandbox = createSandbox();
                const fakes = sandbox.getFakes();

                const expected = sandbox.fake.rejects();

                assert.isTrue(fakes.indexOf(expected) !== -1);
            });
        });

        describe(".yields", function () {
            it("should return a fake behavior", function () {
                const sandbox = createSandbox();
                const fake = sandbox.fake.yields();

                assert.isFunction(fake);
                assert.equals(fake.displayName, "fake");
            });

            it("should add a fake behavior to the internal collection", function () {
                const sandbox = createSandbox();
                const fakes = sandbox.getFakes();

                const expected = sandbox.fake.yields();

                assert.isTrue(fakes.indexOf(expected) !== -1);
            });
        });

        describe(".yieldsAsync", function () {
            it("should return a fake behavior", function () {
                const sandbox = createSandbox();
                const fake = sandbox.fake.yieldsAsync();

                assert.isFunction(fake);
                assert.equals(fake.displayName, "fake");
            });

            it("should add a fake behavior to the internal collection", function () {
                const sandbox = createSandbox();
                const fakes = sandbox.getFakes();

                const expected = sandbox.fake.yieldsAsync();

                assert.isTrue(fakes.indexOf(expected) !== -1);
            });
        });
    });

    describe(".verifyAndRestore", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        it("calls verify and restore", function () {
            this.sandbox.verify = sinonSpy();
            this.sandbox.restore = sinonSpy();

            this.sandbox.verifyAndRestore();

            assert(this.sandbox.verify.called);
            assert(this.sandbox.restore.called);
        });

        it("throws when restore throws", function () {
            this.sandbox.verify = sinonSpy();
            this.sandbox.restore = sinonStub().throws();

            assert.exception(function () {
                this.sandbox.verifyAndRestore();
            });
        });

        it("calls restore when restore throws", function () {
            const sandbox = this.sandbox;

            sandbox.verify = sinonSpy();
            sandbox.restore = sinonStub().throws();

            assert.exception(function () {
                sandbox.verifyAndRestore();
            });

            assert(sandbox.restore.called);
        });
    });

    describe(".define", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        afterEach(function () {
            this.sandbox.restore();
        });

        it("should define a function property", function () {
            function newFunction() {
                return;
            }

            const object = {};

            this.sandbox.define(object, "property", newFunction);

            assert.equals(object.property, newFunction);

            this.sandbox.restore();

            assert.isUndefined(object.property);
        });

        it("should define a non-function property", function () {
            const newValue = "some-new-value";
            const object = {};

            this.sandbox.define(object, "property", newValue);

            assert.equals(object.property, newValue);

            this.sandbox.restore();

            assert.isUndefined(object.property);
        });

        it("should error on existing descriptor", function () {
            const sandbox = this.sandbox;

            const existingValue = "123";
            const existingFunction = () => "abcd";

            const object = {
                existingValue: existingValue,
                existingFunction: existingFunction,
            };

            assert.exception(
                function () {
                    sandbox.define(object, "existingValue", "new value");
                },
                {
                    message:
                        "Cannot define the already existing property existingValue. Perhaps you meant sandbox.replace()?",
                    name: "TypeError",
                },
            );

            assert.exception(
                function () {
                    sandbox.define(
                        object,
                        "existingFunction",
                        () => "new function",
                    );
                },
                {
                    message:
                        "Cannot define the already existing property existingFunction. Perhaps you meant sandbox.replace()?",
                    name: "TypeError",
                },
            );

            // Verify that the methods above, even though they failed, did not replace the values
            assert.equals(object.existingValue, existingValue);
            assert.equals(object.existingFunction, existingFunction);
        });
    });

    describe(".replace", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        afterEach(function () {
            this.sandbox.restore();
        });

        it("should replace a function property", function () {
            const replacement = function replacement() {
                return;
            };
            const existing = function existing() {
                return;
            };
            const object = {
                property: existing,
            };

            this.sandbox.replace(object, "property", replacement);

            assert.equals(object.property, replacement);

            this.sandbox.restore();

            assert.equals(object.property, existing);
        });

        it("should replace a non-function property", function () {
            const replacement = "replacement";
            const existing = "existing";
            const object = {
                property: existing,
            };

            this.sandbox.replace(object, "property", replacement);

            assert.equals(object.property, replacement);

            this.sandbox.restore();

            assert.equals(object.property, existing);
        });

        it("should replace an inherited property", function () {
            const replacement = "replacement";
            const existing = "existing";
            const object = Object.create({
                property: existing,
            });

            this.sandbox.replace(object, "property", replacement);

            assert.equals(object.property, replacement);

            this.sandbox.restore();

            assert.equals(object.property, existing);
        });

        it("should error on missing descriptor", function () {
            const sandbox = this.sandbox;

            assert.exception(
                function () {
                    sandbox.replace({}, "i-dont-exist");
                },
                {
                    message:
                        "Cannot replace non-existent property i-dont-exist. Perhaps you meant sandbox.define()?",
                    name: "TypeError",
                },
            );
        });

        it("should error on missing replacement", function () {
            const sandbox = this.sandbox;
            const object = Object.create({
                property: "catpants",
            });

            assert.exception(
                function () {
                    sandbox.replace(object, "property");
                },
                {
                    message: "Expected replacement argument to be defined",
                    name: "TypeError",
                },
            );
        });

        it("should refuse to replace a non-function with a function", function () {
            const sandbox = this.sandbox;
            const replacement = function () {
                return "replacement";
            };
            const existing = "existing";
            const object = {
                property: existing,
            };

            assert.exception(
                function () {
                    sandbox.replace(object, "property", replacement);
                },
                { message: "Cannot replace string with function" },
            );
        });

        it("should refuse to replace a function with a non-function", function () {
            const sandbox = this.sandbox;
            const replacement = "replacement";
            const object = {
                property: function () {
                    return "apple pie";
                },
            };

            assert.exception(
                function () {
                    sandbox.replace(object, "property", replacement);
                },
                { message: "Cannot replace function with string" },
            );
        });

        it("should refuse to replace a fake twice", function () {
            const sandbox = this.sandbox;
            const object = {
                property: function () {
                    return "apple pie";
                },
            };

            sandbox.replace(object, "property", sinonFake());

            assert.exception(
                function () {
                    sandbox.replace(object, "property", sinonFake());
                },
                {
                    message:
                        "Attempted to replace property which is already replaced",
                },
            );
        });

        it("should refuse to replace a string twice", function () {
            const sandbox = this.sandbox;
            const object = {
                property: "original",
            };

            sandbox.replace(object, "property", "first");

            assert.exception(
                function () {
                    sandbox.replace(object, "property", "second");
                },
                {
                    message:
                        "Attempted to replace property which is already replaced",
                },
            );
        });

        it("should return the replacement argument", function () {
            const replacement = "replacement";
            const existing = "existing";
            const object = {
                property: existing,
            };

            const actual = this.sandbox.replace(
                object,
                "property",
                replacement,
            );

            assert.equals(actual, replacement);
        });

        describe("when asked to replace a property with a getter", function () {
            it("should throw an Error by default that informs of replaceGetter", function () {
                const sandbox = this.sandbox;
                const object = {
                    get foo() {
                        return "bar";
                    },
                };

                assert.exception(
                    function () {
                        sandbox.replace(object, "foo", sinonFake());
                    },
                    {
                        message:
                            "Use sandbox.replaceGetter for replacing getters",
                    },
                );
            });
        });

        describe("when asked to replace a property with a setter", function () {
            it("should throw an Error", function () {
                const sandbox = this.sandbox;
                const object = {
                    // eslint-disable-next-line accessor-pairs
                    set foo(value) {
                        this.prop = value;
                    },
                };

                assert.exception(
                    function () {
                        sandbox.replace(object, "foo", sinonFake());
                    },
                    {
                        message:
                            "Use sandbox.replaceSetter for replacing setters",
                    },
                );
            });
        });
    });

    describe(".replace.usingAccessor", function () {
        it("should allow using assignment when replacing a value", function () {
            const sandbox = createSandbox();
            let quaziPrivateStateOfObject = "original";
            const object = {
                get foo() {
                    return quaziPrivateStateOfObject;
                },
                set foo(value) {
                    quaziPrivateStateOfObject = value;
                },
            };

            assert.equals(object.foo, "original");
            sandbox.replace.usingAccessor(object, "foo", "fake");
            assert.equals(object.foo, "fake");
            sandbox.restore();
            assert.equals(object.foo, "original");
        });
    });

    describe(".replaceGetter", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        it("preserves paired setters on own and inherited properties", function () {
            for (const inherited of [false, true]) {
                const original = {
                    get foo() {
                        return this.prop;
                    },
                    set foo(value) {
                        this.prop = value;
                    },
                };
                const object = inherited ? Object.create(original) : original;
                object.prop = "original";

                this.sandbox.replaceGetter(object, "foo", () => "replacement");
                object.foo = "updated";

                assert.equals(object.prop, "updated");
                assert.equals(object.foo, "replacement");

                this.sandbox.restore();

                assert.equals(object.foo, "updated");
                if (inherited) {
                    refute(Object.getOwnPropertyDescriptor(object, "foo"));
                }
            }
        });

        it("should replace getters", function () {
            const expected = "baz";
            const object = {
                get foo() {
                    return "bar";
                },
            };

            this.sandbox.replaceGetter(
                object,
                "foo",
                sinonFake.returns(expected),
            );

            assert.equals(object.foo, expected);
        });

        it("should return replacement", function () {
            const replacement = sinonFake.returns("baz");
            const object = {
                get foo() {
                    return "bar";
                },
            };

            const actual = this.sandbox.replaceGetter(
                object,
                "foo",
                replacement,
            );

            assert.equals(actual, replacement);
        });

        it("should replace an inherited property", function () {
            const expected = "baz";
            const replacement = sinonFake.returns(expected);
            const existing = "existing";
            const object = Object.create({
                get foo() {
                    return existing;
                },
            });

            this.sandbox.replaceGetter(object, "foo", replacement);

            assert.equals(object.foo, expected);

            this.sandbox.restore();

            assert.equals(object.foo, existing);
        });

        it("should error on missing descriptor", function () {
            const sandbox = this.sandbox;

            assert.exception(
                function () {
                    sandbox.replaceGetter({}, "i-dont-exist");
                },
                {
                    message:
                        "Cannot replace non-existent property i-dont-exist",
                    name: "TypeError",
                },
            );
        });

        it("should error when descriptor has no getter", function () {
            const sandbox = this.sandbox;
            const object = {
                // eslint-disable-next-line accessor-pairs
                set catpants(_) {
                    return;
                },
            };

            assert.exception(
                function () {
                    sandbox.replaceGetter(object, "catpants", noop);
                },
                {
                    message: "`object.property` is not a getter",
                    name: "Error",
                },
            );
        });

        describe("when called with a non-function replacement argument", function () {
            it("should throw a TypeError", function () {
                const sandbox = this.sandbox;
                const expected = "baz";
                const object = {
                    get foo() {
                        return "bar";
                    },
                };

                assert.exception(
                    function () {
                        sandbox.replaceGetter(object, "foo", expected);
                    },
                    {
                        message:
                            "Expected replacement argument to be a function",
                    },
                );
            });
        });

        it("allows restoring getters", function () {
            const expected = "baz";
            const object = {
                get foo() {
                    return "bar";
                },
            };

            this.sandbox.replaceGetter(
                object,
                "foo",
                sinonFake.returns(expected),
            );

            this.sandbox.restore();

            assert.equals(object.foo, "bar");
        });

        it("should refuse to replace a getter twice", function () {
            const sandbox = this.sandbox;
            const object = {
                get foo() {
                    return "bar";
                },
            };

            sandbox.replaceGetter(object, "foo", sinonFake.returns("one"));

            assert.exception(
                function () {
                    sandbox.replaceGetter(
                        object,
                        "foo",
                        sinonFake.returns("two"),
                    );
                },
                {
                    message:
                        "Attempted to replace foo which is already replaced",
                },
            );
        });

        it("do not call getter whilst replacing getter", function () {
            const sandbox = this.sandbox;
            const fake = sandbox.fake.returns("bar");
            const object = {
                get foo() {
                    return fake();
                },
            };

            sandbox.replaceGetter(object, "foo", () => "replacement");

            refute(fake.called);
        });
    });

    describe(".replaceSetter", function () {
        beforeEach(function () {
            this.sandbox = createSandbox();
        });

        it("preserves paired getters on own and inherited properties", function () {
            for (const inherited of [false, true]) {
                const original = {
                    get foo() {
                        return this.prop;
                    },
                    set foo(value) {
                        this.prop = value;
                    },
                };
                const object = inherited ? Object.create(original) : original;
                object.prop = "original";

                this.sandbox.replaceSetter(object, "foo", function (value) {
                    this.prop = `replacement ${value}`;
                });
                object.foo = "value";

                assert.equals(object.foo, "replacement value");

                this.sandbox.restore();
                object.foo = "restored";

                assert.equals(object.foo, "restored");
                if (inherited) {
                    refute(Object.getOwnPropertyDescriptor(object, "foo"));
                }
            }
        });

        it("should replace setter", function () {
            const object = {
                // eslint-disable-next-line accessor-pairs
                set foo(value) {
                    this.prop = value;
                },
                prop: "bar",
            };

            this.sandbox.replaceSetter(object, "foo", function (val) {
                this.prop = `${val}bla`;
            });

            object.foo = "bla";

            assert.equals(object.prop, "blabla");
        });

        it("should return replacement", function () {
            const object = {
                // eslint-disable-next-line accessor-pairs
                set foo(value) {
                    this.prop = value;
                },
                prop: "bar",
            };
            const replacement = function (val) {
                this.prop = `${val}bla`;
            };
            const actual = this.sandbox.replaceSetter(
                object,
                "foo",
                replacement,
            );

            assert.equals(actual, replacement);
        });

        it("should replace an inherited property", function () {
            const object = Object.create({
                // eslint-disable-next-line accessor-pairs
                set foo(value) {
                    this.prop = value;
                },
                prop: "bar",
            });
            const replacement = function (value) {
                this.prop = `${value}blabla`;
            };

            this.sandbox.replaceSetter(object, "foo", replacement);
            object.foo = "doodle";
            assert.equals(object.prop, "doodleblabla");

            this.sandbox.restore();
            object.foo = "doodle";
            assert.equals(object.prop, "doodle");
        });

        it("should error on missing descriptor", function () {
            const sandbox = this.sandbox;

            assert.exception(
                function () {
                    sandbox.replaceSetter({}, "i-dont-exist");
                },
                {
                    message:
                        "Cannot replace non-existent property i-dont-exist",
                    name: "TypeError",
                },
            );
        });

        it("should error when descriptor has no setter", function () {
            const sandbox = this.sandbox;
            const object = {
                get catpants() {
                    return;
                },
            };

            assert.exception(
                function () {
                    sandbox.replaceSetter(object, "catpants", noop);
                },
                {
                    message: "`object.property` is not a setter",
                    name: "Error",
                },
            );
        });

        describe("when called with a non-function replacement argument", function () {
            it("should throw a TypeError", function () {
                const sandbox = this.sandbox;
                const object = {
                    // eslint-disable-next-line accessor-pairs
                    set foo(value) {
                        this.prop = value;
                    },
                    prop: "bar",
                };

                assert.exception(
                    function () {
                        sandbox.replaceSetter(object, "foo", "bla");
                    },
                    {
                        message:
                            "Expected replacement argument to be a function",
                    },
                );
            });
        });

        it("allows restoring setters", function () {
            const object = {
                // eslint-disable-next-line accessor-pairs
                set foo(value) {
                    this.prop = value;
                },
                prop: "bar",
            };

            this.sandbox.replaceSetter(object, "foo", function (val) {
                this.prop = `${val}bla`;
            });

            this.sandbox.restore();

            object.prop = "bla";

            assert.equals(object.prop, "bla");
        });

        it("should refuse to replace a setter twice", function () {
            const sandbox = this.sandbox;
            const object = {
                // eslint-disable-next-line accessor-pairs
                set foo(value) {
                    return;
                },
            };

            sandbox.replaceSetter(object, "foo", sinonFake());

            assert.exception(
                function () {
                    sandbox.replaceSetter(
                        object,
                        "foo",
                        sinonFake.returns("two"),
                    );
                },
                {
                    message:
                        "Attempted to replace foo which is already replaced",
                },
            );
        });
    });

    describe(".reset", function () {
        beforeEach(function () {
            const sandbox = (this.sandbox = createSandbox());
            const fakes = sandbox.getFakes();

            fakes.push({
                reset: sinonSpy(),
                resetHistory: sinonSpy(),
            });
            fakes.push({
                reset: sinonSpy(),
                resetHistory: sinonSpy(),
            });
        });

        it("calls reset on all fakes", function () {
            const fake0 = this.sandbox.getFakes()[0];
            const fake1 = this.sandbox.getFakes()[1];

            this.sandbox.reset();

            assert(fake0.reset.called);
            assert(fake1.reset.called);
        });

        it("calls resetHistory on all fakes", function () {
            const fake0 = this.sandbox.getFakes()[0];
            const fake1 = this.sandbox.getFakes()[1];

            this.sandbox.reset();

            assert(fake0.resetHistory.called);
            assert(fake1.resetHistory.called);
        });

        it("resets fake behaviours", function () {
            const fake = this.sandbox.fake();
            fake(1234);

            this.sandbox.reset();

            assert.equals(fake.getCalls(), []);
        });
    });

    describe(".resetBehavior", function () {
        beforeEach(function () {
            const sandbox = (this.sandbox = createSandbox());
            const fakes = sandbox.getFakes();

            fakes.push({ resetBehavior: sinonSpy() });
            fakes.push({ resetBehavior: sinonSpy() });
        });

        it("calls resetBehavior on all fakes", function () {
            const fake0 = this.sandbox.getFakes()[0];
            const fake1 = this.sandbox.getFakes()[1];

            this.sandbox.resetBehavior();

            assert(fake0.resetBehavior.called);
            assert(fake1.resetBehavior.called);
        });
    });

    describe(".resetHistory", function () {
        beforeEach(function () {
            const sandbox = (this.sandbox = createSandbox());
            const fakes = (this.fakes = sandbox.getFakes());

            const spy1 = sinonSpy();
            spy1();
            fakes.push(spy1);

            const spy2 = sinonSpy();
            spy2();
            fakes.push(spy2);
        });

        it("resets the history on all fakes", function () {
            const fake0 = this.fakes[0];
            const fake1 = this.fakes[1];

            this.sandbox.resetHistory();

            refute(fake0.called);
            refute(fake1.called);
        });

        it("calls reset on fake that does not have a resetHistory", function () {
            noop.reset = function reset() {
                noop.reset.called = true;
            };

            this.fakes.push(noop);

            this.sandbox.resetHistory();

            assert.isTrue(noop.reset.called);
        });
    });

    describe(".useFakeTimers", function () {
        beforeEach(function () {
            this.sandbox = new Sandbox();
        });

        afterEach(function () {
            this.sandbox.restore();
        });

        it("returns clock object", function () {
            const clock = this.sandbox.useFakeTimers();

            assert.isObject(clock);
            assert.isFunction(clock.tick);
        });

        it("exposes clock property", function () {
            this.sandbox.useFakeTimers();

            assert.isObject(this.sandbox.clock);
            assert.isFunction(this.sandbox.clock.tick);
        });

        it("uses restorable clock", function () {
            this.sandbox.useFakeTimers();

            assert.clock(this.sandbox.clock);
        });

        it("accepts a config object", function () {
            const clock = this.sandbox.useFakeTimers({
                toFake: ["Date", "setTimeout"],
            });

            assert.clock(clock);
            assert.same(clock, this.sandbox.clock);
        });

        it("restores the fakeTimer clock created by the sandbox when the sandbox is restored", function () {
            const originalSetTimeout = setTimeout;

            this.sandbox.useFakeTimers();
            refute.same(setTimeout, originalSetTimeout, "fakeTimers installed");

            this.sandbox.restore();

            assert.same(setTimeout, originalSetTimeout, "fakeTimers restored");
        });

        it("restores spied fake timers when the sandbox is restored", function () {
            const originalSetTimeout = setTimeout;

            this.sandbox.useFakeTimers();
            this.sandbox.spy(globalContext, "setTimeout");

            this.sandbox.restore();

            assert.same(
                originalSetTimeout,
                globalContext.setTimeout,
                "fakeTimers restored",
            );
        });
    });

    describe(".inject", function () {
        beforeEach(function () {
            this.obj = {};
            this.sandbox = new Sandbox();
        });

        afterEach(function () {
            this.sandbox.restore();
        });

        it("injects spy, stub, mock, fake, replace, replaceSetter, createStubInstance", function () {
            this.sandbox.inject(this.obj);

            assert.isFunction(this.obj.spy);
            assert.isFunction(this.obj.stub);
            assert.isFunction(this.obj.mock);
            assert.isFunction(this.obj.createStubInstance);
            assert.isFunction(this.obj.fake);
            assert.isFunction(this.obj.replace);
            assert.isFunction(this.obj.replaceSetter);
            assert.isFunction(this.obj.replaceGetter);
        });

        it("should inject callable functions", function () {
            /* eslint-disable no-empty-function, accessor-pairs */
            this.sandbox.inject(this.obj);

            const myObj = {
                a: function () {},
            };

            function MyClass() {}

            MyClass.prototype.method1 = noop;
            Object.defineProperty(myObj, "b", {
                get: function () {
                    return 42;
                },
                configurable: true,
            });
            Object.defineProperty(myObj, "c", {
                set: function () {},
                configurable: true,
            });

            refute.exception(
                function () {
                    this.obj.createStubInstance(MyClass);
                    const fake = this.obj.fake();
                    this.obj.replace(myObj, "a", fake);
                    this.obj.replaceGetter(myObj, "b", fake);
                    this.obj.replaceSetter(myObj, "c", fake);
                }.bind(this),
            );
        });

        it("does not define clock object", function () {
            this.sandbox.inject(this.obj);

            assert.isFalse("clock" in this.obj);
        });

        it("defines clock when using fake time", function () {
            this.sandbox.useFakeTimers();
            this.sandbox.inject(this.obj);

            assert.isFunction(this.obj.spy);
            assert.isFunction(this.obj.stub);
            assert.isFunction(this.obj.mock);
            assert.isObject(this.obj.clock);
        });

        it("should return object", function () {
            const injected = this.sandbox.inject({});

            assert.isObject(injected);
            assert.isFunction(injected.spy);
        });
    });

    describe(".verify", function () {
        it("calls verify on all fakes", function () {
            const sandbox = createSandbox();
            const fakes = sandbox.getFakes();

            fakes.push({ verify: sinonSpy() });
            fakes.push({ verify: sinonSpy() });

            sandbox.verify();

            fakes.forEach(function (f) {
                assert(f.verify.calledOnce);
            });
        });
    });

    describe(".restore", function () {
        it("throws when passed arguments", function () {
            const sandbox = new Sandbox();

            assert.exception(
                function () {
                    sandbox.restore("args");
                },
                {
                    message:
                        "sandbox.restore() does not take any parameters. Perhaps you meant stub.restore()",
                },
            );
        });

        // https://github.com/sinonjs/sinon/issues/2192
        it("restores all fields of a spied object", function () {
            const sandbox = new Sandbox();
            const o = {
                foo: function () {
                    return 42;
                },
            };

            sandbox.spy(o);
            sandbox.restore();

            assert.isUndefined(o.foo.callCount);
        });

        it("restores all fields of a stubbed object", function () {
            const sandbox = new Sandbox();
            const o = {
                foo: function () {
                    return 42;
                },
            };

            sandbox.stub(o);
            sandbox.restore();

            assert.isUndefined(o.foo.callCount);
        });

        it("restores all fields of a stubbed function", function () {
            const sandbox = new Sandbox();
            const o = function () {};
            o.foo = function () {};

            sandbox.stub(o);
            sandbox.restore();

            assert.isUndefined(o.foo.callCount);
        });
    });

    describe("configurable sandbox", function () {
        it("yields stub, mock as arguments", function () {
            const sandbox = createSandbox({
                properties: ["stub", "mock"],
            });

            assert.equals(sandbox.args.length, 2);
            assert.stub(sandbox.args[0]());
            assert.mock(sandbox.args[1]({}));

            sandbox.restore();
        });

        it("yields spy, stub, mock as arguments", function () {
            const sandbox = createSandbox({
                properties: ["spy", "stub", "mock"],
            });

            assert.spy(sandbox.args[0]());
            assert.stub(sandbox.args[1]());
            assert.mock(sandbox.args[2]({}));

            sandbox.restore();
        });

        it("does not inject properties if they are already present", function () {
            const clock = {};
            const spy = false;
            const object = { clock: clock, spy: spy };
            const sandbox = createSandbox({
                properties: ["clock", "spy"],
                injectInto: object,
            });

            assert.same(object.clock, clock);
            assert.same(object.spy, spy);

            sandbox.restore();
        });

        // This is currently testing the internals of useFakeTimers, we could possibly change it to be based on
        // behavior.
        it("fakes specified timers", function () {
            const sandbox = createSandbox({
                properties: ["clock"],
                useFakeTimers: { toFake: ["Date", "setTimeout"] },
            });

            assert.clock(sandbox.clock);
            assert.isFunction(sandbox.clock.restore);

            sandbox.restore();
        });

        it("injects sandbox", function () {
            const object = {};

            const sandbox = createSandbox({
                properties: ["sandbox", "spy"],
                injectInto: object,
            });

            assert.equals(sandbox.args.length, 0);
            assert.isFunction(object.spy);
            assert.isObject(object.sandbox);

            sandbox.restore();
        });

        it("injects match", function () {
            const object = {};

            const sandbox = createSandbox({
                properties: ["match"],
                injectInto: object,
            });

            assert.same(object.match, match);

            sandbox.restore();
        });

        it("does not inject any properties by default", function () {
            const object = {};

            createSandbox({
                injectInto: object,
            });

            assert.equals(Object.keys(object), []);
        });
    });

    describe("getters and setters", function () {
        it("allows stubbing getters", function () {
            const object = {
                foo: "bar",
            };

            const sandbox = new Sandbox();
            sandbox.stub(object, "foo").get(function () {
                return "baz";
            });

            assert.equals(object.foo, "baz");
        });

        it("allows restoring getters", function () {
            const object = {
                foo: "bar",
            };

            const sandbox = new Sandbox();
            sandbox.stub(object, "foo").get(function () {
                return "baz";
            });

            sandbox.restore();

            assert.equals(object.foo, "bar");
        });

        it("allows stubbing setters", function () {
            const object = {
                foo: undefined,
                prop: "bar",
            };

            const sandbox = new Sandbox();
            sandbox.stub(object, "foo").set(function (val) {
                object.prop = `${val}bla`;
            });

            object.foo = "bla";

            assert.equals(object.prop, "blabla");
        });

        it("allows putting setters on fields and subsequently restoring them", function () {
            const object = {
                prop: "bar",
            };

            const sandbox = new Sandbox();
            sandbox.stub(object, "prop").set(function setterFn(val) {
                object.prop = `${val}bla`;
            });

            sandbox.restore();

            object.prop = "bla";

            assert.equals(object.prop, "bla");
        });

        it("allows replacing setters on fields and subsequently restoring them", function () {
            const object = {
                get prop() {
                    return "bar";
                },
            };

            const sandbox = new Sandbox();
            const getter = sandbox.spy(() => "foobar");
            sandbox.stub(object, "prop").get(getter);
            assert.equals(object.prop, "foobar");
            assert.equals(getter.callCount, 1);

            sandbox.restore();
            assert.equals(object.prop, "bar");
        });

        it("allows spying on accessors and subsequently restoring them", function () {
            const object = {
                get prop() {
                    return "bar";
                },
            };
            const sandbox = new Sandbox();
            const spy = sandbox.spy(object, "prop", ["get"]);
            sandbox.restore();
            const descriptor = Object.getOwnPropertyDescriptor(object, "prop");
            const getter = descriptor.get;
            refute.equals(getter, spy.get);
        });
    });

    describe("nested sandboxes", function () {
        // Sub-sandboxes returned by `parent.createSandbox()` are isolated:
        // the parent's `restore()` / `resetHistory()` / `verifyAndRestore()`
        // must not touch the child's fakes or timers. Cascading was a
        // regression in 21.1.0 (see #2701) and is now reverted.
        it("should not restore nested sandboxes when the parent is restored", function () {
            const parent = createApi(); // parent is a "sinon-like" sandbox
            const child = parent.createSandbox();

            const myObj = { method: () => "original" };
            child.stub(myObj, "method").returns("stubbed");

            assert.equals(myObj.method(), "stubbed");

            parent.restore();

            assert.equals(myObj.method(), "stubbed");

            child.restore();
            assert.equals(myObj.method(), "original");
        });

        it("should not reset history of nested sandboxes when the parent resetHistory is called", function () {
            const parent = createApi();
            const child = parent.createSandbox();

            const spy = child.spy();
            spy();

            assert.isTrue(spy.calledOnce);

            parent.resetHistory();

            assert.isTrue(spy.calledOnce);
        });

        it("should not restore nested sandboxes when the parent verifyAndRestore is called", function () {
            const parent = createApi();
            const child = parent.createSandbox();

            const myObj = { method: () => "original" };
            child.stub(myObj, "method").returns("stubbed");

            assert.equals(myObj.method(), "stubbed");

            parent.verifyAndRestore();

            assert.equals(myObj.method(), "stubbed");

            child.restore();
            assert.equals(myObj.method(), "original");
        });

        it("should not restore fake timers when the parent sandbox is restored", function () {
            const parent = createApi();
            const child = parent.createSandbox();

            const originalDate = globalContext.Date;
            child.useFakeTimers();

            refute.same(globalContext.Date, originalDate);

            parent.restore();

            refute.same(globalContext.Date, originalDate);

            child.restore();
            assert.same(globalContext.Date, originalDate);
        });
    });

    describe("descriptor-sensitive restoration", function () {
        it("should unshadow prototype property when restored", function () {
            const proto = { prop: "proto" };
            const object = Object.create(proto);
            const sandbox = new Sandbox();

            sandbox.replace(object, "prop", "replaced");
            assert.equals(object.prop, "replaced");
            assert.isTrue(Object.prototype.hasOwnProperty.call(object, "prop"));

            sandbox.restore();
            assert.equals(object.prop, "proto");
            assert.isFalse(
                Object.prototype.hasOwnProperty.call(object, "prop"),
            );
        });

        it("should restore own property descriptor when restored", function () {
            const object = {};
            Object.defineProperty(object, "prop", {
                value: "own",
                configurable: true,
                enumerable: false,
                writable: true,
            });
            const sandbox = new Sandbox();

            sandbox.replace(object, "prop", "replaced");
            assert.equals(object.prop, "replaced");

            sandbox.restore();
            assert.equals(object.prop, "own");
            const descriptor = Object.getOwnPropertyDescriptor(object, "prop");
            assert.isFalse(descriptor.enumerable);
            assert.isTrue(descriptor.writable);
        });

        it("should leave non-writable property unchanged when replacing it", function () {
            const object = {};
            Object.defineProperty(object, "prop", {
                value: "own",
                configurable: true,
                enumerable: true,
                writable: false,
            });
            const sandbox = new Sandbox();

            let threw = false;
            try {
                sandbox.replace(object, "prop", "replaced");
            } catch (error) {
                threw = true;
                assert.equals(
                    error.message,
                    "Cannot assign to read only property 'prop' of object '#<Object>'",
                );
            }

            assert.same(object.prop, "own");
            if (!threw) {
                sandbox.restore();
                assert.same(object.prop, "own");
            }
        });
    });

    describe("Sinon API shape", function () {
        it("should have all expected methods", function () {
            const sinon = createApi();
            const methods = [
                "spy",
                "stub",
                "mock",
                "fake",
                "match",
                "promise",
                "createSandbox",
                "replace",
                "replaceGetter",
                "replaceSetter",
                "useFakeTimers",
                "restore",
                "reset",
                "resetHistory",
                "resetBehavior",
                "verify",
                "verifyAndRestore",
            ];

            methods.forEach(function (method) {
                assert.isFunction(
                    sinon[method],
                    `Expected ${method} to be a function`,
                );
            });
        });

        it("should preserve name and arity of createSandbox", function () {
            const sinon = createApi();
            assert.equals(sinon.createSandbox.name, "createSandbox");
            assert.equals(sinon.createSandbox.length, 1);
        });

        it("should preserve name and arity of createStubInstance", function () {
            const sinon = createApi();
            assert.equals(sinon.createStubInstance.name, "createStubInstance");
            assert.equals(sinon.createStubInstance.length, 1);
        });

        it("should preserve name and arity of sandboxed methods", function () {
            const sinon = createApi();
            const sandbox = sinon.createSandbox();

            // spy and stub on sandbox have length 0 as per implementation
            assert.equals(sandbox.spy.name, "spy");
            assert.equals(sandbox.spy.length, 0);
            assert.equals(sandbox.stub.name, "stub");
            assert.equals(sandbox.stub.length, 0);
            assert.equals(sandbox.mock.name, "mock");
            assert.equals(sandbox.mock.length, 0);
            assert.equals(sandbox.fake.name, "fake");
            assert.equals(sandbox.fake.length, 1);
        });
    });

    describe("call order isolation between sandboxes (issue #2472)", function () {
        it("calledImmediatelyBefore works correctly with separate sandboxes", function () {
            const sandbox1 = createSandbox();
            const sandbox2 = createSandbox();

            const spy1a = sandbox1.spy();
            const spy1b = sandbox1.spy();
            const spy2a = sandbox2.spy();
            const spy2b = sandbox2.spy();

            spy1a();
            spy2a();
            spy1b();
            spy2b();

            assert.isTrue(spy1a.calledImmediatelyBefore(spy1b));
            assert.isTrue(spy2a.calledImmediatelyBefore(spy2b));

            sandbox1.restore();
            sandbox2.restore();
        });

        it("calledImmediatelyAfter works correctly with separate sandboxes", function () {
            const sandbox1 = createSandbox();
            const sandbox2 = createSandbox();

            const spy1a = sandbox1.spy();
            const spy1b = sandbox1.spy();
            const spy2a = sandbox2.spy();
            const spy2b = sandbox2.spy();

            spy1a();
            spy2a();
            spy1b();
            spy2b();

            assert.isTrue(spy1b.calledImmediatelyAfter(spy1a));
            assert.isTrue(spy2b.calledImmediatelyAfter(spy2a));

            sandbox1.restore();
            sandbox2.restore();
        });

        it("stubs in different sandboxes have isolated callIds", function () {
            const sandbox1 = createSandbox();
            const sandbox2 = createSandbox();

            const stub1a = sandbox1.stub();
            const stub1b = sandbox1.stub();
            const stub2a = sandbox2.stub();
            const stub2b = sandbox2.stub();

            stub1a();
            stub2a();
            stub1b();
            stub2b();

            assert.isTrue(stub1a.calledImmediatelyBefore(stub1b));
            assert.isTrue(stub2a.calledImmediatelyBefore(stub2b));

            sandbox1.restore();
            sandbox2.restore();
        });
    });
});
