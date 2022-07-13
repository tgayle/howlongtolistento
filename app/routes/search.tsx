import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ArtistItem } from "~/components/ArtistItem";
import { SearchArtistBar } from "~/components/SearchArtistBar";
import { type SearchArtistResponse, searchArtists } from "~/spotify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const referrer = request.headers.get("referer");
  const url = new URL(request.url);
  const refererUrl = referrer ? new URL(referrer) : null;

  console.log(refererUrl);

  if (!refererUrl || refererUrl.pathname.startsWith("/search")) {
    return json(await searchArtists(url.searchParams.get("artist") ?? "", 10));
  }

  return json(await searchArtists(url.searchParams.get("artist") ?? ""));
};

export default function Index() {
  const data = useLoaderData<SearchArtistResponse>();

  return (
    <div className="flex flex-col flex-grow items-center">
      <SearchArtistBar />
      <ul className="grid grid-cols-1 sm:grid-cols-2">
        {data.map((artist) => (
          <ArtistItem key={artist.id} artist={artist} />
        ))}
      </ul>
    </div>
  );
}
