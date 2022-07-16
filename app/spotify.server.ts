import type { Album, Artist, Track } from "@prisma/client";
import { validateToken } from "./data/auth.server";
import { db } from "./db.server";
import type {
  AlbumItem,
  ArtistItem,
  GetAlbumsResponse,
  GetAlbumTracksResponse,
  RemoteArtist,
  SearchResponse,
  TrackItem,
} from "./types";
import { getTimeUnits, type TimeUnits } from "./util";

export async function getArtistById(id: string): Promise<Artist | null> {
  const localArtist = await db.artist.findUnique({ where: { id } });

  if (localArtist) return localArtist;

  await validateToken();

  const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
    headers: {
      Authorization: `Bearer ${global.tokenInfo?.token}`,
    },
  });

  if (res.status === 400) return null;

  const artist: ArtistItem = await res.json();
  console.log(artist);

  const newArtist = await db.artist.upsert({
    where: { id },
    create: {
      id,
      name: artist.name,
      totalRuntime: -1,
      image: artist.images.at(-1)?.url ?? null,
    },
    update: {
      name: artist.name,
      image: artist.images.at(-1)?.url ?? null,
    },
  });

  return newArtist;
}

async function aggregateSongPlaytime(artistId: string) {
  const totalTrackLength = await db.track.aggregate({
    _sum: { runtime: true },
    where: {
      ArtistTrackMapping: {
        some: { artistId },
      },
    },
  });

  await db.artist.update({
    where: {
      id: artistId,
    },
    data: {
      totalRuntime: totalTrackLength._sum.runtime ?? 0,
    },
  });
}

export async function getArtistAlbums(artistId: string): Promise<Album[]> {
  const localAlbums = await db.album.findMany({
    where: { artistId: artistId },
    distinct: "name",
    orderBy: { totalRuntime: "desc" },
  });
  if (localAlbums.length) return localAlbums;

  await validateToken();

  let url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`;
  const albums: AlbumItem[] = [];

  do {
    const res: GetAlbumsResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.tokenInfo?.token}`,
      },
    }).then((it) => it.json());

    albums.push(...res.items);

    url = res.next;
  } while (url);

  console.log(`Got ${albums.length} albums`);
  const tracksByAlbum = await Promise.all(
    albums.map(
      async (album) => [album.id, await fetchAlbumTracks(album.id)] as const
    )
  );
  console.log(
    `Got ${tracksByAlbum.reduce(
      (sum, it) => sum + it[1].length,
      0
    )} tracks for those ${albums.length} albums.`
  );

  const albumRuntimes = tracksByAlbum.reduce((map, [albumId, tracks]) => {
    const current = map[albumId] ?? 0;
    map[albumId] =
      current + tracks.reduce((sum, track) => sum + track.duration_ms, 0);
    return map;
  }, {} as Record<string, number>);

  await db.album.createMany({
    skipDuplicates: true,
    data: albums.map((album) => ({
      id: album.id,
      name: album.name,
      totalRuntime: albumRuntimes[album.id] ?? -1,
      artistId: artistId,
      image: album.images.at(-1)?.url ?? null,
    })),
  });

  const allTracks = tracksByAlbum
    .map(([albumId, tracks]) => tracks.map((it) => ({ ...it, albumId })))
    .flat();

  const start = Date.now();

  const allArtists: Record<string, RemoteArtist> = {};
  allTracks.forEach((track) =>
    track.artists.forEach((artist) => (allArtists[artist.id] = artist))
  );

  console.log(`Inserting ${allTracks.length} tracks for ${artistId}`);
  await db.$transaction([
    db.track.createMany({
      skipDuplicates: true,
      data: allTracks.map((track) => ({
        id: track.id,
        name: track.name,
        runtime: track.duration_ms,
        albumId: track.albumId,
      })),
    }),
    db.artist.createMany({
      skipDuplicates: true,
      data: Object.values(allArtists).map((artist) => ({
        id: artist.id,
        name: artist.name,
        totalRuntime: -1,
      })),
    }),
    db.artistTrackMapping.createMany({
      skipDuplicates: true,
      data: allTracks
        .map((track) =>
          track.artists.map((artist) => ({
            trackId: track.id,
            artistId: artist.id,
          }))
        )
        .flat(),
    }),
  ]);

  console.log(
    `Finished inserting ${allTracks.length} tracks for ${artistId} in ${
      Date.now() - start
    }ms`
  );

  return await db.album.findMany({
    where: { artistId: artistId },
    distinct: "name",
    orderBy: { totalRuntime: "desc" },
  });
}

async function fetchAlbumTracks(albumId: string): Promise<TrackItem[]> {
  console.log("Fetching tracks for album", albumId);
  await validateToken();

  let url:
    | string
    | null = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
  const tracks: TrackItem[] = [];

  do {
    const res: GetAlbumTracksResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.tokenInfo?.token}`,
      },
    }).then((it) => it.json());

    tracks.push(...(res.items ?? []));

    url = res.next;
  } while (url);

  return tracks;
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
        // songs: [],
        image: album.image,
      })),
      artist,
      totalTimeMs: artist.totalRuntime,
      time: getTimeUnits(artist.totalRuntime),
    };
  }

  await validateToken();

  await aggregateSongPlaytime(artistId);
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

export async function getArtistCount() {
  return db.artist.count();
}
