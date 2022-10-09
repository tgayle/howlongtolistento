import { Artist, Album, Track } from "@prisma/client";
import { db } from "~/db.server";
import { ArtistItem } from "~/types";
import { BaseFetcher } from "./BaseFetcher";

class LocalFetcher implements BaseFetcher {
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
}

export default new LocalFetcher();
