import {
  EventListenerArgs,
  MatchingEvents,
  MatchingListener,
  createEventEmitter,
} from './emitter.js';

describe('Emitters', function () {
  it('can create an emitter', function () {
    type Configs = [{ name: 'hello'; payload: [string, number] }];
    const emitter = createEventEmitter<Configs>();

    let event: MatchingEvents<'hello', Configs, '.'>;
    let listener: MatchingListener<'hello', Configs, '.'>;

    emitter.on('hello', (a, b) => {});

    type args = EventListenerArgs<MatchingListener<'hello', Configs, '.'>>;
    emitter.emit('hello', 'a', 10);
  });
});
