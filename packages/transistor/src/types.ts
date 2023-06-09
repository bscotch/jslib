export interface TransistorEpisodeWritableAttributes {
  title: string;
  number: number;
  /**
   * Should be a single paragraph without
   * formatting to satisfy podcast players
   * like iTunes.
   */
  summary: string;
  /**
   * Show notes. Can include basic HTML.
   */
  description: string;
  season: number;
  status: 'draft' | 'scheduled' | 'published';
  explicit: boolean;
  keywords: string;
  alternate_url: string | null;
  media_url: string;
  image_url: string | null;
}

export interface TransistorEpisodeAttributes
  extends TransistorEpisodeWritableAttributes {
  duration: number;
  author: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  /**
   * Automatically generated by Transistor.fm
   */
  formatted_published_at: string;
  /**
   * In format "mm:ss" (probably hh:mm:ss when over an hour).
   *
   * Automatically generated by Transistor.fm
   */
  duration_in_mmss: string;
  /**
   * Shareable link for social media,
   * provided by Transistor.fm
   */
  share_url: string;
  /**
   * Automatically generated from the `summary` field.
   */
  formatted_summary: string;
  audio_processing: false;
  type: 'full' | 'trailer' | 'bonus';
  email_notifications: null;
}

export interface TransistorApiEpisodeData {
  id: string;
  type: 'episode';
  attributes: TransistorEpisodeAttributes;
  relationships: {
    show: {
      data: {
        id: string;
        type: 'show';
      };
    };
  };
}

export interface TransistorApiEpisode {
  data: TransistorApiEpisodeData;
}
export interface TransistorApiEpisodes {
  data: TransistorApiEpisodeData[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}
