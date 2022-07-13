import { useFetcher, useTransition } from "@remix-run/react";
import { type SearchArtistResponse } from "~/spotify.server";
import { ArtistItem } from "./ArtistItem";

export function SearchArtistBar({ initialValue }: { initialValue?: string }) {
  const autocomplete = useFetcher<SearchArtistResponse>();
  const transition = useTransition();

  return (
    <div className="flex flex-col w-full items-center justify-center">
      <h1 className="text-white font-thin text-2xl sm:text-3xl">
        how long to listen to?
      </h1>

      <autocomplete.Form
        method="get"
        action="/search"
        className="block relative"
      >
        <div className="relative my-4">
          <input
            placeholder="Drake?"
            className="h-12 w-full sm:w-80 lg:w-96 p-4 rounded-lg shadow-lg block"
            name="artist"
            autoComplete="off"
            defaultValue={initialValue}
            onChange={(e) => {
              autocomplete.submit(e.target.form);
            }}
          />

          <svg
            className={`animate-spin text-blue-800 h-1/2 absolute right-0 top-0 mr-3 mt-3 ${
              transition.state === "loading" ? "opacity-100" : "opacity-0"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>

        <ul className="absolute w-full rounded-lg bg-gray-800">
          {autocomplete.data?.map((it) => (
            <ArtistItem artist={it} key={it.id} />
          ))}
        </ul>
      </autocomplete.Form>
    </div>
  );
}
