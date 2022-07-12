import type { Album, Artist, Track } from "@prisma/client";
import { db } from "./db.server";
import type {
  AlbumItem,
  RemoteArtist,
  ArtistItem,
  GetAlbumsResponse,
  GetAlbumTracksResponse,
  SearchResponse,
  TrackItem,
} from "./types";
type TokenInfo = { expiration: number; token: string };

declare global {
  var tokenInfo: TokenInfo | undefined;
}

export type LocalArtist = {
  image: string | null;
  name: string;
  id: string;
};

export type SearchArtistResponse = LocalArtist[];

export async function searchArtists(
  query: string
): Promise<SearchArtistResponse> {
  if (query.length < 3) return [];

  await refreshToken();
  const res: SearchResponse = await fetch(
    `https://api.spotify.com/v1/search?type=artist&q=${query}&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${global.tokenInfo?.token}`,
      },
    }
  ).then((it) => {
    console.log(it.status);
    return it.json();
  });

  return (
    res.artists.items?.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.images?.at(-1)?.url || null,
    })) ?? []
  );
}

export async function getArtistById(id: string): Promise<Artist> {
  const artist = await db.artist.findUnique({ where: { id } });

  if (artist) return artist;

  await refreshToken();

  const res: ArtistItem = await fetch(
    `https://api.spotify.com/v1/artists/${id}`,
    {
      headers: {
        Authorization: `Bearer ${global.tokenInfo?.token}`,
      },
    }
  ).then((it) => it.json());

  const r = await db.artist.upsert({
    where: { id },
    create: {
      id,
      name: res.name,
      totalRuntime: -1,
    },
    update: {
      name: res.name,
    },
  });

  return r;
}

async function aggregateSongPlaytime(artistId: string) {
  const albumLengths = db.album.aggregate({
    where: {
      artistId,
    },
    _sum: {
      totalRuntime: true,
    },
  });

  await db.artist.update({
    where: {
      id: artistId,
    },
    data: {
      totalRuntime: (await albumLengths)._sum.totalRuntime ?? 0,
    },
  });
}

export async function getArtistAlbums(artistId: string): Promise<Album[]> {
  const localAlbums = await db.album.findMany({
    where: { artistId: artistId },
  });
  if (localAlbums.length) return localAlbums;

  await refreshToken();

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
    })),
  });

  const allTracks = tracksByAlbum
    .map(([albumId, tracks]) => tracks.map((it) => ({ ...it, albumId })))
    .flat();

  await db.track.createMany({
    skipDuplicates: true,
    data: allTracks.map((track) => ({
      id: track.id,
      name: track.name,
      runtime: track.duration_ms,
      albumId: track.albumId,
    })),
  });
  return await db.album.findMany({
    where: { artistId: artistId },
  });
}

async function fetchAlbumTracks(albumId: string): Promise<TrackItem[]> {
  console.log("Fetching tracks for album", albumId);
  await refreshToken();

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

// async function getAlbumTracks(albumId: string): Promise<Track[]> {
//   console.log("Fetching tracks for album", albumId);
//   const localTracks = await db.track.findMany({ where: { albumId } });
//   if (localTracks.length) return localTracks;

//   await refreshToken();

//   let url:
//     | string
//     | null = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
//   const tracks: TrackItem[] = [];

//   do {
//     const res: GetAlbumTracksResponse = await fetch(url, {
//       headers: {
//         Authorization: `Bearer ${global.tokenInfo?.token}`,
//       },
//     }).then((it) => it.json());

//     tracks.push(...(res.items ?? []));

//     url = res.next;
//   } while (url);

//   await db.track.createMany({
//     skipDuplicates: true,
//     data: tracks.map((track) => ({
//       id: track.id,
//       name: track.name,
//       runtime: track.duration_ms,
//       albumId,
//     })),
//   });

//   return await db.track.findMany({ where: { albumId } });
// }

export type TrackTimingResponse = {
  artist: Artist;
  totalTimeMs: number;
  albums: {
    name: string;
    id: string;
    runtime: number;
    songs: { name: string; id: string; runtime: number }[];
  }[];
};

export async function getArtistTrackTiming(
  artistId: string
): Promise<TrackTimingResponse> {
  let artist = await getArtistById(artistId);

  if (artist.totalRuntime > 0) {
    return {
      albums: [],
      artist,
      totalTimeMs: artist.totalRuntime,
    };
  }

  await refreshToken();
  const albums = await getArtistAlbums(artistId);

  // const albumTrackMap: TrackTimingResponse["albums"] = await Promise.all(
  //   albums.map(async (album) => {
  //     if (album.totalRuntime > 0) {
  //       return {
  //         name: album.name,
  //         id: album.id,
  //         runtime: album.totalRuntime,
  //         songs: [],
  //       };
  //     }

  //     const tracks = await getAlbumTracks(album.id);

  //     return {
  //       name: album.name,
  //       id: album.id,
  //       runtime: album.totalRuntime,
  //       songs: tracks.map((track) => ({
  //         name: track.name,
  //         id: track.id,
  //         runtime: track.runtime,
  //       })),
  //     };
  //   })
  // );

  await aggregateSongPlaytime(artistId);
  artist = await getArtistById(artistId);
  return {
    artist,
    totalTimeMs: artist.totalRuntime,
    albums: [],
  };
}

const SPOTIFY = "https://accounts.spotify.com";
async function refreshToken() {
  if (global.tokenInfo && global.tokenInfo.expiration > Date.now()) {
    return global.tokenInfo.token;
  }

  console.trace("Refreshing token!");
  const signedSecret = Buffer.from(
    `${process.env.SPOTIFY_ID}:${process.env.SPOTIFY_SECRET}`
  ).toString("base64");

  const response = await fetch(`${SPOTIFY}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${signedSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const { access_token, expires_in } = await response.json();

  global.tokenInfo = {
    token: access_token,
    expiration: Date.now() + expires_in * 1000,
  };

  return global.tokenInfo.token;
}

function chunked<T>(arr: T[], size: number): T[][] {
  const result = arr.reduce((resultArray: T[][], item, index) => {
    const chunkIndex = Math.floor(index / size);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);

  return result;
}
