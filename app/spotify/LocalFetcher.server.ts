import { Artist, Album, Track, Prisma } from "@prisma/client";
import { db } from "~/db.server";
import { ArtistItem, RemoteArtist, TrackItem } from "~/types";
import { BaseFetcher } from "./BaseFetcher";

class LocalFetcher implements BaseFetcher {
  searchArtists(query: string): Promise<Artist[]> {
    return db.artist.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      orderBy: {
        name: "asc",
      },
    });
  }

  getArtistById(id: string): Promise<Artist | null> {
    return db.artist.findUnique({ where: { id } });
  }

  getArtistAlbums(artistId: string): Promise<Album[]> {
    return db.album.findMany({
      where: { artistId: artistId },
      distinct: "name",
      orderBy: { totalRuntime: "desc" },
    });
  }

  getAlbumTracks(albumId: string): Promise<Track[]> {
    return db.track.findMany({
      where: { albumId },
    });
  }

  async saveArtist(artist: ArtistItem): Promise<Artist> {
    const id = artist.id;
    return db.artist.upsert({
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
  }

  async getArtistCount() {
    return db.artist.count();
  }

  async aggregateSongPlaytime(artistId: string) {
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

  async saveAlbums(albums: Prisma.AlbumCreateManyInput[]) {
    await db.album.createMany({
      skipDuplicates: true,
      data: albums,
    });
  }

  saveTracks(tracks: Prisma.TrackCreateManyInput[]) {
    return db.track.createMany({
      skipDuplicates: true,
      data: tracks,
    });
  }

  saveArtistTrackMappings(
    mappings: Prisma.ArtistTrackMappingCreateManyInput[]
  ) {
    return db.artistTrackMapping.createMany({
      skipDuplicates: true,
      data: mappings,
    });
  }

  saveArtists(artists: Prisma.ArtistCreateManyInput[]) {
    return db.artist.createMany({
      skipDuplicates: true,
      data: artists,
    });
  }

  async persistTracksAndArtists(tracks: (TrackItem & { albumId: string })[]) {
    const start = Date.now();
    console.log(`Inserting ${tracks.length} tracks`);

    const localTracks = tracks.map((track) => ({
      id: track.id,
      name: track.name,
      runtime: track.duration_ms,
      albumId: track.albumId,
    }));

    const localArtists = aggregateArtistsFromTracks(tracks).map((artist) => ({
      id: artist.id,
      name: artist.name,
      totalRuntime: -1,
    }));

    const localArtistTrackMappings = tracks.flatMap((track) =>
      track.artists.map((artist) => ({
        trackId: track.id,
        artistId: artist.id,
      }))
    );

    await db.$transaction([
      this.saveTracks(localTracks),
      this.saveArtists(localArtists),
      this.saveArtistTrackMappings(localArtistTrackMappings),
    ]);

    console.log(
      `Finished inserting ${tracks.length} tracks in ${Date.now() - start}ms`
    );
  }
}

function aggregateArtistsFromTracks(tracks: TrackItem[]) {
  const allArtists: Record<string, RemoteArtist> = {};

  for (const track of tracks) {
    for (const artist of track.artists) {
      allArtists[artist.id] = artist;
    }
  }

  return Object.values(allArtists);
}

export default new LocalFetcher();
