import commons from "@sinonjs/commons";
import samsam from "@sinonjs/samsam";
import collectOwnMethods from "./collect-own-methods.js";
import getPropertyDescriptor from "./util/core/get-property-descriptor.js";
import sinonAssert from "./assert.js";
import * as sinonClock from "./util/fake-timers.js";
import sinonMock from "./mock.js";
import sinonSpy from "./spy.js";
import sinonStub from "./stub.js";
import sinonCreateStubInstance from "./create-stub-instance.js";
import sinonFake from "./fake.js";
import extend from "./util/core/extend.js";

const { array: arrayProto } = commons.prototypes;
const { deprecated: logger, valueToString } = commons;
const { createMatcher: match } = samsam;

const DEFAULT_LEAK_THRESHOLD = 10000;

const filter = arrayProto.filter;

/**
 * @callback RestorerFunction
 * @returns {void}
 */
const forEach = arrayProto.forEach;
const push = arrayProto.push;
const reverse = arrayProto.reverse;

function applyOnEach(fakes, method) {
    const matchingFakes = filter(fakes, function (fake) {
        return typeof fake[method] === "function";
    });

    forEach(matchingFakes, function (fake) {
        fake[method]();
    });
}

function throwOnAccessors(descriptor) {
    if (typeof descriptor.get === "function") {
        throw new Error("Use sandbox.replaceGetter for replacing getters");
    }

    if (typeof descriptor.set === "function") {
        throw new Error("Use sandbox.replaceSetter for replacing setters");
    }
}

function verifySameType(object, property, replacement) {
    const original = object[property];
    const originalType = typeof original;
    const replacementType = typeof replacement;

    if (originalType !== replacementType) {
        throw new TypeError(
            `Cannot replace ${originalType} with ${replacementType}`,
        );
    }
}

function checkForValidArguments(descriptor, property, replacement) {
    if (typeof descriptor === "undefined") {
        throw new TypeError(
            `Cannot replace non-existent property ${valueToString(
                property,
            )}. Perhaps you meant sandbox.define()?`,
        );
    }

    if (typeof replacement === "undefined") {
        throw new TypeError("Expected replacement argument to be defined");
    }
}

/**
 * Creates a sandbox.
 *
 * @param {object} [opts] Options for the sandbox
 * @returns {object} The sandbox object
 * @class
 */
