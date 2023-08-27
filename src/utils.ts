/**
 * Symbols prevents name clashes with decorated classes
 */
const _eventTarget = Symbol('_eventTarget');
const eventTarget = Symbol('eventTarget');

export { _eventTarget, eventTarget };
