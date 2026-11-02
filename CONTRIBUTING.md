# Contributing to Sinon.JS

There are several ways of contributing to Sinon.JS

- Look into [issues tagged `help-wanted`](https://github.com/sinonjs/sinon/issues?q=is%3Aopen+is%3Aissue+label%3A%22Help+wanted%22)
- Help [improve the documentation](https://sinonjs.org) built with [VitePress](https://vitepress.dev). [Documentation issues](https://github.com/sinonjs/sinon/issues?q=is%3Aopen+is%3Aissue+label%3ADocumentation).
- Help someone understand and use Sinon.JS on [Stack Overflow](https://stackoverflow.com/questions/tagged/sinon)
- Report an issue, please read instructions below
- Help with triaging the [issues](https://github.com/sinonjs/sinon/issues). The clearer they are, the more likely they are to be fixed soon.
- Contribute to the code base.

## Contributor Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Reporting an issue

To save everyone time and make it much more likely for your issue to be understood, worked on and resolved quickly, it would help if you're mindful of [How to Report Bugs Effectively](http://www.chiark.greenend.org.uk/~sgtatham/bugs.html) when pressing the "Submit new issue" button.

As a minimum, please report the following:

- Which environment are you using? Browser? Node? Which version(s)?
- Which version of SinonJS?
- How are you loading SinonJS?
- What other libraries are you using?
- What you expected to happen
- What actually happens
- Describe **with code** how to reproduce the faulty behaviour

See [our issue template](https://github.com/sinonjs/sinon/blob/master/.github/) for all details.

## Contributing to the code base

Pick [an issue](https://github.com/sinonjs/sinon/issues) to fix, or pitch
new features. To avoid wasting your time, please ask for feedback on feature
suggestions with [an issue](https://github.com/sinonjs/sinon/issues/new).

Make sure you have read [GitHub's guide on forking](https://guides.github.com/activities/forking/). It explains the general contribution process and key concepts.

### Making a pull request

Please try to [write great commit messages](http://chris.beams.io/posts/git-commit/).

There are numerous benefits to great commit messages

- They allow Sinon.JS users to understand the consequences of updating to a newer version
- They help contributors understand what is going on with the codebase, allowing features and fixes to be developed faster
- They save maintainers time when compiling the changelog for a new release

If you're already a few commits in by the time you read this, you can still [change your commit messages](https://help.github.com/articles/changing-a-commit-message/).

Also, before making your pull request, consider if your commits make sense on their own (and potentially should be multiple pull requests) or if they can be squashed down to one commit (with a great message). There are no hard and fast rules about this, but being mindful of your readers greatly help you author good commits.

### Use EditorConfig

To save everyone some time, please use [EditorConfig](http://editorconfig.org), so your editor helps make
sure we all use the same encoding, indentation, line endings, etc.

### Installation

The Sinon.JS developer environment requires Node/NPM. Please make sure you have
Node installed, and install Sinon's dependencies:

    $ npm install

This will also install a pre-commit hook, that runs style validation on staged files.

### Compatibility

For details on compatibility and browser support, please see [`COMPATIBILITY.md`](COMPATIBILITY.md)

### Linting and style

Sinon.JS uses [ESLint](http://eslint.org) to keep the codebase free of lint, and uses [Prettier](https://prettier.io) to keep consistent style.

If you are contributing to a Sinon project, you'll probably want to configure your editors ([ESLint](https://eslint.org/docs/user-guide/integrations#editors), [Prettier](https://prettier.io/docs/en/editors.html)) to make editing code a more enjoyable experience.

Both Prettier and ESLint will check the code in pre-commit hooks (when installed) and will be run before unit tests in the CI environment. The build will fail if the source code does not pass the checks.

You can run the linter locally:

```
$ npm run lint
```

You can fix a lot of lint violations automatically:

```
$ npm run lint -- --fix
```

You can run prettier locally:

```
$ npm run prettier:check
```

You can fix style violations automatically:

```
$ npm run prettier:write
```

To ensure consistent reporting of lint warnings, you should use the same versions of ESLint and Prettier as defined in `package.json` (which is what the CI servers use).

### Tooling

To transparently handle all issues with different tool versions we recommend using [_ASDF: The Multiple Runtime Manager_][asdf]. You would then need the Node plugin.

<details>

```
asdf plugin add nodejs
asdf install
```

</details>

[asdf]: https://asdf-vm.com

### Run the tests

The following command runs unit tests in Node, a headless browser, and a WebWorker.
The browser suites use Puppeteer.

    $ npm test

To run a suite individually, use `npm run test-node`, `npm run test-headless`, or
`npm run test-webworker`.

##### Testing in development

Sinon.JS uses [Mocha](https://mochajs.org/), please read those docs if you're unfamiliar with it.

If you're doing more than a one line edit, you'll want to have finer control and less restarting of the Mocha

To start tests in dev mode run

    $ npm run test-dev

Dev mode features:

- [watching related files](https://mochajs.org/#w---watch) to restart tests once changes are made
- using [Min reporter](https://mochajs.org/#min), which cleans the console each time tests run, so test results are always on top

Note that in dev mode tests run only in Node. Before creating your PR, please ensure tests are passing in the headless browser and WebWorker as well. To check this, please use the [Run the tests](#run-the-tests) instructions.

### Contract Tests

To ensure Sinon's published Node and browser APIs stay compatible, we use artifact-first contract tests.

```
$ npm run test-contract
```

- `test-distribution` validates the packed npm artifact for CJS and ESM consumers.
- `test-pkg-browser-esm` validates `pkg/sinon-esm.js` in a browser module context.
- `test-pkg-browser-global` validates `pkg/sinon.js` as a browser global.

These tests are mandatory for any source-layout refactors or API changes. Any intentional API change must update the manifest in `test/distribution/public-api-manifest.json` with explicit reviewer sign-off. Source format and build-system changes are allowed only when `npm run test-contract` remains green.

### Compiling a built version

Build requires Node. Under the hood [esbuild](https://esbuild.github.io/) is used.

To build run

    $ node build.cjs

The `lib/` directory is generated output. Do not commit it; rebuild it locally with `npm run build` when you need fresh artifacts. The published npm tarball still includes `lib/` via the package allowlist.

## Contributing to documentation

The documentation is built with [VitePress](https://vitepress.dev).

### Local setup

```sh
cd docs
npm install
npm run docs:dev
```

All docs commands (`docs:build`, `test:docs`, etc.) should be run from the `docs/` directory.

### Build and preview

```sh
npm run docs:build
npm run docs:preview
```

### Testing documentation examples

```sh
npm run test:docs
```

### Checking links

Link checking requires [lychee](https://lychee.cli.rs/installation/), which is not installed via npm. Install it separately, then run:

```sh
npm run docs:link-check
```

### Deploying

The site is deployed automatically via GitHub Actions when changes are merged to `main`.