export default function Sandbox(opts = {}) {
    const sandbox = this;
    const assertOptions = opts.assertOptions || {};
    const fakeRestorers = [];

    let collection = [];
    let loggedLeakWarning = false;
    sandbox.leakThreshold = DEFAULT_LEAK_THRESHOLD;

    // Context object for this sandbox, used to isolate callId between parallel tests
    const sandboxContext = { callId: 0 };

    function addToCollection(object) {
        if (
            push(collection, object) > sandbox.leakThreshold &&
            !loggedLeakWarning
        ) {
            logger.printWarning(
                `Sinon sandbox: The number of fakes in the sandbox has exceeded the leak threshold of ${sandbox.leakThreshold}. ` +
                    "To avoid memory leaks, ensure you are restoring the sandbox after each test. " +
                    "To disable this warning, modify the leakThreshold property of your sandbox.",
            );
            loggedLeakWarning = true;
        }
    }

    sandbox.assert = sinonAssert.createAssertObject(assertOptions);

    // this is for testing only
    sandbox.getFakes = function getFakes() {
        return collection;
    };

    sandbox.createStubInstance = function createStubInstance() {
        const stubbed = sinonCreateStubInstance.apply(null, arguments);
        const ownMethods = collectOwnMethods(stubbed);

        forEach(ownMethods, function (method) {
            addToCollection(method);
        });

        return stubbed;
    };

    sandbox.inject = function inject(obj) {
        obj.spy = function spy() {
            return sandbox.spy.apply(null, arguments);
        };

        obj.stub = function stub() {
            return sandbox.stub.apply(null, arguments);
        };

        obj.mock = function mock() {
            return sandbox.mock.apply(null, arguments);
        };

        obj.createStubInstance = function createStubInstanceWrapper() {
            return sandbox.createStubInstance.apply(sandbox, arguments);
        };

        obj.fake = function fake() {
            return sandbox.fake.apply(null, arguments);
        };

        obj.define = function define() {
            return sandbox.define.apply(null, arguments);
        };

        obj.replace = function replace() {
            return sandbox.replace.apply(null, arguments);
        };

        obj.replaceSetter = function replaceSetter() {
            return sandbox.replaceSetter.apply(null, arguments);
        };

        obj.replaceGetter = function replaceGetter() {
            return sandbox.replaceGetter.apply(null, arguments);
        };

        if (sandbox.clock) {
            obj.clock = sandbox.clock;
        }

        obj.match = match;

        return obj;
    };

    function commonPostInitSetup(
        args,
        spy,
        isStub,
        shouldAddToCollection = true,
    ) {
        if (isStub && args.length >= 3) {
            throw new TypeError(
                "stub(obj, 'meth', fn) has been removed, see documentation",
            );
        }

        if (shouldAddToCollection) {
            addToCollection(spy);
        }

        return spy;
    }

    function addReturnedMethodsToCollection(result) {
        if (
            result &&
            (typeof result === "object" || typeof result === "function")
        ) {
            forEach(collectOwnMethods(result), addToCollection);
        }
    }

    sandbox.spy = function () {
        // Use withContext to pass sandbox context for isolated callId tracking
        const args = arrayProto.concat(
            [sandboxContext],
            arrayProto.slice(arguments),
        );
        const createdSpy = sinonSpy.withContext.apply(sinonSpy, args);
        const result = commonPostInitSetup(
            arguments,
            createdSpy,
            false,
            !(arguments.length === 1 && typeof arguments[0] === "object"),
        );
        addReturnedMethodsToCollection(result);
        return result;
    };
    Object.defineProperty(sandbox.spy, "name", {
        value: "spy",
        configurable: true,
    });
    Object.defineProperty(sandbox.spy, "length", {
        value: 0,
        configurable: true,
    });
    extend(sandbox.spy, sinonSpy);

    sandbox.stub = function () {
        // Use withContext to pass sandbox context for isolated callId tracking
        const args = arrayProto.concat(
            [sandboxContext],
            arrayProto.slice(arguments),
        );
        const createdStub = sinonStub.withContext.apply(sinonStub, args);
        const result = commonPostInitSetup(
            arguments,
            createdStub,
            true,
            !(arguments.length === 1 && typeof arguments[0] === "object"),
        );
        addReturnedMethodsToCollection(result);
        return result;
    };
    Object.defineProperty(sandbox.stub, "name", {
        value: "stub",
        configurable: true,
    });
    Object.defineProperty(sandbox.stub, "length", {
        value: 0,
        configurable: true,
    });
    extend(sandbox.stub, sinonStub);

    sandbox.mock = function () {
        const m = sinonMock.apply(null, arguments);

        addToCollection(m);

        return m;
    };
    Object.defineProperty(sandbox.mock, "name", {
        value: "mock",
        configurable: true,
    });
    Object.defineProperty(sandbox.mock, "length", {
        value: 0,
        configurable: true,
    });
    extend(sandbox.mock, sinonMock);

    sandbox.reset = function reset() {
        applyOnEach(collection, "reset");
        applyOnEach(collection, "resetHistory");
    };

    sandbox.resetBehavior = function resetBehavior() {
        applyOnEach(collection, "resetBehavior");
    };

    sandbox.resetHistory = function resetHistory() {
        for (let i = 0; i < collection.length; i++) {
            const f = collection[i];
            const method = f.resetHistory || f.reset;
            if (typeof method === "function") {
                method.call(f);
            }
        }
    };

    sandbox.verify = function verify() {
        applyOnEach(collection, "verify");
    };

    sandbox.verifyAndRestore = function verifyAndRestore() {
        let exception;

        try {
            sandbox.verify();
        } catch (e) {
            exception = e;
        }

        sandbox.restore();

        if (exception) {
            throw exception;
        }
    };

    sandbox.restore = function restore() {
        if (arguments.length) {
            throw new Error(
                "sandbox.restore() does not take any parameters. Perhaps you meant stub.restore()",
            );
        }

        reverse(fakeRestorers);
        forEach(fakeRestorers, function (restorer) {
            restorer();
        });
        fakeRestorers.length = 0;

        reverse(collection);
        applyOnEach(collection, "restore");
        collection = [];
    };

    sandbox.restoreContext = function restoreContext() {
        forEach(sandbox.injectedKeys, function (injectedKey) {
            delete sandbox.injectInto[injectedKey];
        });
        sandbox.injectedKeys.length = 0;
    };

    /**
     * Creates a restorer function for the property
     * @param {object} object the object containing the property
     * @param {string} property the name of the property
     * @param {boolean} [forceAssignment] if true, uses assignment instead of DefineProperty
     * @returns {RestorerFunction} restorer function
     */
    function getFakeRestorer(object, property, forceAssignment = false) {
        const descriptor = getPropertyDescriptor(object, property);
        const value = forceAssignment && object[property];

        function restorer() {
            if (forceAssignment) {
                object[property] = value;
            } else if (descriptor?.isOwn) {
                Object.defineProperty(object, property, descriptor);
            } else {
                delete object[property];
            }
        }

        restorer.sinon = true;
        restorer.object = object;
        restorer.property = property;

        return restorer;
    }

    function verifyNotReplaced(object, property) {
        forEach(fakeRestorers, function (fakeRestorer) {
            if (
                fakeRestorer.object === object &&
                fakeRestorer.property === property
            ) {
                throw new TypeError(
                    `Attempted to replace ${valueToString(
                        property,
                    )} which is already replaced`,
                );
            }
        });
    }

    sandbox.replace = function replace(object, property, replacement) {
        const descriptor = getPropertyDescriptor(object, property);

        checkForValidArguments(descriptor, property, replacement);
        verifyNotReplaced(object, property);
        throwOnAccessors(descriptor);

        verifySameType(object, property, replacement);

        // store a function for restoring the replaced property
        push(fakeRestorers, getFakeRestorer(object, property));

        object[property] = replacement;

        return replacement;
    };

    sandbox.replace.usingAccessor = function replaceUsingAccessor(
        object,
        property,
        replacement,
    ) {
        const descriptor = getPropertyDescriptor(object, property);

        checkForValidArguments(descriptor, property, replacement);
        verifyNotReplaced(object, property);

        verifySameType(object, property, replacement);

        // store a function for restoring the replaced property
        push(fakeRestorers, getFakeRestorer(object, property, true));

        object[property] = replacement;

        return replacement;
    };

    sandbox.define = function define(object, property, value) {
        const descriptor = getPropertyDescriptor(object, property);

        if (typeof property === "undefined") {
            throw new TypeError(
                `Cannot define the already existing property ${valueToString(
                    property,
                )}. Perhaps you meant sandbox.replace()?`,
            );
        }

        if (descriptor && descriptor.isOwn) {
            throw new TypeError(
                `Cannot define the already existing property ${valueToString(
                    property,
                )}. Perhaps you meant sandbox.replace()?`,
            );
        }

        // store a function for restoring the defined property
        push(fakeRestorers, getFakeRestorer(object, property));

        Object.defineProperty(object, property, {
            value: value,
            configurable: true,
            enumerable: true,
            writable: true,
        });

        return value;
    };

    sandbox.replaceSetter = function replaceSetter(
        object,
        property,
        replacement,
    ) {
        const descriptor = getPropertyDescriptor(object, property);

        if (typeof descriptor === "undefined") {
            throw new TypeError(
                `Cannot replace non-existent property ${valueToString(
                    property,
                )}`,
            );
        }

        if (typeof replacement !== "function") {
            throw new TypeError(
                "Expected replacement argument to be a function",
            );
        }

        verifyNotReplaced(object, property);

        if (typeof descriptor.set !== "function") {
            throw new Error("`object.property` is not a setter");
        }

        if (!descriptor.configurable) {
            throw new TypeError(
                `Descriptor for property ${valueToString(
                    property,
                )} is not configurable`,
            );
        }

        // store a function for restoring the replaced property
        push(fakeRestorers, getFakeRestorer(object, property));

        Object.defineProperty(object, property, {
            get: descriptor.get,
            set: replacement,
            configurable: true,
            enumerable: descriptor.enumerable,
        });

        return replacement;
    };

    sandbox.replaceGetter = function replaceGetter(
        object,
        property,
        replacement,
    ) {
        const descriptor = getPropertyDescriptor(object, property);

        if (typeof descriptor === "undefined") {
            throw new TypeError(
                `Cannot replace non-existent property ${valueToString(
                    property,
                )}`,
            );
        }

        if (typeof replacement !== "function") {
            throw new TypeError(
                "Expected replacement argument to be a function",
            );
        }

        verifyNotReplaced(object, property);

        if (typeof descriptor.get !== "function") {
            throw new Error("`object.property` is not a getter");
        }

        if (!descriptor.configurable) {
            throw new TypeError(
                `Descriptor for property ${valueToString(
                    property,
                )} is not configurable`,
            );
        }

        // store a function for property for restoring the replaced property
        push(fakeRestorers, getFakeRestorer(object, property));

        Object.defineProperty(object, property, {
            get: replacement,
            set: descriptor.set,
            configurable: true,
            enumerable: descriptor.enumerable,
        });

        return replacement;
    };

    sandbox.useFakeTimers = function useFakeTimers(args) {
        const clock = sinonClock.useFakeTimers.call(null, args);

        sandbox.clock = clock;
        addToCollection(clock);

        return clock;
    };

    sandbox.fake = function fake() {
        // Use withContext to pass sandbox context for isolated callId tracking
        const args = arrayProto.concat(
            [sandboxContext],
            arrayProto.slice(arguments),
        );
        const createdFake = sinonFake.withContext.apply(sinonFake, args);
        const result = commonPostInitSetup(arguments, createdFake, false);
        addToCollection(result);
        return result;
    };
    Object.defineProperty(sandbox.fake, "name", {
        value: "fake",
        configurable: true,
    });
    Object.defineProperty(sandbox.fake, "length", {
        value: 1,
        configurable: true,
    });
    extend(sandbox.fake, sinonFake);
    Object.defineProperty(sandbox.fake, "name", {
        value: "fake",
        configurable: true,
    });
    Object.defineProperty(sandbox.fake, "length", {
        value: 1,
        configurable: true,
    });

    function addFakeBehaviorToCollection(method) {
        sandbox.fake[method] = function () {
            // Add sandboxContext as the second argument for context-aware fakes
            const args = arrayProto.slice(arguments);
            args.push(sandboxContext);
            const result = sinonFake[method].apply(sinonFake, args);
            addToCollection(result);
            return result;
        };
    }

    addFakeBehaviorToCollection("returns");
    addFakeBehaviorToCollection("throws");
    addFakeBehaviorToCollection("resolves");
    addFakeBehaviorToCollection("rejects");
    addFakeBehaviorToCollection("yields");
    addFakeBehaviorToCollection("yieldsAsync");
}

Sandbox.prototype.match = match;
