# EventEmitter2 (with types!)

Existing EventEmitter libraries typically do not provide much support for indicating what events and payloads are available on a given emitter. This library adds that support to the popular [EventEmitter2 library](https://www.npmjs.com/package/eventemitter2).

## Usage

Events can be described as a string (when just the event name is needed because there is no expected payload) or as an object with a payload:

```typescript
import {createEmitter} from '@bscotch/emitter';

type MySimpleEvent = "my-simple-event";
interface MyComplexEvent {
    name: "my-complex-event";
    // The payload must be a *tuple* of the arguments that will
    // be passed to the event handler.
    payload: [arg0: string, arg1: { foo: number }];
}

// For best results, events should be collected in a tuple type
type MyEvents = [MySimpleEvent, MyComplexEvent];

const emitter = createEmitter<MyEvents>();

// Now you'll have typed emitter methods!
emitter.on('my-simple-event', () => {});
emitter.emit('my-simple-event');

emitter.on('my-complex-event', (arg0, arg1) => {}); // <- callback is typed!
emitter.emit('my-complex-event', 'foo', { foo: 1 }); // <- arguments are typed!
```
