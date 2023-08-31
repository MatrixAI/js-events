import { AbstractEvent, EventDefault, EventAll, Evented, utils } from '@';
import * as testsUtils from './utils';

describe('index', () => {
  test('abstract event subclasses', () => {
    class Event0 extends AbstractEvent {}
    class Event1<T> extends AbstractEvent<T> {}
    class Event2 extends AbstractEvent<string> {}
    class Event3 extends AbstractEvent<object> {}
    const e0 = new Event0();
    expect(e0.detail).toBeNull();
    const e1 = new Event1();
    expect(e1.detail).toBeNull();
    const e1_ = new Event1({ detail: 'string' });
    expect(e1_.detail).toBe('string');
    // This is not caught by the type system
    const e2 = new Event2();
    expect(e2.detail).toBeNull();
    const e2_ = new Event2({ detail: 'string' });
    expect(e2_.detail).toBe('string');
    const e11 = e1.clone();
    expect(e11.type).toBe(e1.type);
    expect(e11.detail).toBe(e1.detail);
    const e22 = e2.clone();
    expect(e22.type).toBe(e2.type);
    expect(e22.detail).toBe(e2.detail);
    const e3 = new Event3({ detail: { a: 1 } });
    expect(e3.detail).toBe(e3.clone().detail);
  });
  test('abstract event subclasses with different constructors', () => {
    class EventCustom1 extends AbstractEvent<string> {
      constructor(options: CustomEventInit<string>) {
        super(EventCustom1.name, options);
      }
    }
    class EventCustom2 extends AbstractEvent<string> {
      constructor(options: CustomEventInit<string>) {
        super(EventCustom2.name, options, arguments);
      }
    }
    const e1 = new EventCustom1({ detail: 'string' });
    expect(() => e1.clone()).toThrow(TypeError);
    const e2 = new EventCustom2({ detail: 'string' });
    expect(() => e2.clone()).not.toThrowError();
  });
  test('can access event target via symbol', () => {
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    expect(x[utils.eventTarget]).toBeInstanceOf(EventTarget);
  });
  test('listen for events', () => {
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    const eventListenerMock = jest.fn();
    x.addEventListener('a', eventListenerMock);
    x.addEventListener('b', eventListenerMock);
    x.addEventListener('c', eventListenerMock);
    x.addEventListener('d', eventListenerMock);
    const eventA = new Event('a');
    const eventB = new Event('b');
    const eventC = new Event('c');
    const eventD = new Event('d');
    x.dispatchEvent(eventA);
    x.dispatchEvent(eventB);
    x.dispatchEvent(eventC);
    x.dispatchEvent(eventD);
    expect(eventListenerMock).toHaveBeenCalledTimes(4);
    expect(eventListenerMock.mock.calls[0][0]).toBe(eventA);
    expect(eventListenerMock.mock.calls[1][0]).toBe(eventB);
    expect(eventListenerMock.mock.calls[2][0]).toBe(eventC);
    expect(eventListenerMock.mock.calls[3][0]).toBe(eventD);
  });
  test('remove listeners', () => {
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    const eventListenerMock = jest.fn();
    const eventA = new Event('a');
    const eventB = new Event('b');
    const eventC = new Event('c');
    const eventD = new Event('d');
    const fA = (e) => {
      eventListenerMock(e);
    };
    const fB = (e) => {
      eventListenerMock(e);
    };
    const fC = (e) => {
      eventListenerMock(e);
    };
    const fD = (e) => {
      eventListenerMock(e);
    };
    x.addEventListener('a', fA);
    x.addEventListener('b', fB);
    x.addEventListener('c', fC);
    x.addEventListener('d', fD);
    x.removeEventListener('a', fA);
    x.removeEventListener('b', fB);
    x.dispatchEvent(eventA);
    x.dispatchEvent(eventB);
    x.dispatchEvent(eventC);
    x.dispatchEvent(eventD);
    expect(eventListenerMock).toHaveBeenCalledTimes(2);
    expect(eventListenerMock.mock.calls[0][0]).toBe(eventC);
    expect(eventListenerMock.mock.calls[1][0]).toBe(eventD);
  });
  test('listen for `EventAll`', () => {
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    const event = new Event('test event');
    const eventListenerMock = jest.fn();
    x.addEventListener(EventAll.name, eventListenerMock);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(1);
    expect(eventListenerMock).toHaveBeenCalledWith(expect.any(EventAll));
    expect(eventListenerMock.mock.calls[0][0].detail).toBe(event);
    x.dispatchEvent(event);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(3);
    expect(eventListenerMock.mock.calls[1][0].detail).toBe(event);
    expect(eventListenerMock.mock.calls[2][0].detail).toBe(event);
  });
  test('remove listeners for `EventAll', () => {
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    const event = new Event('test event');
    const eventListenerMock = jest.fn();
    x.addEventListener(EventAll.name, eventListenerMock);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(1);
    expect(eventListenerMock).toHaveBeenCalledWith(expect.any(EventAll));
    expect(eventListenerMock.mock.calls[0][0].detail).toBe(event);
    x.dispatchEvent(event);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(3);
    expect(eventListenerMock.mock.calls[1][0].detail).toBe(event);
    expect(eventListenerMock.mock.calls[2][0].detail).toBe(event);
  });
  test('`EventAll` listeners catches all events including events already handled', () => {
    class EventCustom extends AbstractEvent {}
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    const eventListenerSpecificMock = jest.fn();
    const eventListenerAnyMock = jest.fn();
    x.addEventListener(EventCustom.name, eventListenerSpecificMock);
    x.addEventListener(EventAll.name, eventListenerAnyMock);
    x.dispatchEvent(new EventCustom());
    expect(eventListenerSpecificMock).toHaveBeenCalledTimes(1);
    expect(eventListenerAnyMock).toHaveBeenCalledTimes(1);
  });
  test('encapsulated example', async () => {
    // `EventXError` carries a push-error.
    class EventXError extends AbstractEvent<Error> {}

    // `EventXIrrlevant` is an event that does not matter to `Y`
    class EventXIrrelevant extends AbstractEvent {}

    // `EventYError` carries a push-error or encapsulates `EventXError`.
    // It will only wrap `EventYError` when `X` is encapsulated.
    class EventYError extends AbstractEvent<Error | EventXError> {}

    // `EventYStop` will be emitted when the Y is stopped
    class EventYStop extends AbstractEvent {}

    let xBadCounter = 0;

    // Consider `X` to be a domain object that can emit events.
    // It is a dependency of `Y`.
    interface X extends Evented {}
    @Evented()
    class X {
      public doSomethingBad() {
        const c = xBadCounter++;
        this.dispatchEvent(
          new EventXError({
            detail: new Error(`X had something bad happen ${c}`),
          }),
        );
      }

      public doSomethingIrrelevant() {
        this.dispatchEvent(new EventXIrrelevant());
      }

      public async start() {
        // NOOP
      }

      public async stop() {
        // NOOP
      }
    }

    // Consider `Y` to be a domain object that can emit events.
    // It relies on `X` which can be injected or encapsulated.
    interface Y extends Evented {}
    @Evented()
    class Y {
      public readonly isXEncapsulated: boolean;
      protected x: X;
      protected handleEventXError = (e: EventXError) => {
        // Whether injected or encapsulated, it must be handled.
        void this.stop();
        if (this.isXEncapsulated) {
          // Only redispatch if it is encapsulated.
          this.dispatchEvent(
            new EventYError({
              detail: e,
            }),
          );
        }
      };

      protected handleEventX = (e: EventDefault<AbstractEvent>) => {
        if (this.isXEncapsulated) {
          // Redispatch all encapsulated irrelevant events
          this.dispatchEvent(e.detail.clone());
        }
      };

      public constructor(x?: X) {
        if (x == null) {
          this.x = new X();
          this.isXEncapsulated = true;
        } else {
          this.x = x;
          this.isXEncapsulated = false;
        }
      }

      public async start() {
        if (this.isXEncapsulated) {
          await this.x.start();
        }
        // Attach event handlers at the very end
        this.x.addEventListener(EventXError.name, this.handleEventXError, {
          once: true,
        });
        this.x.addEventListener(EventDefault.name, this.handleEventX);
      }

      public async stop() {
        // Detach event handlers at the beginning
        this.x.removeEventListener(EventDefault.name, this.handleEventX);
        this.x.removeEventListener(EventXError.name, this.handleEventXError);

        if (this.isXEncapsulated) {
          await this.x.stop();
        }
        // Imagine this causes an infinite loop
        this.x.doSomethingBad();
        this.dispatchEvent(new EventYStop());
      }

      public doSomethingBad() {
        this.x.doSomethingBad();
      }

      public doSomething() {
        this.x.doSomethingIrrelevant();
      }
    }

    const y1EventAllListenerMock = jest.fn();
    const y1 = new Y();
    y1.addEventListener(EventAll.name, (e) => {
      y1EventAllListenerMock((e as EventAll).detail);
    });
    await y1.start();
    y1.doSomethingBad();

    // Note that the handling of `EventXError` results in stopping `Y`.
    // This is because `Y` is encapsulating `X`,
    // and `X` is a critical part of `Y`. Where when `X` fails
    // Then `Y` needs to stop.
    // We also do not recall `Y.stop` here, because `js-async-init` is not involved.

    // Do note that `Y` does not listen for its own events.
    // Therefore it is not stopping because of `EventYError`.
    // Similarly `X` also does not stop in relation to `EventXError`.
    // It is therefore `Y` responsibility to stop `X` when handling the error.

    // Additionally the order of the events is not guaranteed.
    // It depends on what exactly happens during handling.
    // One should consider that the `EventYError` and `EventYStop` are mutually
    // independent events, that indicate different things.
    // This is why we sleep for 0 in order to ensure that all events have been handled.

    await testsUtils.sleep(0);
    expect(y1EventAllListenerMock).toHaveBeenCalledTimes(2);
    const calls = y1EventAllListenerMock.mock.calls.map((call) => call[0]);
    const hasEventYError = calls.some((arg) => arg instanceof EventYError);
    const hasEventYStop = calls.some((arg) => arg instanceof EventYStop);
    expect(hasEventYError && hasEventYStop).toBe(true);

    // In this case, this demonstrates an irrelevant event that is just being
    // re-emitted, which only happens because `X` is still encapsulated by `Y`.

    const y2EventAllListenerMock = jest.fn();
    const y2 = new Y();
    y2.addEventListener(EventAll.name, (e) => {
      y2EventAllListenerMock((e as EventAll).detail);
    });
    await y2.start();
    y2.doSomething();
    await y2.stop();
    expect(y2EventAllListenerMock).toHaveBeenCalledTimes(2);
    expect(y2EventAllListenerMock.mock.calls[0][0]).toBeInstanceOf(
      EventXIrrelevant,
    );
    expect(y2EventAllListenerMock.mock.calls[1][0]).toBeInstanceOf(EventYStop);
  });
  test('injected example', async () => {
    // `EventXError` carries a push-error.
    class EventXError extends AbstractEvent<Error> {}

    // `EventXIrrlevant` is an event that does not matter to `Y`
    class EventXIrrelevant extends AbstractEvent {}

    // `EventYError` carries a push-error or encapsulates `EventXError`.
    // It will only wrap `EventYError` when `X` is encapsulated.
    class EventYError extends AbstractEvent<Error | EventXError> {}

    // `EventYStop` will be emitted when the Y is stopped
    class EventYStop extends AbstractEvent {}

    let xBadCounter = 0;

    // Consider `X` to be a domain object that can emit events.
    // It is a dependency of `Y`.
    interface X extends Evented {}
    @Evented()
    class X {
      public doSomethingBad() {
        const c = xBadCounter++;
        this.dispatchEvent(
          new EventXError({
            detail: new Error(`X had something bad happen ${c}`),
          }),
        );
      }

      public doSomethingIrrelevant() {
        this.dispatchEvent(new EventXIrrelevant());
      }

      public async start() {
        // NOOP
      }

      public async stop() {
        // NOOP
      }
    }

    // Consider `Y` to be a domain object that can emit events.
    // It relies on `X` which can be injected or encapsulated.
    interface Y extends Evented {}
    @Evented()
    class Y {
      public readonly isXEncapsulated: boolean;
      protected x: X;
      protected handleEventXError = (e: EventXError) => {
        // Whether injected or encapsulated, it must be handled.
        void this.stop();
        if (this.isXEncapsulated) {
          // Only redispatch if it is encapsulated.
          this.dispatchEvent(
            new EventYError({
              detail: e,
            }),
          );
        }
      };

      protected handleEventX = (e: EventDefault<AbstractEvent>) => {
        if (this.isXEncapsulated) {
          // Redispatch all encapsulated irrelevant events
          this.dispatchEvent(e.detail.clone());
        }
      };

      public constructor(x?: X) {
        if (x == null) {
          this.x = new X();
          this.isXEncapsulated = true;
        } else {
          this.x = x;
          this.isXEncapsulated = false;
        }
      }

      public async start() {
        if (this.isXEncapsulated) {
          await this.x.start();
        }
        // Attach event handlers at the very end
        this.x.addEventListener(EventXError.name, this.handleEventXError, {
          once: true,
        });
        this.x.addEventListener(EventDefault.name, this.handleEventX);
      }

      public async stop() {
        // Detach event handlers at the beginning
        this.x.removeEventListener(EventDefault.name, this.handleEventX);
        this.x.removeEventListener(EventXError.name, this.handleEventXError);

        if (this.isXEncapsulated) {
          await this.x.stop();
        }
        // Imagine this causes an infinite loop
        this.x.doSomethingBad();
        this.dispatchEvent(new EventYStop());
      }

      public doSomethingBad() {
        this.x.doSomethingBad();
      }

      public doSomething() {
        this.x.doSomethingIrrelevant();
      }
    }

    const x = new X();
    const y = new Y(x);
    const yEventAllListenerMock = jest.fn();
    y.addEventListener(EventAll.name, (e) => {
      yEventAllListenerMock((e as EventAll).detail);
    });
    await y.start();
    y.doSomethingBad();

    // When injecting, we never re-dispatch events, we will however handle them.

    await testsUtils.sleep(0);
    expect(yEventAllListenerMock).toHaveBeenCalledTimes(1);
    expect(yEventAllListenerMock.mock.calls[0][0]).toBeInstanceOf(EventYStop);
  });
});
