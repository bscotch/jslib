# Transistor.fm Client

The podcast host [Transistor.fm](https://transistor.fm/) has [a robust HTTP API](https://developers.transistor.fm/). As with any HTTP API, using it directly is a pain. This project provides a client to make using the Transistor.fm API easy.

The client is fully typed in Typescript, so the best way to use it is to explore the API via your Typescript IDE.

## Sample Usage

Note that this project is currently _local only_. If you need it published to NPM, let Adam know!

```ts
import { TransistorClient } from '@bscotch/transistor';

const client = new TransistorClient({ apiKey: 'YOUR API KEY' });

// Fetch every episode and submit an update for it.
for await (const episode of client.episodes()) {
  console.log(episode.title);
  await episode.update({
    title: 'PREFIX: ' + episode.title,
  });
}
```
