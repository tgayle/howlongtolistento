import type { Album, Artist } from "@prisma/client";
import { APIResponse, APIResponseSuccess } from "./spotify/auth.server";
import LocalFetcher from "./spotify/LocalFetcher.server";
import RemoteFetcher from "./spotify/RemoteFetcher.server";
import { TrackItem } from "./types";
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
  if (query.trim().length < 2) return [];

  const { data: res, success } = await RemoteFetcher.searchArtists(
    query,
    limit
  );

  if (!success) {
    const localArtists = await LocalFetcher.searchArtists(query, limit);
    return localArtists.map<LocalArtist>((artist) => ({
      id: artist.id,
      name: artist.name,
      image: artist.image,
    }));
  }

  return (
    res.artists.items?.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.images?.at?.(-1)?.url || null,
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

  const { data: albums, success: albumSuccess } =
    await RemoteFetcher.getArtistAlbums(artistId);

  if (!albumSuccess) return [];

  console.log(`Got ${albums.length} albums`);
  const tracksByAlbum = await Promise.all(
    albums.map(
      async (album) =>
        [album.id, await RemoteFetcher.getAlbumTracks(album.id)] as const
    )
  );

  if (!requireSuccessfulTracks(tracksByAlbum)) {
    return [];
  }

  const allTracks = tracksByAlbum
    .map(([albumId, { data: tracks }]) =>
      tracks.map((it) => ({ ...it, albumId }))
    )
    .flat();

  console.log(`Got ${allTracks.length} tracks from ${albums.length} albums.`);

  const albumRuntimes = tracksByAlbum.reduce(
    (map, [albumId, { data: tracks }]) => {
      const current = map[albumId] ?? 0;
      map[albumId] = current + sumBy(tracks, (track) => track.duration_ms);
      return map;
    },
    {} as Record<string, number>
  );

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

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isStale(lastUpdated: Date | null): boolean {
  if (!lastUpdated) return false;
  return Date.now() - lastUpdated.getTime() > THREE_DAYS_MS;
}

export async function getArtistTrackTiming(
  artistId: string
): Promise<TrackTimingResponse | null> {
  let artist = await getArtistById(artistId);
  if (!artist) return null;

  if (isStale(artist.lastUpdated)) {
    console.log(`Artist ${artist.name} cache is stale, clearing...`);
    await LocalFetcher.clearArtistCache(artistId);
    artist = (await getArtistById(artistId))!;
  }

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

type AlbumIdToTrackResponses<
  R extends APIResponse<TrackItem[]> = APIResponse<TrackItem[]>
> = Readonly<[string, R]>[];
function requireSuccessfulTracks(
  tracks: AlbumIdToTrackResponses
): tracks is AlbumIdToTrackResponses<APIResponseSuccess<TrackItem[]>> {
  for (const [, { success }] of tracks) {
    if (!success) {
      return false;
    }
  }

  return true;
}
