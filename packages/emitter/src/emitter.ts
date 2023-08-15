import EventEmitter2, { type ListenerFn, type Listener } from 'eventemitter2';

/**
 * Some defaults and descriptions changed from
 * the original EventEmitter2 Constructor Options
 */
export interface EmitterOptions<Delim extends string = '.'> {
  /**
   * @default true
   * @description set this to `true` to use wildcards.
   */
  wildcard?: boolean;
  /**
   * @default '.'
   * @description the delimiter used to segment namespaces.
   */
  delimiter?: Delim;
  /**
   * @default false
   * @description set this to `true` if you want to emit the newListener events.
   */
  newListener?: boolean;
  /**
   * @default false
   * @description set this to `true` if you want to emit the removeListener events.
   */
  removeListener?: boolean;
  /**
   * @default 10
   * @description the maximum amount of listeners that can be assigned to an event.
   */
  maxListeners?: number;
  /**
   * @default true
   * @description show event name in memory leak message when more than maximum amount of listeners is assigned, default false
   */
  verboseMemoryLeak?: boolean;
  /**
   * @default true
   * @description disable throwing uncaughtException if an error event is emitted and it has no listeners
   */
  ignoreErrors?: boolean;
}

export interface Subscription<
  Name extends string,
  E extends EventEmitter2,
  L extends ListenerFn,
> extends Listener {
  emitter: E;
  event: Name;
  listener: L;
  off(): this;
}

export interface EventConfigFull {
  name: string;
  payload?: any[];
}

export type EventConfig = string | EventConfigFull;

export type EventConfigs = EventConfig[];

export type WildcardPattern<
  Name extends string,
  Delim extends string,
> = Name extends `${infer Namespace}${Delim}${infer Rest}`
  ? '*' | '**' | `${Namespace | '*'}${Delim}${WildcardPattern<Rest, Delim>}`
  : Name | '*';

export type EventName<T extends EventConfig> = T extends { name: string }
  ? T['name']
  : T;

export type EventNames<T extends EventConfigs> =
  T extends (infer E extends EventConfig)[] ? EventName<E> : never;

export type EventNameWildcard<
  T extends EventConfig,
  Delim extends string = '.',
> = WildcardPattern<EventName<T>, Delim>;

export type EventNamesWildcard<
  T extends EventConfigs,
  Delim extends string = '.',
> = WildcardPattern<EventNames<T>, Delim>;

export type MatchingEvents<
  Name extends string,
  T extends EventConfigs,
  Delim extends string,
> = T extends [
  infer Head extends EventConfig,
  ...infer Tail extends EventConfigs,
]
  ? Name extends EventNameWildcard<Head, Delim>
    ? [Head, ...MatchingEvents<Name, Tail, Delim>]
    : MatchingEvents<Name, Tail, Delim>
  : [];

export type MatchingEvent<
  Name extends string,
  T extends EventConfigs,
  Delim extends string,
> = MatchingEvents<Name, T, Delim>[number];

export type MatchingListener<
  Name extends string,
  T extends EventConfigs,
  Delim extends string,
> = EventListener<MatchingEvent<Name, T, Delim>>;

export type EventListener<T extends EventConfig> = T extends {
  payload: [...infer Args];
}
  ? (...args: Args) => void
  : () => void;

export type EventListenerArgs<T extends EventConfig> = T extends {
  payload: [...infer Args];
}
  ? Args
  : [];

export class Emitter<
  T extends EventConfigs,
  Delim extends string = '.',
> extends EventEmitter2 {
  constructor(options?: EmitterOptions<Delim>) {
    super({
      wildcard: true,
      ignoreErrors: true,
      verboseMemoryLeak: true,
      ...options,
    });
  }

  override addListener<
    Name extends EventNamesWildcard<T, Delim>,
    L extends MatchingListener<Name, T, Delim>,
  >(eventName: Name, listener: L): Subscription<Name, this, L> {
    return super.on(eventName, listener, { objectify: true }) as any;
  }

  override on<
    Name extends EventNamesWildcard<T, Delim>,
    L extends MatchingListener<Name, T, Delim>,
  >(eventName: Name, listener: L): Subscription<Name, this, L> {
    return super.on(eventName, listener, { objectify: true }) as Subscription<
      Name,
      this,
      L
    >;
  }

  override off<
    Name extends EventNamesWildcard<T, Delim>,
    L extends MatchingListener<Name, T, Delim>,
  >(eventName: Name, listener: L): this {
    return super.off(eventName, listener);
  }

  override emit<
    Name extends EventNamesWildcard<T, Delim>,
    Event extends MatchingEvent<Name, T, Delim>,
  >(eventName: Name, ...args: EventListenerArgs<Event>): boolean {
    return super.emit(eventName, ...args);
  }

  // once<Name extends keyof T>(eventName: Name, listener: EventListener<T[Name]>): this {
  //   return super.once(eventName as string, listener);
  // }

  // removeListener<Name extends keyof T>(eventName: Name, listener: EventListener<T[Name]>): this {
  //   return super.removeListener(eventName as string, listener);
  // }

  // removeAllListeners<Name extends keyof T>(event?: Name): this {
  //   return super.removeAllListeners(event as string);
  // }

  // listeners<Name extends keyof T>(eventName: Name): Function[] {
  //   return super.listeners(eventName as string);
  // }

  // rawListeners<Name extends keyof T>(eventName: Name): Function[] {
  //   return super.rawListeners(eventName as string);
  // }

  // listenerCount<Name extends keyof T>(eventName: Name): number {
  //   return super.listenerCount(eventName as string);
  // }

  // prependListener<Name extends keyof T>(eventName: Name, listener: EventListener<T[Name]>): this {
  //   return super.prependListener(eventName as string, listener);
  // }
}

export function createEventEmitter<T extends EventConfigs>(): Emitter<T> {
  return new Emitter() as Emitter<T>;
}
