import AbstractEvent from './AbstractEvent';

/**
 * EventDefault wraps dispatched events that were not handled.
 */
class EventDefault<T = Event> extends AbstractEvent<T> {
  public constructor(options: EventInit & { detail: T }) {
    super(EventDefault.name, options, arguments);
  }
}

export default EventDefault;
