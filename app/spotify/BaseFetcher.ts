import { Album, Artist, Track } from "@prisma/client";

export interface BaseFetcher {
  getArtistById(id: string): Promise<Artist | null>;
  getArtistAlbums(artistId: string): Promise<Album[]>;
  getAlbumTracks(albumId: string): Promise<Track[]>;
  searchArtists(query: string, limit: number): Promise<Artist[]>;
}
