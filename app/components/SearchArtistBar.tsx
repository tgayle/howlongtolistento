import { useFetcher } from "@remix-run/react";
import { type SearchArtistResponse } from "~/spotify.server";
import { ArtistItem } from "./ArtistItem";

export function SearchArtistBar({ initialValue }: { initialValue?: string }) {
  const autocomplete = useFetcher<SearchArtistResponse>();

  return (
    <div className="flex flex-col w-full items-center justify-center">
      <h1 className="text-white font-thin text-2xl sm:text-3xl">
        how long to listen to?
      </h1>

      <autocomplete.Form
        method="get"
        action="/artist-autocomplete"
        className="block relative"
      >
        <input
          placeholder="Drake?"
          className="h-12 w-full sm:w-80 lg:w-96 p-4 rounded-lg my-4 shadow-lg block"
          name="artist"
          autoComplete="off"
          defaultValue={initialValue}
          onChange={(e) => {
            autocomplete.submit(e.target.form);
          }}
        />

        <ul className="absolute w-full rounded-lg bg-gray-800">
          {autocomplete.data?.map((it) => (
            <ArtistItem artist={it} key={it.id} />
          ))}
        </ul>
      </autocomplete.Form>
    </div>
  );
}
