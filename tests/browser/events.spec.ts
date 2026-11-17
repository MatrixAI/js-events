import type * as Events from '#index.js';
import { expect, test } from './fixture.js';
import { browserRealms } from './utils.js';

for (const realm of browserRealms) {
  test(`event behavior works in a ${realm}`, async ({ browserScenario }) => {
    const result = await browserScenario<
      typeof Events,
      {
        hasTypes: boolean;
        clone: boolean;
        receiver: boolean;
        dispatch: boolean;
        all: boolean;
        fallback: boolean;
        asyncError: boolean;
        cancelled: boolean;
        once: number;
        signal: number;
      }
    >(realm, async (library) => {
      class Payload extends library.AbstractEvent<{ value: number }> {}
      const payload = new Payload({ detail: { value: 42 } });
      const cloned = payload.clone();
      const Subject = library.Evented()(class Subject {});
      const subject = new Subject();
      const seen: Array<Event> = [];
      let receiver = false;
      subject.addEventListener(Payload.name, function (event) {
        receiver = this === subject && event.target === subject;
        seen.push(event);
      });
      subject.addEventListener(library.EventAll.name, (event) => {
        seen.push((event as InstanceType<typeof library.EventAll>).detail);
      });
      const dispatch = subject.dispatchEvent(payload);
      const all = seen.length === 2 && seen.every((event) => event === payload);
      let fallback = false;
      subject.addEventListener(library.EventDefault.name, (event) => {
        fallback ||=
          (event as InstanceType<typeof library.EventDefault>).detail.type ===
          'unknown';
      });
      subject.dispatchEvent(new Event('unknown'));
      const failure = new Error('browser failure');
      let asyncError = false;
      subject.addEventListener(library.EventError.name, (event) => {
        asyncError =
          (event as InstanceType<typeof library.EventError>).detail === failure;
      });
      subject.addEventListener('failure', async () => {
        throw failure;
      });
      subject.dispatchEvent(new Event('failure'));
      await Promise.resolve();
      subject.addEventListener('cancel', (event) => event.preventDefault());
      const cancelled = !subject.dispatchEvent(
        new Event('cancel', { cancelable: true }),
      );
      let once = 0;
      let signal = 0;
      const controller = new AbortController();
      subject.addEventListener('options', () => ++once, { once: true });
      subject.addEventListener('options', () => ++signal, {
        signal: controller.signal,
      });
      subject.dispatchEvent(new Event('options'));
      controller.abort();
      subject.dispatchEvent(new Event('options'));
      return {
        hasTypes: Reflect.has(library, 'types'),
        clone: cloned instanceof Payload && cloned.detail === payload.detail,
        receiver,
        dispatch,
        all,
        fallback,
        asyncError,
        cancelled,
        once,
        signal,
      };
    });
    expect(result).toEqual({
      hasTypes: true,
      clone: true,
      receiver: true,
      dispatch: true,
      all: true,
      fallback: true,
      asyncError: true,
      cancelled: true,
      once: 1,
      signal: 1,
    });
  });
}
