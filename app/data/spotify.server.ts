import { type SearchResponse } from "~/types";
import { defaultRequestHeaders } from "./auth.server";

export type SearchArtistResponse = LocalArtist[];

export type LocalArtist = {
  image: string | null;
  name: string;
  id: string;
};

export type SpotifyError = { status: number };

export default {
  async searchArtists(
    query: string,
    limit: number = 5
  ): Promise<SearchArtistResponse | SpotifyError> {
    const req = await fetch(
      `https://api.spotify.com/v1/search?type=artist&q=${query.trim()}&limit=${limit}`,
      defaultRequestHeaders()
    );

    if (req.status !== 200) {
      return {
        status: req.status,
      };
    }

    const res: SearchResponse = await req.json();

    return (
      res.artists.items?.map((item) => ({
        id: item.id,
        name: item.name,
        image: item.images?.at(-1)?.url || null,
      })) ?? []
    );
  },
};
