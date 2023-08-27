import { Evented, EventAny, utils } from '@';

describe('Evented', () => {
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
