// @ts-ignore package.json is outside rootDir
import { name } from '../package.json';

class EventAny extends Event {
  public static type = `${name}/${this.name}`;
  public detail: Event;
  constructor(options: EventInit & { detail: Event }) {
    super(EventAny.type, options);
    this.detail = options.detail;
  }
}

export default EventAny;
