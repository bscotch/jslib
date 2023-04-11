import { ok } from 'assert';
import fetch from 'node-fetch';
import { TransistorEpisode } from './TransistorEpisode.js';
import {
  TransistorApiEpisodeData,
  TransistorApiEpisodes,
  TransistorEpisodeWritableAttributes,
} from './types.js';
import { parse as parseDotEnv } from 'dotenv';
import { Pathy } from '@bscotch/pathy';

export interface TransistorClientOptions {
  /**
   * @default process.env.TRANSISTOR_API_KEY
   */
  apiKey: string;
}

export class TransistorClient {
  protected apiKey: Promise<string>;

  constructor(options?: TransistorClientOptions) {
    this.apiKey = TransistorClient.findApiKey(options);
  }
  public async *episodes() {
    let lastPageNumber = 0;
    while (true) {
      const page = await this.request<TransistorApiEpisodes>(
        'get',
        `/episodes?pagination[page]=${lastPageNumber + 1}`,
      );
      ok(
        page.meta.currentPage !== lastPageNumber,
        `Caught it a loop on page ${lastPageNumber}`,
      );
      for (const episode of page.data) {
        yield new TransistorEpisode(episode, this);
      }
      if (page.meta.currentPage === page.meta.totalPages) {
        break;
      }
      lastPageNumber = page.meta.currentPage;
    }
  }

  public async updateEpisode(
    episodeId: string,
    attributes: Partial<TransistorEpisodeWritableAttributes>,
  ): Promise<TransistorEpisode> {
    return new TransistorEpisode(
      await this.request<TransistorApiEpisodeData>(
        'patch',
        `/episodes/${episodeId}`,
        {
          episode: attributes,
        },
      ),
      this,
    );
  }

  /**
   * Make an API request. The API key is
   * automatically added to the request,
   * and the URL is prefixed with the API's
   * base URL: `https://api.transistor.fm/v1`
   */
  public async request<R>(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    body?: Record<string, any>,
  ): Promise<R> {
    if (!url.startsWith('https')) {
      if (!url.startsWith('/')) {
        url = '/' + url;
      }
      url = `${TransistorClient.baseUrl}${url}`;
    }
    const res = await (
      await fetch(url, {
        method,
        headers: {
          'X-API-Key': await this.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    ).json();
    return res as R;
  }

  static baseUrl = 'https://api.transistor.fm/v1';

  /**
   * The API key could be provided via an in-memeory
   * environment variable, or directly via constructor
   * options, or via a `.env` file somewhere. This
   * method will check all of those places.
   */
  protected static async findApiKey(
    options?: TransistorClientOptions,
  ): Promise<string> {
    let key: string | undefined =
      options?.apiKey || process.env.TRANSISTOR_API_KEY!;
    if (key) {
      return key;
    }
    // Start searching for a `.env` file
    await new Pathy('.').findInParents('.env', {
      async test(envPath) {
        console.log(`Found .env file at ${envPath.absolute}`);
        const env = parseDotEnv(await envPath.read<string>());
        key = env.TRANSISTOR_API_KEY;
        return !!key;
      },
    });
    ok(
      key,
      'API key not found. Can be provided via process.env.TRANSISTOR_API_KEY',
    );
    return key;
  }
}
