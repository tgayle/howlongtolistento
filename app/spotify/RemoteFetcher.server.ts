import {
  AlbumItem,
  ArtistItem,
  GetAlbumsResponse,
  GetAlbumTracksResponse,
  SearchResponse,
  TrackItem,
} from "~/types";
import { SpotifyAuth } from "./auth.server";

class RemoteFetcher {
  async getArtistById(id: string) {
    return SpotifyAuth.signedFetch<ArtistItem>(
      `https://api.spotify.com/v1/artists/${id}`
    );
  }

  async getArtistAlbums(artistId: string): Promise<AlbumItem[]> {
    let url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`;
    const albums: AlbumItem[] = [];

    do {
      const { data: res, success } =
        await SpotifyAuth.signedFetch<GetAlbumsResponse>(url);
      // TODO: Handle errors
      if (!success) break;

      albums.push(...res.items);

      url = res.next;
    } while (url);

    return albums;
  }

  async getAlbumTracks(albumId: string): Promise<TrackItem[]> {
    console.log("Fetching tracks for album", albumId);
    await SpotifyAuth.refreshToken();

    let url:
      | string
      | null = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
    const tracks: TrackItem[] = [];

    do {
      const { data: res, success } =
        await SpotifyAuth.signedFetch<GetAlbumTracksResponse>(url);

      // TODO: Handle errors
      if (!success) break;

      tracks.push(...(res.items ?? []));

      url = res.next as string | null;
    } while (url);

    return tracks;
  }

  async searchArtists(query: string, limit: number) {
    return SpotifyAuth.signedFetch<SearchResponse>(
      `https://api.spotify.com/v1/search?type=artist&q=${query.trim()}&limit=${limit}`
    );
  }
}

export default new RemoteFetcher();
