import EventAny from './EventAny';
import { _eventTarget, eventTarget } from './utils';

interface Evented {
  addEventListener(
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void;
  dispatchEvent(event: Event): boolean;
  removeEventListener(
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;
}

function Evented() {
  return <
    T extends {
      new (...args: any[]): object;
    },
  >(
    constructor: T,
  ) => {
    const constructor_ = class extends constructor {
      public [_eventTarget]: EventTarget = new EventTarget();

      public get [eventTarget](): EventTarget {
        return this[_eventTarget];
      }

      public addEventListener(
        type: string | EventListenerOrEventListenerObject | null,
        callback?:
          | EventListenerOrEventListenerObject
          | null
          | AddEventListenerOptions
          | boolean,
        options?: AddEventListenerOptions | boolean,
      ) {
        if (typeof type === 'string') {
          this[_eventTarget].addEventListener(
            type,
            callback as EventListenerOrEventListenerObject,
            options,
          );
        } else {
          this[_eventTarget].addEventListener(
            EventAny.type,
            type as EventListenerOrEventListenerObject,
            options,
          );
        }
      }

      public removeEventListener(
        type: string | EventListenerOrEventListenerObject | null,
        callback?:
          | EventListenerOrEventListenerObject
          | null
          | EventListenerOptions
          | boolean,
        options?: EventListenerOptions | boolean,
      ) {
        if (typeof type === 'string') {
          this[_eventTarget].removeEventListener(
            type,
            callback as EventListenerOrEventListenerObject,
            options,
          );
        } else {
          this[_eventTarget].removeEventListener(
            EventAny.type,
            type as EventListenerOrEventListenerObject,
            options,
          );
        }
      }

      public dispatchEvent(event: Event) {
        const status = this[_eventTarget].dispatchEvent(event);
        if (status) {
          this[_eventTarget].dispatchEvent(
            new EventAny({
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed,
              detail: event,
            }),
          );
        }
        return status;
      }
    };
    // Preserve the name
    Object.defineProperty(
      constructor_,
      'name',
      Object.getOwnPropertyDescriptor(constructor, 'name')!,
    );
    return constructor_;
  };
}

export { Evented, eventTarget };
