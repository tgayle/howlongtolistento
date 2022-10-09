import LocalFetcherServer from "~/spotify/LocalFetcher.server";

export async function loader() {
  await LocalFetcherServer.getArtistCount();
  return new Response("howdy!", { status: 200 });
}
