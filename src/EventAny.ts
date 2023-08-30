import AbstractEvent from './AbstractEvent';
// @ts-ignore package.json is outside root dir
import { name } from '../package.json';

class EventAny<T = Event> extends AbstractEvent<T> {
  public static type = `${name}/${this.name}`;
  public constructor(options: EventInit & { detail: T }) {
    super(EventAny.type, options, arguments);
  }
}

export default EventAny;
