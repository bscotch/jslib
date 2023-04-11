import {
  TransistorApiEpisodeData,
  TransistorEpisodeWritableAttributes,
} from './types.js';
import { TransistorClient } from './TransistorClient.js';
import { ok } from 'assert';

export class TransistorEpisode {
  constructor(
    protected data: TransistorApiEpisodeData,
    protected client: TransistorClient,
  ) {}

  get id() {
    return this.data.id;
  }

  get title() {
    return this.data.attributes.title;
  }

  get number() {
    return this.data.attributes.number;
  }

  /**
   * Short, plain-text summary of the episode.
   */
  get summary() {
    return this.data.attributes.summary;
  }

  /**
   * Longer summary of the episode (a.k.a. "Show Notes")
   */
  get description() {
    return this.data.attributes.description;
  }

  get status() {
    return this.data.attributes.status;
  }

  get keywords() {
    return this.data.attributes.keywords.split(/\s*,\s*/);
  }

  async update(attributes: Partial<TransistorEpisodeWritableAttributes>) {
    const updated = await this.client.updateEpisode(this.id, attributes);
    this.data = updated.data;
  }

  /**
   * Assuming that the episode title includes a number
   * reflecting which episode it is, return that number.
   */
  getNumberFromTitle(pattern = /(\d+)/) {
    const match = this.title.match(pattern);
    ok(match, 'Could not find episode number in title');
    return +match[1];
  }

  /**
   * Get the raw data, as originally returned by the
   * Transistor API.
   */
  toJSON() {
    return this.data;
  }
}
