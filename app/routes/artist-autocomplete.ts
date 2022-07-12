import { json, type LoaderFunction } from "@remix-run/node";
import { searchArtists } from "~/spotify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  return json(await searchArtists(url.searchParams.get("artist") ?? ""));
};
