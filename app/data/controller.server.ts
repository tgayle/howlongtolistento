import { validateToken } from "./auth.server";
import spotify, { type LocalArtist } from "./spotify.server";

export async function searchArtists(query: string): Promise<LocalArtist[]> {
  if (query.length < 3) {
    return [];
  }

  if (typeof (await validateToken()) === "object") {
    // switch to degraded state for request.
    // TODO: Respect Spotify's wait-to-retry header
  }
}
