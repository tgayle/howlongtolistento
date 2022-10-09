type TokenInfo = { expiration: number; token: string };

declare global {
  var tokenInfo: TokenInfo | undefined;
}

const SPOTIFY = "https://accounts.spotify.com";

export class SpotifyAuth {
  static isTokenExpired(): boolean {
    if (!global.tokenInfo) return true;

    return global.tokenInfo.expiration < Date.now();
  }

  static async refreshToken() {
    if (!this.isTokenExpired()) {
      return global.tokenInfo!.token;
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

  static async signedFetch<T>(url: string): Promise<APIResponse<T>> {
    await this.refreshToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.tokenInfo?.token}`,
      },
    });

    if (response.status >= 200 && response.status < 300) {
      return {
        status: response.status,
        data: await response.json(),
        success: true,
      };
    }

    console.warn("Error fetching URL", url);
    console.warn(
      `  Got response ${response.status} '${await response.text()}'`
    );

    return {
      status: response.status,
      data: null,
      success: false,
    };
  }
}

type APIResponse<T> =
  | {
      status: number;
      data: T | null;
      success: false;
    }
  | {
      status: number;
      data: T;
      success: true;
    };
