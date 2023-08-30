import { AbstractEvent, EventAny, Evented, utils } from '@';

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
    x.addEventListener('a', eventListenerMock);
    x.addEventListener('b', eventListenerMock);
    x.addEventListener('c', eventListenerMock);
    x.addEventListener('d', eventListenerMock);
    x.removeEventListener('a', eventListenerMock);
    x.removeEventListener('b', eventListenerMock);
    const eventA = new Event('a');
    const eventB = new Event('b');
    const eventC = new Event('c');
    const eventD = new Event('d');
    x.dispatchEvent(eventA);
    x.dispatchEvent(eventB);
    x.dispatchEvent(eventC);
    x.dispatchEvent(eventD);
    expect(eventListenerMock).toHaveBeenCalledTimes(2);
    expect(eventListenerMock.mock.calls[0][0]).toBe(eventC);
    expect(eventListenerMock.mock.calls[1][0]).toBe(eventD);
  });
  test('listen for `EventAny`', () => {
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    const event = new Event('test event');
    const eventListenerMock = jest.fn();
    x.addEventListener(eventListenerMock);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(1);
    expect(eventListenerMock).toHaveBeenCalledWith(expect.any(EventAny));
    expect(eventListenerMock.mock.calls[0][0].detail).toBe(event);
    x.dispatchEvent(event);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(3);
    expect(eventListenerMock.mock.calls[1][0].detail).toBe(event);
    expect(eventListenerMock.mock.calls[2][0].detail).toBe(event);
  });
  test('remove listeners for `EventAny', () => {
    interface X extends Evented {}
    @Evented()
    class X {}
    const x = new X();
    const event = new Event('test event');
    const eventListenerMock = jest.fn();
    x.addEventListener(eventListenerMock);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(1);
    expect(eventListenerMock).toHaveBeenCalledWith(expect.any(EventAny));
    expect(eventListenerMock.mock.calls[0][0].detail).toBe(event);
    x.dispatchEvent(event);
    x.dispatchEvent(event);
    expect(eventListenerMock).toHaveBeenCalledTimes(3);
    expect(eventListenerMock.mock.calls[1][0].detail).toBe(event);
    expect(eventListenerMock.mock.calls[2][0].detail).toBe(event);
  });
});
