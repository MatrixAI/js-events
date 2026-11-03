import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const candidate = path.join(root, 'tmp/package-candidate');

function run(command, args, cwd = root) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function main() {
  fs.rmSync(candidate, { recursive: true, force: true });
  fs.mkdirSync(candidate, { recursive: true });
  const manifest = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
  const packageJSON = JSON.parse(manifest);
  assert.equal(packageJSON.type, 'module');
  assert.equal(packageJSON.engines.node, '>=24.0.0');
  assert.equal(packageJSON.main, './dist/index.js');
  assert.equal(packageJSON.types, './dist/index.d.ts');
  assert.equal(packageJSON.devDependencies?.['@matrixai/lint'], undefined);
  assert.deepEqual(packageJSON.dependencies ?? {}, {});
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let packed;
  if (process.env.EVENTS_PACKAGE_ARCHIVE != null) {
    const archive = path.resolve(process.env.EVENTS_PACKAGE_ARCHIVE);
    const filename = path.basename(archive);
    fs.copyFileSync(archive, path.join(candidate, filename));
    packed = {
      name: packageJSON.name,
      version: packageJSON.version,
      filename,
      files: run('tar', ['-tzf', archive])
        .trim()
        .split('\n')
        .map((file) => ({
          path: file.replace(/^package\//, ''),
        })),
    };
  } else {
    [packed] = JSON.parse(
      run(npm, [
        'pack',
        '--offline',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        candidate,
      ]),
    );
  }
  assert.equal(packed.name, packageJSON.name);
  assert.equal(packed.version, packageJSON.version);
  const files = packed.files.map((file) => file.path);
  for (const file of files) {
    assert.ok(
      /^(?:dist\/.*\.(?:js|js\.map|d\.ts)|package\.json|README\.md|LICENSE)$/.test(
        file,
      ),
      `Unexpected package entry: ${file}`,
    );
  }
  const modules = [
    'index',
    'AbstractEvent',
    'Evented',
    'EventAll',
    'EventDefault',
    'EventError',
    'types',
    'utils',
  ];
  for (const module of modules) {
    assert.ok(files.includes(`dist/${module}.js`));
    assert.ok(files.includes(`dist/${module}.d.ts`));
  }
  run('tar', ['-xzf', path.join(candidate, packed.filename), '-C', candidate]);
  const packageRoot = path.join(candidate, 'package');
  assert.equal(
    fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
    manifest,
  );
  const consumer = path.join(candidate, 'consumer');
  const scope = path.join(consumer, 'node_modules/@matrixai');
  fs.mkdirSync(scope, { recursive: true });
  fs.symlinkSync(packageRoot, path.join(scope, 'events'), 'dir');
  fs.writeFileSync(path.join(consumer, 'package.json'), '{"type":"module"}\n');
  try {
    run(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
      import assert from 'node:assert/strict';
      import { AbstractEvent, Evented, EventAll, EventDefault, EventError, utils } from '@matrixai/events';
      import DirectEvent from '@matrixai/events/AbstractEvent.js';
      import { Evented as DirectEvented } from '@matrixai/events/Evented.js';
      assert.equal(AbstractEvent, DirectEvent);
      assert.equal(Evented, DirectEvented);
      assert.ok(import.meta.resolve('@matrixai/events/AbstractEvent.js.map').endsWith('/dist/AbstractEvent.js.map'));
      class Payload extends AbstractEvent {}
      const event = new Payload({ detail: { value: 42 } });
      const clone = event.clone();
      assert.ok(clone instanceof Payload);
      assert.notEqual(clone, event);
      assert.equal(clone.detail, event.detail);
      assert.equal(new AbstractEvent().detail, undefined);
      const Subject = Evented()(class Subject {});
      const subject = new Subject();
      const calls = [];
      subject.addEventListener(Payload.name, function (received) {
        assert.equal(this, subject);
        assert.equal(received.target, subject);
        assert.equal(received.currentTarget, subject);
        calls.push(received);
      });
      subject.addEventListener(EventAll.name, (received) => calls.push(received.detail));
      assert.equal(subject.dispatchEvent(event), true);
      assert.deepEqual(calls, [event, event]);
      const fallback = [];
      subject.addEventListener(EventDefault.name, (received) => fallback.push(received.detail));
      const unknown = new Event('unknown');
      assert.equal(subject.dispatchEvent(unknown), true);
      assert.deepEqual(fallback, [unknown]);
      const failure = new Error('consumer failure');
      const failures = [];
      subject.addEventListener(EventError.name, (received) => failures.push(received.detail));
      subject.addEventListener('failure', () => { throw failure; });
      subject.dispatchEvent(new Event('failure'));
      assert.deepEqual(failures, [failure]);
      assert.ok(subject[utils.eventTarget] instanceof EventTarget);
      for (const module of ${JSON.stringify(modules)}) {
        await import('@matrixai/events/' + module + '.js');
      }
      const metadata = await import('@matrixai/events/package.json', { with: { type: 'json' } });
      assert.equal(metadata.default.version, ${JSON.stringify(packageJSON.version)});
    `,
      ],
      consumer,
    );
    const fixture = path.join(consumer, 'consumer.mts');
    fs.writeFileSync(
      fixture,
      [
        "import type { Evented as EventedType, types } from '@matrixai/events';",
        "import type { EventHandlerInfo } from '@matrixai/events/types.js';",
        "import { AbstractEvent, Evented, EventAll, EventDefault, EventError, utils } from '@matrixai/events';",
        "import DirectEvent from '@matrixai/events/AbstractEvent.js';",
        "import { eventTarget } from '@matrixai/events/Evented.js';",
        'class Payload extends AbstractEvent<string> {}',
        'interface Subject extends EventedType {}',
        '@Evented()',
        'class Subject {}',
        'const subject = new Subject();',
        'const payload: Payload = new Payload({ detail: "typed" });',
        'const direct: DirectEvent<string> = payload;',
        'const detail: string = payload.clone().detail;',
        'const target: EventTarget = subject[eventTarget];',
        'const handlers: ReadonlyMap<string, Set<EventHandlerInfo>> = subject[utils.eventHandlers];',
        'const handled: types.ReadonlyWeakSet<Event> = subject[utils.eventHandled];',
        'subject.addEventListener(Payload.name, (event: Event) => void event.type);',
        'const all: Event = new EventAll({ detail: payload });',
        'const fallback: Event = new EventDefault({ detail: payload });',
        'const error: Event = new EventError({ detail: new Error("typed") });',
        'void [direct, detail, target, handlers, handled, all, fallback, error];',
        '',
      ].join('\n'),
    );
    const configFile = ts.readConfigFile(
      path.join(root, 'tsconfig.json'),
      ts.sys.readFile,
    );
    assert.equal(configFile.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      root,
    );
    const program = ts.createProgram([fixture], {
      ...parsed.options,
      noEmit: true,
      incremental: false,
      tsBuildInfoFile: undefined,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      }),
    );
  } finally {
    fs.rmSync(path.join(consumer, 'node_modules'), {
      recursive: true,
      force: true,
    });
  }
  fs.writeFileSync(
    path.join(candidate, 'report.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        status: 'passed',
        name: packageJSON.name,
        version: packageJSON.version,
        runtime: process.version,
        archive: packed.filename,
        files,
        checks: [
          'allowlist',
          'canonical-manifest',
          'node-consumers',
          'declaration-consumers',
        ],
        installerTest: false,
      },
      null,
      2,
    ) + '\n',
  );
  process.stdout.write(
    'Built package imports, runtime vectors, and declarations passed.\n',
  );
}

main();
