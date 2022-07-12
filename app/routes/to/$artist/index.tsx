import { Response, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SearchArtistBar } from "~/components/SearchArtistBar";
import {
  getArtistTrackTiming,
  type TrackTimingResponse,
} from "~/spotify.server";

export default function Index() {
  const { albums, artist, totalTimeMs } = useLoaderData<TrackTimingResponse>();

  const totalSeconds = totalTimeMs / 1000;
  const secondsRemaining = totalSeconds % 60;
  const minutes = (totalSeconds / 60) % 60;
  const hours = (totalSeconds / 60 / 60) % 60;
  const days = totalSeconds / 60 / 60 / 24;

  return (
    <div>
      <SearchArtistBar initialValue={artist.name} key={artist.id} />

      <div className="text-white">
        <p>It'll take</p>
        <div className="flex justify-center items-center flex-col">
          <TimeDurationItem unit="days" time={days} />
          <TimeDurationItem unit="hours" time={hours} />
          <TimeDurationItem unit="minutes" time={minutes} />
          <TimeDurationItem unit="seconds" time={secondsRemaining} />

          <p>{totalSeconds} seconds total</p>
        </div>
      </div>
    </div>
  );
}

export const loader: LoaderFunction = async ({
  params: { artist: artistId },
}) => {
  if (!artistId) throw new Response("Not found!", { status: 404 });
  return getArtistTrackTiming(artistId);
};

function TimeDurationItem({ unit, time }: { unit: string; time: number }) {
  return (
    <div className="p-4 text-center">
      <p>{time.toPrecision(2)}</p>
      <p>{unit}</p>
    </div>
  );
}
