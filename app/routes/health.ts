import { getArtistCount } from "~/spotify.server";

export async function loader() {
  await getArtistCount();
  return new Response("howdy!", { status: 200 });
}
