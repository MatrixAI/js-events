# js-events

Events for push-flow abstractions.

### `AbstractEvent`

```ts
// For when you just want a regular event without `detail`
// Note that the `detail` type is `undefined`, unlike `CustomEvent`
class Event1 extends AbstractEvent {}

// For when you want a event with `detail`
class Event2 extends AbstractEvent<string> {}

// Allow caller to customise the `detail` type
// Note that the `detail` type is `unknown`
// This would be rare to use, prefer `Event4`
class Event3<T> extends AbstractEvent<T> {}

// Allow caller to customise the `detail` type
class Event4<T extends Event = Event> extends AbstractEvent<T> {}

// When you need to customise the constructor signature
class Event5 extends AbstractEvent<string> {
  constructor(options: EventInit & { detail: string }) {
    // Make sure you pass `arguments`!
    super(Event5.name, options, arguments);
  }
}
```

When redispatching an event, you must call `event.clone()`. The same instance
cannot be redispatched. When the event is cloned, all constructor parameters are
shallow-copied.

### `Evented`

We combine `Evented` with `AbstractEvent` to gain type-safety and convenience of
the wildcard any handler.

```ts
class EventCustom extends AbstractEvent {}

interface X extends Evented {}
@Evented()
class X {}

const x = new X();

// Handle specific event, use the `name` property as the key
x.addEventListener(EventCustom.name, (e) => {
  console.log(e as EventCustom);
});

// Handle unhandled events
x.addEventListener(EventDefault.name, (e) => {
  // This is the wrapped underlying event
  console.log((e as EventDefault).detail);
});

// Handle all events
x.addEventListener(EventAll.name, (e) => {
  // This is the wrapped underlying event
  console.log((e as EventAll).detail);
});
```

You can use this style to handle relevant events to perform side-effects, as
well as propagate upwards irrelevant events.

Note that some side-effects you perform may trigger an infinite loop by causing
something to emit the specific event type that you are handling. In these cases
you should specialise handling of those events with a `once: true` option, so
that they are only handled once.

```ts
x.addEventListener(
  EventInfinite.name,
  (e) => {
    console.log(e as EventInfinite);
    performActionThatMayTriggerEventInfinite();
  },
  { once: true },
);
```

This will terminate the infinite loop on the first time it gets handled.

Therefore it is a good idea to always be as specific with your event types as
possible.

Furthermore any unhandled rejections or uncaught exceptions will be redispatched
as `EventError`. However if there's no listener registered for this, it will be
thrown up as an uncaught exception.

## Installation and package boundary

Version 5 declares Node.js 24 as its minimum Node runtime. The event APIs and
the existing runtime namespace exports remain available.

Require Node.js 24 or newer.

```sh
npm install --save @matrixai/events
```

## Development

Require Node.js 24 or newer. The package emits ES2022 ESM and declarations using
NodeNext resolution. Use standard decorators, without legacy decorator metadata.
The root export, `.js` subpaths, wildcard passthrough, and package metadata
export remain compatible; `#*` is internal to build-first tests, not a consumer
API. The package has no runtime dependencies. Published files are allowlisted in
[the manifest](package.json).

```ts
import { AbstractEvent, Evented } from '@matrixai/events';
import EventAll from '@matrixai/events/EventAll.js';
```

The private [standards submodule](.matrixai/matrixai-standards) and
[library-js profile](.matrixai/repo-profile.yml) are governed by
[AGENTS](AGENTS.md). Initialize standards with authorized SSH access:

```sh
git submodule update --init --depth 1 -- .matrixai/matrixai-standards
nix run './.matrixai/matrixai-standards#skills-materializer' -- --standards-root ./.matrixai/matrixai-standards
```

Use `direnv allow` after reviewing [.envrc](.envrc), or enter the same
integrated shell manually with `nix develop --no-pure-eval`. Activation does not
fetch secrets, install npm dependencies, or change persistent shell options.
Local state in `.direnv`, `.devenv`, and `tmp` is ignored. Once active, run
commands directly rather than nesting direnv activation. Devenv is the flake
integration compatibility wrapper, not a separate flakeless project. Its 2.4.0
commands are `tasks`, `test`, `up`, and `version`; inspect `devenv --help` for
the pinned surface.

```sh
npm ci --ignore-scripts
npm run lintfix
npm test
nix build '.#checks.x86_64-linux.runtime'
```

MatrixAI lint comes from `pkgs.matrixai-lint` in the selected public producer,
with explicit Nix and shell backends. `nix fmt` uses that same lint authority.
There is no npm lint dependency or separate lint flake input. Lint scripts need
the development shell's tools; hermetic checks provide their own environment.

Tests use Vitest with standard decorators and a 20-second default timeout. Local
tests build incrementally; hermetic checks use prebuilt output. JUnit is written
to `tmp/junit/junit.xml`. The optional static portability scan rejects
non-relative emitted imports; run `npm run build` followed by
`node ./scripts/check-portable.mjs`. Browser integration uses Playwright and a
compiled bundle in Chromium document and dedicated-worker realms. It is not full
browser or deployed-platform conformance.

## Hermetic checks and prepared archives

[The flake](flake.nix) exposes independent `unit-js`, `lint`, `default`, and
`runtime` checks on x86_64-linux. They do not depend on direnv, devenv,
installed local npm packages, or live developer state. Reports and reusable
artifacts are in each check output. Before Git-backed Nix evaluation, stage
exact new input files; tracked edits and deletions are already visible. The
portability scan above remains a local command, not part of the default gate.

```sh
nix flake check --no-write-lock-file -L
nix build '.#packages.x86_64-linux.npm-package' --no-link --print-out-paths
nix build '.#packages.x86_64-linux.npm-package-unpacked' --no-link --print-out-paths
nix eval '.#packages.x86_64-linux.npm-package.npmPackage' --json
```

`npm-package` is a prepared `.tgz` with compiled code and declarations, not a
Git source archive requiring a consumer-side build. Its manifest is unchanged.
The descriptor records npm dependency and source provenance metadata;
`npmDistribution` identifies the prepared archive and has no runtime providers.

Documentation is handwritten Markdown. The local override retires TypeDoc,
generated docs, ignore-based npm packaging, and automatic publication workflows.
Releases are Git-based and require deliberate review. Publishing, tagging, and
version changes are not automatic consequences of a tooling commit.
