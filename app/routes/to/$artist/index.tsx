import {
  type MetaFunction,
  type LoaderFunction,
  redirect,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SearchArtistBar } from "~/components/SearchArtistBar";
import {
  getArtistById,
  getArtistTrackTiming,
  searchArtists,
  type TrackTimingResponse,
} from "~/spotify.server";
import { getTimeUnits } from "~/util";

export const meta: MetaFunction = ({
  data,
}: {
  data: TrackTimingResponse | null;
}) => {
  if (!data)
    return {
      title: "Not found",
    };

  return {
    title: `How long to listen to ${data.artist.name}?`,
    description: `It would take ${data.time.string} to listen to ${data.artist.name}`,
  };
};

export const loader: LoaderFunction = async ({
  params: { artist: artistId },
}) => {
  if (!artistId?.trim()) return redirect("/");

  if (await getArtistById(artistId)) {
    return getArtistTrackTiming(artistId);
  }

  // treat the path as a search request:
  const results = await searchArtists(artistId);
  if (results.length) {
    return redirect(`/to/${results[0].id}`);
  }

  return redirect("/");
};

export default function Index() {
  const {
    albums,
    artist,
    time: { days, hours, minutes, seconds, totalSeconds, cellsUsed },
  } = useLoaderData<TrackTimingResponse>();

  const gridWidth = {
    0: "",
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className="flex flex-col items-center flex-grow">
      <SearchArtistBar initialValue={artist.name} key={artist.id} />

      <div className="text-white text-center">
        <p>It'll take</p>
        <div className={`gap-4 py-2 grid ${gridWidth[cellsUsed]}`}>
          <TimeDurationItem unit="day" time={days} />
          <TimeDurationItem unit="hour" time={hours} />
          <TimeDurationItem unit="minute" time={minutes} />
          <TimeDurationItem unit="second" time={seconds} />
        </div>
        <p className="p-1">{totalSeconds} seconds total</p>
      </div>

      <ul className="max-w-md">
        {albums.map(({ id, name, runtime, image }) => (
          <li key={id} className="block text-white p-4">
            <div className="flex gap-4">
              <div className="aspect-square rounded-full w-12 h-12 bg-slate-400 flex justify-center items-center">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="aspect-square rounded-full w-12 h-12"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    viewBox="0 0 48 48"
                  >
                    <path d="M24 23.95q-3.3 0-5.4-2.1-2.1-2.1-2.1-5.4 0-3.3 2.1-5.4 2.1-2.1 5.4-2.1 3.3 0 5.4 2.1 2.1 2.1 2.1 5.4 0 3.3-2.1 5.4-2.1 2.1-5.4 2.1ZM8 40v-4.7q0-1.9.95-3.25T11.4 30q3.35-1.5 6.425-2.25Q20.9 27 24 27q3.1 0 6.15.775 3.05.775 6.4 2.225 1.55.7 2.5 2.05.95 1.35.95 3.25V40Zm3-3h26v-1.7q0-.8-.475-1.525-.475-.725-1.175-1.075-3.2-1.55-5.85-2.125Q26.85 30 24 30t-5.55.575q-2.7.575-5.85 2.125-.7.35-1.15 1.075Q11 34.5 11 35.3Zm13-16.05q1.95 0 3.225-1.275Q28.5 18.4 28.5 16.45q0-1.95-1.275-3.225Q25.95 11.95 24 11.95q-1.95 0-3.225 1.275Q19.5 14.5 19.5 16.45q0 1.95 1.275 3.225Q22.05 20.95 24 20.95Zm0-4.5ZM24 37Z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-ellipsis" title={name}>
                  {name}
                </p>
                <p>{getTimeUnits(runtime).string}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimeDurationItem({ unit, time }: { unit: string; time: number }) {
  if (time <= 0) return null;
  return (
    <div className="text-center w-20 h-20 flex flex-col items-center justify-center border rounded-md">
      <p>{time.toFixed(0)}</p>
      <p>
        {unit}
        {time > 1 ? "s" : ""}
      </p>
    </div>
  );
}
