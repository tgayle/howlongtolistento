import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import styles from "./tailwind.css";

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "how long to listen to?",
  viewport: "width=device-width,initial-scale=1",
});

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: styles,
  },
];

export default function App() {
  return (
    <html lang="en" className="bg-gray-700 ">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="h-screen w-screen overflow-x-hidden font-sans flex flex-col">
        <header className="grid grid-cols-3 place-items-center px-8 py-4">
          <div className="justify-self-end flex gap-4 col-start-3"></div>
        </header>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />

        <footer className="w-full text-gray-50 text-left p-1">
          made by <a href="https://twitter.com/almostnottravis">trav</a>
        </footer>
      </body>
    </html>
  );
}
