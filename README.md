# howlongtolisten.com

Helps you find out how long it would take to listen to your favorite artist's songs. Give it a try at [howlongtolisten.com](https://howlongtolisten.com).

## Tech

howlongtolisten.com is built with:
- [Remix](https://remix.run)
- [Prisma](https://prisma.io)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Tailwind CSS](https://tailwindcss.com)
- [PostgreSQL](https://www.postgresql.org/)
- Hosted on [Render](https://render.com)

Thanks to the magic of Remix as well, no Javascript is required to use this website at all!

## Development

Make sure to supply the following environment variables:
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `DATABASE_URL`

Then run `npm install` and `npm run dev` to start the development server.

