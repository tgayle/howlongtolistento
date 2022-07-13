import { json, redirect, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { ArtistItem } from "~/components/ArtistItem";
import { SearchArtistBar } from "~/components/SearchArtistBar";
import { type SearchArtistResponse, searchArtists } from "~/spotify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const referrer = request.headers.get("referer");
  const url = new URL(request.url);
  const refererUrl = referrer ? new URL(referrer) : null;

  const artist = url.searchParams.get("artist") ?? "";

  if (!refererUrl || refererUrl.pathname === "/search") {
    console.log(refererUrl?.pathname);
    if (!artist) {
      return redirect("/");
    }

    return json(await searchArtists(artist, 10));
  }

  return json(await searchArtists(artist));
};

export default function Index() {
  const data = useLoaderData<SearchArtistResponse>();
  const [params] = useSearchParams();

  return (
    <div className="flex flex-col flex-grow items-center">
      <SearchArtistBar initialValue={params.get("artist") ?? ""} />
      <ul className="grid grid-cols-1 sm:grid-cols-2">
        {data.map((artist) => (
          <ArtistItem key={artist.id} artist={artist} />
        ))}
      </ul>
    </div>
  );
}
