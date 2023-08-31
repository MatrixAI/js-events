/**
 * Symbols prevents name clashes with decorated classes
 */
const _eventTarget = Symbol('_eventTarget');
const eventTarget = Symbol('eventTarget');

const _eventHandlers = Symbol('_eventHandlers');
const eventHandlers = Symbol('eventHandlers');

const _eventHandled = Symbol('_eventHandled');
const eventHandled = Symbol('eventHandled');

export {
  _eventTarget,
  eventTarget,
  _eventHandlers,
  eventHandlers,
  _eventHandled,
  eventHandled,
};
