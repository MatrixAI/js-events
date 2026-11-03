import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'tmp/browser-smoke');
const html = `<!doctype html><meta charset="utf-8"><script type="module">
try {
  const { AbstractEvent, Evented, EventAll, EventDefault, EventError } = await import('/dist/index.js');
  const direct = await import('/dist/AbstractEvent.js');
  function check(condition, message) {
    if (!condition) throw new Error(message);
  }
  check(direct.default === AbstractEvent, 'subpath identity');
  class Payload extends AbstractEvent {}
  const payload = new Payload({ detail: { value: 42 } });
  check(new AbstractEvent().detail === undefined, 'undefined detail');
  check(payload.clone() instanceof Payload, 'clone subclass');
  check(payload.clone().detail === payload.detail, 'shallow clone detail');
  const Subject = Evented()(class Subject {});
  const subject = new Subject();
  const seen = [];
  subject.addEventListener(Payload.name, function (event) {
    check(this === subject, 'listener receiver');
    check(event.target === subject, 'event target');
    seen.push(event);
  });
  subject.addEventListener(EventAll.name, (event) => seen.push(event.detail));
  check(subject.dispatchEvent(payload), 'dispatch result');
  check(seen.length === 2 && seen.every((event) => event === payload), 'all-event detail');
  const fallback = [];
  subject.addEventListener(EventDefault.name, (event) => fallback.push(event.detail));
  const unknown = new Event('unknown');
  subject.dispatchEvent(unknown);
  check(fallback[0] === unknown, 'default-event detail');
  const failures = [];
  subject.addEventListener(EventError.name, (event) => failures.push(event.detail));
  const failure = new Error('browser failure');
  subject.addEventListener('failure', async () => { throw failure; });
  subject.dispatchEvent(new Event('failure'));
  await Promise.resolve();
  check(failures[0] === failure, 'async error identity');
  subject.addEventListener('cancel', (event) => event.preventDefault());
  check(subject.dispatchEvent(new Event('cancel', { cancelable: true })) === false, 'cancellation');
  await fetch('/result', { method: 'POST', body: JSON.stringify({ status: 'passed', assertions: 11, userAgent: navigator.userAgent }) });
} catch (error) {
  await fetch('/result', { method: 'POST', body: JSON.stringify({ status: 'failed', error: String(error.stack ?? error) }) });
}
</script>`;

async function main() {
  fs.rmSync(artifacts, { recursive: true, force: true });
  fs.mkdirSync(path.join(artifacts, 'profile'), { recursive: true });
  let resolveResult;
  let rejectResult;
  const result = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  const server = createServer(async (request, response) => {
    if (request.url === '/result' && request.method === 'POST') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      try {
        resolveResult(JSON.parse(Buffer.concat(chunks).toString()));
        response.end('received');
      } catch (error) {
        rejectResult(error);
        response.writeHead(400).end();
      }
      return;
    }
    if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end(html);
      return;
    }
    if (/^\/dist\/[A-Za-z]+\.js$/.test(request.url ?? '')) {
      const file = path.join(root, request.url.slice(1));
      if (fs.existsSync(file)) {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(fs.readFileSync(file));
        return;
      }
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const log = fs.openSync(path.join(artifacts, 'browser.log'), 'w');
  const browser = spawn(
    process.env.EVENTS_BROWSER ?? 'firefox',
    [
      '--headless',
      '--no-remote',
      '--profile',
      path.join(artifacts, 'profile'),
      `http://127.0.0.1:${server.address().port}/`,
    ],
    {
      stdio: ['ignore', log, log],
    },
  );
  browser.once('error', rejectResult);
  const exited = new Promise((resolve) => browser.once('close', resolve));
  browser.once('exit', (code) =>
    rejectResult(new Error(`Browser exited before result: ${code}`)),
  );
  const timeout = setTimeout(
    () => rejectResult(new Error('Browser smoke exceeded 20 seconds')),
    20000,
  );
  try {
    const report = await result;
    fs.writeFileSync(
      path.join(artifacts, 'report.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          name: 'browser-smoke',
          kind: 'import-smoke',
          browserConformance: false,
          ...report,
        },
        null,
        2,
      ) + '\n',
    );
    assert.equal(report.status, 'passed', report.error);
    process.stdout.write(
      `Firefox import smoke passed (${report.assertions} assertions); not full browser conformance.\n`,
    );
  } finally {
    clearTimeout(timeout);
    browser.kill();
    await exited;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.closeSync(log);
    fs.rmSync(path.join(artifacts, 'profile'), {
      recursive: true,
      force: true,
    });
  }
}

await main();
