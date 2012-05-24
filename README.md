# Sinon.JS

Standalone and test framework agnostic JavaScript test spies, stubs and mocks.

## Installation

via [npm (node package manager)](http://github.com/isaacs/npm)

    $ npm install sinon

or install via git by cloning the repository and including sinon.js
in your project, as you would any other third party library.

Don't forget to include the parts of Sinon.JS that you want to use as well
(i.e. spy.js).

## Usage

See the [sinon project homepage](http://sinonjs.org/)

## Goals

* No global pollution
* Easy to use
* Require minimal “integration”
* Easy to embed seamlessly with any testing framework
* Easily fake any interface
* Ship with ready-to-use fakes for XMLHttpRequest, timers and more

## Develop?

Check out [todo.org](http://github.com/cjohansen/Sinon.JS/raw/1.0.0/todo.org) in the project repository

## Run the tests


### On Node

    $ npm test

OR

    $ node test/node/run.js

### In the browser, via JsTestDriver

* Install [Node.js](http://nodejs.org/) &amp; [NPM](http://npmjs.org/)
* `$ npm install buster-format`
* Install Java
* Download [jsTestDriver](http://code.google.com/p/js-test-driver/)
* Start the JsTestDriver server
  `$ java -jar JsTestDriver.jar --port 4224`
* Open a browser, go to [http://localhost:4224/](http://localhost:4224) and click 'Capture this Browser'
* run the tests
  `$ java -jar JsTestDriver.jar --tests all --reset`


### On Rhino

I've added a rudimentary setup for running the tests on Rhino with env.js (as
this is a fairly common test setup, Sinon should support it). The files are
located in test/rhino, but there are currently quite a few test failures. I
believe these are not all bugs - many are probably problems with the tests
running in Rhino. Run tests from the project root (load paths depend on it):

    $ java -jar js.jar -opt -1 test/rhino/run.js
