export interface SearchResponse {
  artists: Artists;
}

export interface Artists {
  href: string;
  items?: ArtistItem[];
  limit: number;
  next: string;
  offset: number;
  previous: null;
  total: number;
}

export interface ArtistItem {
  external_urls: ExternalUrls;
  followers: Followers;
  genres: string[];
  href: string;
  id: string;
  images: Image[];
  name: string;
  popularity: number;
  type: EntityType;
  uri: string;
}

export interface ExternalUrls {
  spotify: string;
}

export interface Followers {
  href: null;
  total: number;
}

export interface Image {
  height: number;
  url: string;
  width: number;
}

export enum EntityType {
  Artist = "artist",
  Track = "track",
}

export interface GetAlbumsResponse {
  href: string;
  items: AlbumItem[];
  limit: number;
  next: string;
  offset: number;
  previous: null;
  total: number;
}

export interface AlbumItem {
  album_group: AlbumGroup;
  album_type: AlbumGroup;
  artists: RemoteArtist[];
  available_markets: string[];
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: ReleaseDatePrecision;
  total_tracks: number;
  type: AlbumGroup;
  uri: string;
}

export enum AlbumGroup {
  Album = "album",
  Single = "single",
}

export interface RemoteArtist {
  external_urls: ExternalUrls;
  href: string;
  id: string;
  name: string;
  type: EntityType;
  uri: string;
}

export enum ReleaseDatePrecision {
  Day = "day",
}

export interface GetAlbumTracksResponse {
  href: string;
  items: TrackItem[] | undefined;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface TrackItem {
  artists: RemoteArtist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  preview_url: string;
  track_number: number;
  type: EntityType.Track;
  uri: string;
}
