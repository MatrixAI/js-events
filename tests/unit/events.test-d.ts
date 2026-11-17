import { expectTypeOf, test } from 'vitest';
import { AbstractEvent, Evented } from '#index.js';

test('event details and clones retain their declared types', () => {
  class ReadyEvent extends AbstractEvent<{ phase: string }> {}
  const event = new ReadyEvent({ detail: { phase: 'ready' } });
  expectTypeOf(event.detail).toEqualTypeOf<{ phase: string }>();
  expectTypeOf(event.clone()).toEqualTypeOf<ReadyEvent>();
  // @ts-expect-error The event detail must match its declared shape.
  new ReadyEvent({ detail: { phase: 1 } });
});

test('decorated objects retain their constructor and event surface', () => {
  interface Subject extends Evented {}
  @Evented()
  class Subject {
    public constructor(public value: string) {}
  }
  const subject = new Subject('ready');
  expectTypeOf(subject.value).toEqualTypeOf<string>();
  expectTypeOf(
    subject.dispatchEvent(new Event('ready')),
  ).toEqualTypeOf<boolean>();
  // @ts-expect-error The constructor requires a string.
  new Subject(1);
});
