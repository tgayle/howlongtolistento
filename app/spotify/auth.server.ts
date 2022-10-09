type TokenInfo = { expiration: number; token: string };

declare global {
  var tokenInfo: TokenInfo | undefined;
}

const SPOTIFY = "https://accounts.spotify.com";

export class SpotifyAuth {
  static async refreshToken() {
    if (global.tokenInfo && global.tokenInfo.expiration > Date.now()) {
      return global.tokenInfo.token;
    }

    console.log("Refreshing token!");
    const signedSecret = Buffer.from(
      `${process.env.SPOTIFY_ID}:${process.env.SPOTIFY_SECRET}`
    ).toString("base64");

    const response = await fetch(`${SPOTIFY}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${signedSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    console.log(`Token refreshed ${response.status}`);
    const { access_token, expires_in } = await response.json();

    global.tokenInfo = {
      token: access_token,
      expiration: Date.now() + expires_in * 1000,
    };

    return global.tokenInfo.token;
  }
}
