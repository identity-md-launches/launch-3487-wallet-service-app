import snapshot from "./data/fixtures-snapshot.json";
import { SPORTSDB_KEY } from "./config";

export type Sport = "Soccer" | "Basketball" | "American Football" | "Ice Hockey";
export type Fixture = {
  id: string;
  league: string;
  sport: Sport;
  home: string;
  away: string;
  homeBadge: string | null;
  awayBadge: string | null;
  kickoff: string; // ISO, UTC
  venue: string | null;
};

/** The leagues listed, by TheSportsDB league id. */
export const LEAGUES: ReadonlyArray<{ id: string; sport: Sport }> = [
  { id: "4328", sport: "Soccer" }, // English Premier League
  { id: "4335", sport: "Soccer" }, // La Liga
  { id: "4332", sport: "Soccer" }, // Serie A
  { id: "4331", sport: "Soccer" }, // Bundesliga
  { id: "4480", sport: "Soccer" }, // UEFA Champions League
  { id: "4387", sport: "Basketball" }, // NBA
  { id: "4391", sport: "American Football" }, // NFL
  { id: "4380", sport: "Ice Hockey" }, // NHL
];

export const SPORT_LABEL: Record<Sport, string> = {
  Soccer: "Football",
  Basketball: "Basketball",
  "American Football": "American football",
  "Ice Hockey": "Ice hockey",
};

/** Only football has a draw in the result that is analysed. */
export const hasDraw = (s: Sport) => s === "Soccer";

type RawEvent = Record<string, string | null>;

export function toFixture(e: RawEvent): Fixture | null {
  const sport = (e.strSport ?? "") as Sport;
  if (!e.idEvent || !e.strHomeTeam || !e.strAwayTeam || !(sport in SPORT_LABEL)) return null;
  const ts = e.strTimestamp ? `${e.strTimestamp.replace(/Z$/, "")}Z` : `${e.dateEvent}T${e.strTime ?? "00:00:00"}Z`;
  const kickoff = new Date(ts);
  if (Number.isNaN(kickoff.getTime())) return null;
  const tiny = (u: string | null) => (u ? `${u}/tiny` : null);
  return {
    id: e.idEvent,
    league: e.strLeague ?? "",
    sport,
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    homeBadge: tiny(e.strHomeTeamBadge),
    awayBadge: tiny(e.strAwayTeamBadge),
    kickoff: kickoff.toISOString(),
    venue: e.strVenue,
  };
}

const sortByKickoff = (a: Fixture, b: Fixture) => a.kickoff.localeCompare(b.kickoff);

export type FixtureFeed = { fixtures: Fixture[]; source: "live" | "saved"; savedAt?: string };

export function savedFixtures(): FixtureFeed {
  const list = (snapshot.events as RawEvent[]).map(toFixture).filter((f): f is Fixture => !!f).sort(sortByKickoff);
  return { fixtures: list, source: "saved", savedAt: snapshot.savedAt };
}

const CACHE_KEY = "imd-edge:fixtures:v1";
const CACHE_MS = 15 * 60_000; // the free tier is rate limited, so one visitor asks at most every 15 minutes

function cached(now: number): Fixture[] | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null") as { at: number; fixtures: Fixture[] } | null;
    return c && now - c.at < CACHE_MS && Array.isArray(c.fixtures) && c.fixtures.length ? c.fixtures : null;
  } catch {
    return null;
  }
}

/** Next fixture per league from TheSportsDB; falls back to the bundled list if the API is unreachable. */
export async function loadFixtures(signal?: AbortSignal): Promise<FixtureFeed> {
  const now = Date.now();
  const hit = cached(now);
  if (hit) return { fixtures: hit.filter((f) => new Date(f.kickoff).getTime() > now - 2 * 3600_000), source: "live" };
  const results = await Promise.allSettled(
    LEAGUES.map(async (l) => {
      const r = await fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/eventsnextleague.php?id=${l.id}`, { signal });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { events?: RawEvent[] | null };
      return (j.events ?? []).map(toFixture).filter((f): f is Fixture => !!f);
    }),
  );
  const live = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const upcoming = live.filter((f) => new Date(f.kickoff).getTime() > now - 2 * 3600_000).sort(sortByKickoff);
  if (upcoming.length === 0) return savedFixtures();
  // cache only a complete answer, so a rate-limited league is asked again next time
  if (results.every((r) => r.status === "fulfilled")) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: now, fixtures: upcoming }));
    } catch {
      /* storage full or disabled: no cache */
    }
  }
  return { fixtures: upcoming, source: "live" };
}
