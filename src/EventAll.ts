import AbstractEvent from './AbstractEvent';

/**
 * EventAll wraps all dispatched events including already handled events.
 */
class EventAll<T = Event> extends AbstractEvent<T> {
  public constructor(options: EventInit & { detail: T }) {
    super(EventAll.name, options, arguments);
  }
}

export default EventAll;
