import { describe, expect, test, vi } from 'vitest';
import {
  AbstractEvent,
  Evented,
  EventAll,
  EventDefault,
  EventError,
} from '#index.js';

interface Subject extends Evented {}
@Evented()
class Subject {}

describe('event compatibility', () => {
  test('standard decorators preserve class identity and constructor arguments', () => {
    interface Named extends Evented {}
    @Evented()
    class Named {
      constructor(public value: string) {}
    }
    const subject = new Named('value');
    expect(Named.name).toBe('Named');
    expect(subject).toBeInstanceOf(Named);
    expect(subject.value).toBe('value');
    expect(subject.dispatchEvent(new Event('probe'))).toBe(true);
  });

  test('once listeners and abort signals retain native registration semantics', () => {
    const subject = new Subject();
    const once = vi.fn();
    const signalBound = vi.fn();
    const alreadyAborted = vi.fn();
    const controller = new AbortController();
    subject.addEventListener('probe', once, { once: true });
    subject.addEventListener('probe', signalBound, {
      signal: controller.signal,
    });
    subject.addEventListener('probe', alreadyAborted, {
      signal: AbortSignal.abort(),
    });
    subject.dispatchEvent(new Event('probe'));
    controller.abort();
    subject.dispatchEvent(new Event('probe'));
    expect(once).toHaveBeenCalledTimes(1);
    expect(signalBound).toHaveBeenCalledTimes(1);
    expect(alreadyAborted).not.toHaveBeenCalled();
  });

  test('listener removal during dispatch skips the removed listener', () => {
    const subject = new Subject();
    const calls: string[] = [];
    function removed() {
      calls.push('removed');
    }
    subject.addEventListener('probe', () => {
      calls.push('first');
      subject.removeEventListener('probe', removed);
    });
    subject.addEventListener('probe', removed);
    subject.addEventListener('probe', () => calls.push('last'));
    subject.dispatchEvent(new Event('probe'));
    expect(calls).toEqual(['first', 'last']);
  });

  test('function and object listeners retain their distinct receivers', () => {
    const subject = new Subject();
    let functionReceiver: unknown;
    let objectReceiver: unknown;
    subject.addEventListener('probe', function () {
      functionReceiver = this;
    });
    const listener = {
      handleEvent() {
        objectReceiver = this;
      },
    };
    subject.addEventListener('probe', listener);
    subject.dispatchEvent(new Event('probe'));
    expect(functionReceiver).toBe(subject);
    expect(objectReceiver).toBe(listener);
  });

  test('cancellation short circuits default/all dispatch and returns false', () => {
    const subject = new Subject();
    const fallback = vi.fn();
    const all = vi.fn();
    subject.addEventListener(EventDefault.name, fallback);
    subject.addEventListener(EventAll.name, all);
    subject.addEventListener('probe', (event) => event.preventDefault());
    const event = new Event('probe', { cancelable: true });
    expect(subject.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
    expect(all).not.toHaveBeenCalled();
  });

  test('default and all cancellation propagate their own dispatch results', () => {
    const subject = new Subject();
    const all = vi.fn();
    subject.addEventListener(EventDefault.name, (event) =>
      event.preventDefault(),
    );
    subject.addEventListener(EventAll.name, all);
    expect(
      subject.dispatchEvent(new Event('unknown', { cancelable: true })),
    ).toBe(false);
    expect(all).not.toHaveBeenCalled();
    const handled = new Subject();
    handled.addEventListener('probe', () => {});
    handled.addEventListener(EventAll.name, (event) => event.preventDefault());
    expect(
      handled.dispatchEvent(new Event('probe', { cancelable: true })),
    ).toBe(false);
  });

  test('error events bypass default/all and preserve thrown value identity', async () => {
    const subject = new Subject();
    const errors: unknown[] = [];
    const wrapped: string[] = [];
    const synchronous = { failure: 'sync' };
    const asynchronous = { failure: 'async' };
    subject.addEventListener(EventError.name, (event) =>
      errors.push((event as EventError).detail),
    );
    subject.addEventListener(EventDefault.name, (event) =>
      wrapped.push(event.type),
    );
    subject.addEventListener(EventAll.name, (event) =>
      wrapped.push(event.type),
    );
    subject.addEventListener('probe', () => {
      throw synchronous;
    });
    subject.addEventListener('probe', async () => {
      throw asynchronous;
    });
    expect(subject.dispatchEvent(new Event('probe'))).toBe(true);
    expect(errors).toEqual([synchronous]);
    await Promise.resolve();
    expect(errors).toEqual([synchronous, asynchronous]);
    expect(wrapped).toEqual([EventAll.name]);
  });

  test('clones retain subclass detail but can cross independently owned targets', () => {
    class LifecycleEvent extends AbstractEvent<{ phase: string }> {}
    const kernel = new Subject();
    const observer = new Subject();
    const event = new LifecycleEvent({ detail: { phase: 'ready' } });
    kernel.dispatchEvent(event);
    expect(() => observer.dispatchEvent(event)).toThrow(TypeError);
    const clone = event.clone();
    observer.dispatchEvent(clone);
    expect(clone).toBeInstanceOf(LifecycleEvent);
    expect(clone.detail).toBe(event.detail);
    expect(clone.target).toBe(observer);
    expect(event.target).toBe(kernel);
  });
});
