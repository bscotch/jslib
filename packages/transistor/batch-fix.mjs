import { TransistorClient, TransistorEpisode } from './dist/index.js';
import { marked } from 'marked';
import { readFileSync, writeFileSync } from 'fs';

const cta = marked(
  `To stay up to date with all of our buttery goodness subscribe to the podcast on Apple podcasts ([apple.co/1LxNEnk](https://apple.co/1LxNEnk)) or wherever you get your podcasts. To get more involved in the Butterscotch community, hop into our DISCORD server at [discord.gg/bscotch](https://discord.gg/bscotch) and say hello! Submit questions at [podcast.bscotch.net](https://podcast.bscotch.net), disclose all of your secrets to podcast@bscotch.net, and send letters, gifts, and tasty treats to [bit.ly/bscotchmailbox](https://bit.ly/bscotchmailbox). Finally, to support the show head over to [moneygrab.bscotch.net](https://moneygrab.bscotch.net) to buy some coffee *FOR* Butterscotch!`,
  { mangle: false, gfm: true },
);

const client = new TransistorClient();
/**
 * @type {import('./src/index.js').TransistorApiEpisodeData[]}
 */
const episodes = JSON.parse(readFileSync('episodes.json', 'utf8'));

async function fixEpisodes() {
  /** @type {{title:string,summary:string,newSummary:string}[]} */
  const updates = [];

  for await (const episodeData of client.episodes()) {
    const episode =
      episodeData instanceof TransistorEpisode
        ? episodeData
        : new TransistorEpisode(episodeData, client);

    const summary = removeSentencesWithLinks(episode.summary).trim();
    if (summary != episode.summary.trim()) {
      console.log(`${episode.number} has a sentence with a link in it`);
      updates.push({
        title: episode.title,
        summary: episode.summary,
        newSummary: summary,
      });
      await episode.update({ summary });
      // TODO: Actually update the episode
    } else {
      console.log('Episode', episode.number, 'is fine');
    }
  }
  return updates;
}

/**
 * Split on a regex with a group, and re-append
 * the delimiters to each split entry.
 *
 * @param {string} str
 * @param {RegExp} pattern
 */
function fancySplit(str, pattern) {
  const exploded = str.trim().split(pattern);
  /** @type {string[]} */
  const parts = [];
  for (let i = 0; i < exploded.length; i += 2) {
    if (i === exploded.length - 1) {
      parts.push(exploded[i]);
      break;
    }
    parts.push(exploded[i] + exploded[i + 1]);
  }
  return parts.filter((x) => x);
}

/**
 *
 * @param {string} paragraph
 * @return {string}
 */
function removeSentencesWithLinks(paragraph) {
  const sentences = fancySplit(paragraph, /([?.!]\s+)/);
  // Working backwards, remove each sentence that has a link in it
  let lostClosingParens = false;
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].match(/(apple\.co|bscotch\.net|bit.ly\/bsdiscord)/)) {
      if (sentences[i].includes('</p>')) {
        lostClosingParens = true;
      }
      sentences.splice(i, 1);
    } else {
      break;
    }
  }
  return sentences.join('') + (lostClosingParens ? '</p>' : '');
}

const updates = await fixEpisodes();
writeFileSync('updates.json', JSON.stringify(updates, null, 2));
// writeFileSync('episodes.json', JSON.stringify(episodes, null, 2));
