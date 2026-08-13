import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

// Returns "Track — Artist" if the user is currently scrobbling something
// live, or null if nothing is playing / username invalid / API unavailable.
export async function getNowPlaying(username) {
  if (!LASTFM_API_KEY || !username) return null;

  try {
    const { data } = await axios.get(LASTFM_BASE, {
      params: {
        method: "user.getrecenttracks",
        user: username,
        api_key: LASTFM_API_KEY,
        format: "json",
        limit: 1,
      },
      timeout: 5000,
    });

    const track = data?.recenttracks?.track?.[0];
    if (!track) return null;

    const isNowPlaying = track["@attr"]?.nowplaying === "true";
    if (!isNowPlaying) return null;

    const name = track.name;
    const artist = track.artist?.["#text"] || track.artist?.name;
    if (!name) return null;

    return artist ? `${name} — ${artist}` : name;
  } catch (err) {
    console.error("Last.fm error:", err.message);
    return null;
  }
}
