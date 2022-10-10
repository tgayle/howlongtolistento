import type { Album, Artist } from "@prisma/client";
import LocalFetcher from "./spotify/LocalFetcher.server";
import RemoteFetcher from "./spotify/RemoteFetcher.server";
import { getTimeUnits, sumBy, type TimeUnits } from "./util";

export type LocalArtist = {
  image: string | null;
  name: string;
  id: string;
};

export type SearchArtistResponse = LocalArtist[];

export async function searchArtists(
  query: string,
  limit: number = 5
): Promise<SearchArtistResponse> {
  if (query.trim().length < 3) return [];

  const { data: res, success } = await RemoteFetcher.searchArtists(
    query,
    limit
  );

  // TODO: Handle errors
  if (!success) return [];

  return (
    res.artists.items?.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.images?.at(-1)?.url || null,
    })) ?? []
  );
}

export async function getArtistById(id: string): Promise<Artist | null> {
  const localArtist = await LocalFetcher.getArtistById(id);
  if (localArtist) return localArtist;

  const { data: artist, success } = await RemoteFetcher.getArtistById(id);
  if (!success) return null;

  console.log(artist);
  return LocalFetcher.saveArtist(artist);
}

export async function getArtistAlbums(artistId: string): Promise<Album[]> {
  const localAlbums = await LocalFetcher.getArtistAlbums(artistId);
  if (localAlbums.length) return localAlbums;

  const albums = await RemoteFetcher.getArtistAlbums(artistId);

  console.log(`Got ${albums.length} albums`);
  const tracksByAlbum = await Promise.all(
    albums.map(
      async (album) =>
        [album.id, await RemoteFetcher.getAlbumTracks(album.id)] as const
    )
  );

  const allTracks = tracksByAlbum
    .map(([albumId, tracks]) => tracks.map((it) => ({ ...it, albumId })))
    .flat();

  console.log(`Got ${allTracks.length} tracks from ${albums.length} albums.`);

  const albumRuntimes = tracksByAlbum.reduce((map, [albumId, tracks]) => {
    const current = map[albumId] ?? 0;
    map[albumId] = current + sumBy(tracks, (track) => track.duration_ms);
    return map;
  }, {} as Record<string, number>);

  await LocalFetcher.saveAlbums(
    albums.map((album) => ({
      id: album.id,
      name: album.name,
      totalRuntime: albumRuntimes[album.id] ?? -1,
      artistId: artistId,
      image: album.images.at(-1)?.url ?? null,
    }))
  );

  await LocalFetcher.persistTracksAndArtists(allTracks);
  return LocalFetcher.getArtistAlbums(artistId);
}

export type TrackTimingResponse = {
  artist: Artist;
  totalTimeMs: number;
  time: TimeUnits;
  albums: {
    name: string;
    id: string;
    image: string | null;
    runtime: number;
  }[];
};

export async function getArtistTrackTiming(
  artistId: string
): Promise<TrackTimingResponse | null> {
  let artist = await getArtistById(artistId);
  if (!artist) return null;

  const albums = await getArtistAlbums(artistId);

  if (artist.totalRuntime > 0) {
    return {
      albums: albums.map((album) => ({
        id: album.id,
        name: album.name,
        runtime: album.totalRuntime,
        image: album.image,
      })),
      artist,
      totalTimeMs: artist.totalRuntime,
      time: getTimeUnits(artist.totalRuntime),
    };
  }

  await LocalFetcher.aggregateSongPlaytime(artistId);
  artist = (await getArtistById(artistId))!;

  return {
    artist,
    totalTimeMs: artist.totalRuntime,
    albums: albums.map((album) => ({
      id: album.id,
      name: album.name,
      runtime: album.totalRuntime,
      image: album.image,
    })),
    time: getTimeUnits(artist.totalRuntime),
  };
}
