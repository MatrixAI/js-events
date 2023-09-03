import EventAll from './EventAll';
import EventDefault from './EventDefault';
import {
  _eventTarget,
  eventTarget,
  _eventHandlers,
  eventHandlers,
  _eventHandled,
  eventHandled,
} from './utils';

interface Evented {
  get [eventTarget](): EventTarget;
  get [eventHandlers](): WeakMap<
    EventListenerOrEventListenerObject,
    EventListener
  >;
  get [eventHandled](): WeakSet<Event>;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;
  dispatchEvent(event: Event): boolean;
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
      public [_eventHandlers]: WeakMap<
        EventListenerOrEventListenerObject,
        EventListener
      > = new WeakMap();
      public [_eventHandled]: WeakSet<Event> = new WeakSet();

      public get [eventTarget](): EventTarget {
        return this[_eventTarget];
      }

      public get [eventHandlers](): WeakMap<
        EventListenerOrEventListenerObject,
        EventListener
      > {
        return this[_eventHandlers];
      }

      public get [eventHandled](): WeakSet<Event> {
        return this[_eventHandled];
      }

      public addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: AddEventListenerOptions | boolean,
      ) {
        let handler: EventListenerOrEventListenerObject | null;
        const that = this;
        if (typeof callback === 'function') {
          handler = function (e) {
            // Propagate the `that`
            const result = callback.call(that, e);
            that[_eventHandled].add(e);
            return result;
          };
          this[_eventHandlers].set(callback, handler);
        } else if (
          callback != null &&
          typeof callback === 'object' &&
          typeof callback.handleEvent === 'function'
        ) {
          handler = function (e) {
            // Don't propagate the `that`
            const result = callback.handleEvent(e);
            that[_eventHandled].add(e);
            return result;
          };
          this[_eventHandlers].set(callback, handler);
        } else {
          handler = callback;
        }
        this[_eventTarget].addEventListener(type, handler, options);
      }

      public removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean,
      ) {
        let handler: EventListenerOrEventListenerObject | null;
        if (callback != null) {
          // It should exist as long the type is correct
          handler = this[_eventHandlers].get(callback)!;
        } else {
          handler = callback;
        }
        this[_eventTarget].removeEventListener(type, handler, options);
      }

      public dispatchEvent(event: Event) {
        // Override the `target` and `currentTarget` to point to the current object
        Object.defineProperties(event, {
          target: {
            value: this,
            writable: false,
          },
          currentTarget: {
            value: this,
            writable: false,
          },
        });
        let status = this[_eventTarget].dispatchEvent(event);
        if (status && !this[_eventHandled].has(event)) {
          const eventDefault = new EventDefault({
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            composed: event.composed,
            detail: event,
          });
          Object.defineProperties(eventDefault, {
            target: {
              value: this,
              writable: false,
            },
            currentTarget: {
              value: this,
              writable: false,
            },
          });
          status = this[_eventTarget].dispatchEvent(eventDefault);
        }
        if (status) {
          const eventAll = new EventAll({
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            composed: event.composed,
            detail: event,
          });
          Object.defineProperties(eventAll, {
            target: {
              value: this,
              writable: false,
            },
            currentTarget: {
              value: this,
              writable: false,
            },
          });
          status = this[_eventTarget].dispatchEvent(eventAll);
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

export { Evented, eventTarget, eventHandlers, eventHandled };
