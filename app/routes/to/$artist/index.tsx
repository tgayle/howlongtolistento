import { MetaFunction, Response, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SearchArtistBar } from "~/components/SearchArtistBar";
import {
  getArtistTrackTiming,
  type TrackTimingResponse,
} from "~/spotify.server";

export const meta: MetaFunction = ({ data }: { data: TrackTimingResponse }) => {
  return {
    title: `How long to listen to ${data.artist.name}?`,
    description: `It would take ${data.time.string} to listen to ${data.artist.name}`,
  };
};

export const loader: LoaderFunction = async ({
  params: { artist: artistId },
}) => {
  if (!artistId) throw new Response("Not found!", { status: 404 });
  return getArtistTrackTiming(artistId);
};

export default function Index() {
  const {
    albums,
    artist,
    time: { days, hours, minutes, seconds, totalSeconds },
  } = useLoaderData<TrackTimingResponse>();
  return (
    <div>
      <SearchArtistBar initialValue={artist.name} key={artist.id} />

      <div className="text-white text-center">
        <p>It'll take</p>
        <div className="flex justify-center items-center gap-4 py-2">
          <TimeDurationItem unit="day" time={days} />
          <TimeDurationItem unit="hour" time={hours} />
          <TimeDurationItem unit="minute" time={minutes} />
          <TimeDurationItem unit="second" time={seconds} />
        </div>
        <p>{totalSeconds} seconds total</p>
      </div>
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
