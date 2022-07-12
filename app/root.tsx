import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Link,
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

export default function App() {
  return (
    <html lang="en" className="bg-gray-700 ">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="h-screen w-screen overflow-hidden font-sans">
        <header className="grid grid-cols-3 place-items-center px-8 py-4">
          <div className="justify-self-end flex gap-4 col-start-3"></div>
        </header>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />

        <footer className="absolute bottom-1 w-full text-gray-50 text-center">
          Powered by Remix, made by{" "}
          <a href="https://github.com/tgayle">@tgayle</a>
        </footer>
      </body>
    </html>
  );
}

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: styles,
  },
];

const Button: React.FC = ({ children, ...rest }) => {
  return (
    <button {...rest} className="hover:bg-gray-800 p-2 rounded-md text-white">
      {children}
    </button>
  );
};
