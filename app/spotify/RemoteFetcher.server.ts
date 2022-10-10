import {
  AlbumItem,
  ArtistItem,
  GetAlbumsResponse,
  GetAlbumTracksResponse,
  SearchResponse,
  TrackItem,
} from "~/types";
import { APIResponse, SpotifyAuth } from "./auth.server";

class RemoteFetcher {
  async getArtistById(id: string) {
    return SpotifyAuth.signedFetch<ArtistItem>(
      `https://api.spotify.com/v1/artists/${id}`
    );
  }

  async getArtistAlbums(artistId: string): Promise<APIResponse<AlbumItem[]>> {
    let url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`;
    const albums: AlbumItem[] = [];

    do {
      const {
        data: res,
        success,
        status,
      } = await SpotifyAuth.signedFetch<GetAlbumsResponse>(url);
      if (!success) {
        return {
          data: albums,
          success: false,
          status,
        };
      }

      albums.push(...res.items);

      url = res.next;
    } while (url);

    return {
      data: albums,
      status: 200,
      success: true,
    };
  }

  async getAlbumTracks(albumId: string): Promise<APIResponse<TrackItem[]>> {
    console.log("Fetching tracks for album", albumId);
    await SpotifyAuth.refreshToken();

    let url:
      | string
      | null = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
    const tracks: TrackItem[] = [];

    do {
      const {
        data: res,
        success,
        status,
      } = await SpotifyAuth.signedFetch<GetAlbumTracksResponse>(url);

      if (!success) {
        return {
          data: tracks,
          success: false,
          status,
        };
      }

      tracks.push(...(res.items ?? []));

      url = res.next as string | null;
    } while (url);

    return {
      data: tracks,
      success: true,
      status: 200,
    };
  }

  async searchArtists(query: string, limit: number) {
    return SpotifyAuth.signedFetch<SearchResponse>(
      `https://api.spotify.com/v1/search?type=artist&q=${query.trim()}&limit=${limit}`
    );
  }
}

export default new RemoteFetcher();
