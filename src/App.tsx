import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectControl } from "./ConnectSheet";
import { Logo } from "./Logo";
import { PayPanel } from "./PayPanel";
import { MyPredictions } from "./MyPredictions";
import { LEAGUES, SPORT_LABEL, hasDraw, loadFixtures, savedFixtures, type Fixture, type FixtureFeed, type Sport } from "./sports";
import type { Pick } from "./brief";
import { usePredictions } from "./store";
import { CREATOR_WALLET, ETHERSCAN, IMD_INTAKE, IMD_TOKEN, PAYMENT_CONTRACT } from "./config";

type Filter = "all" | Sport;
const SPORTS: Sport[] = Array.from(new Set(LEAGUES.map((l) => l.sport)));

const kickoffFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function App() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = useCallback(() => setSheetOpen(true), []);
  const [feed, setFeed] = useState<FixtureFeed | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const predictions = usePredictions();

  useEffect(() => {
    const ctl = new AbortController();
    loadFixtures(ctl.signal)
      .then(setFeed)
      .catch(() => !ctl.signal.aborted && setFeed(savedFixtures()));
    return () => ctl.abort();
  }, []);

  const shown = useMemo(() => (feed?.fixtures ?? []).filter((f) => filter === "all" || f.sport === filter), [feed, filter]);

  return (
    <>
      <a className="skip" href="#fixtures">Skip to fixtures</a>
      <header className="top">
        <div className="wrap top-in">
          <Logo />
          <ConnectControl open={sheetOpen} setOpen={setSheetOpen} />
        </div>
      </header>

      <main className="wrap layout">
        <section className="intro" aria-labelledby="title">
          <h1 id="title">Call it. Get the edge.</h1>
          <p className="lede">Pick a result, pay 1 IMD, and the IMD swarm writes a pre-match analysis of your call.</p>
        </section>

        <section id="fixtures" className="board" aria-labelledby="fixtures-title">
          <div className="board-head">
            <h2 id="fixtures-title" className="visually-hidden">Upcoming matches</h2>
            <div className="chips" role="group" aria-label="Filter by sport">
              {(["all", ...SPORTS] as Filter[]).map((s) => (
                <button key={s} className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
                  {s === "all" ? "All sports" : SPORT_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {!feed ? (
            <ul className="cards" aria-busy="true" aria-label="Loading matches">
              {[0, 1, 2].map((i) => <li key={i} className="card card-skeleton" />)}
            </ul>
          ) : shown.length === 0 ? (
            <div className="empty">
              <p className="empty-title">No {filter === "all" ? "" : SPORT_LABEL[filter as Sport].toLowerCase() + " "}matches listed right now</p>
              <p>New fixtures appear as the leagues publish them.</p>
              <button className="btn btn-quiet" onClick={() => setFilter("all")}>Show all sports</button>
            </div>
          ) : (
            <ul className="cards">
              {shown.map((f) => (
                <FixtureCard
                  key={f.id}
                  f={f}
                  pick={picks[f.id]}
                  setPick={(p) => setPicks((x) => ({ ...x, [f.id]: p }))}
                  onConnect={openSheet}
                  onPaid={predictions.add}
                />
              ))}
            </ul>
          )}
          {feed && (
            <p className="source">
              {feed.source === "live"
                ? "Fixtures from TheSportsDB, next match per league, times in your time zone."
                : `TheSportsDB could not be reached, so these are fixtures saved on ${new Date(feed.savedAt!).toLocaleDateString()}.`}
            </p>
          )}
        </section>

        <aside className="side">
          <MyPredictions list={predictions.list} update={predictions.update} />

          <section className="panel" aria-labelledby="how-title">
            <h2 id="how-title">How a prediction works</h2>
            <ol className="steps">
              <li>Choose the result you expect for a match.</li>
              <li>Approve and pay 1 IMD on Ethereum from MetaMask, Rabby or another wallet.</li>
              <li>0.5 IMD buys a research report from the IMD swarm; 0.5 IMD goes to the creator.</li>
              <li>Follow the report here and read it on the IMD explorer when it is done.</li>
            </ol>
          </section>

          <section className="panel" aria-labelledby="contracts-title">
            <h2 id="contracts-title">Contracts on Ethereum</h2>
            <dl className="addrs">
              <Addr label="IMD token" a={IMD_TOKEN} />
              <Addr label="IMD swarm intake" a={IMD_INTAKE} />
              <Addr label="Creator wallet" a={CREATOR_WALLET} />
              {PAYMENT_CONTRACT ? <Addr label="IMD EDGE payments" a={PAYMENT_CONTRACT} /> : (
                <div>
                  <dt>IMD EDGE payments</dt>
                  <dd>Not deployed yet</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </main>

      <footer className="foot">
        <div className="wrap">
          <p>Analysis is for entertainment and is not betting advice. Payments are final once confirmed onchain.</p>
          <p>Fixture data: <a href="https://www.thesportsdb.com" target="_blank" rel="noreferrer">TheSportsDB</a>. Analysis: <a href="https://imd.fun" target="_blank" rel="noreferrer">the IMD swarm</a>.</p>
        </div>
      </footer>
    </>
  );
}

function Addr({ label, a }: { label: string; a: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <a className="mono" href={`${ETHERSCAN}/address/${a}`} target="_blank" rel="noreferrer" title={a}>
          {a.slice(0, 10)}…{a.slice(-8)}
        </a>
      </dd>
    </div>
  );
}

function Badge({ src }: { src: string | null }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return <span className="badge badge-empty" aria-hidden="true" />;
  return <img className="badge" src={src} width={32} height={32} alt="" loading="lazy" onError={() => setOk(false)} />;
}

function FixtureCard({
  f,
  pick,
  setPick,
  onConnect,
  onPaid,
}: {
  f: Fixture;
  pick?: Pick;
  setPick: (p: Pick) => void;
  onConnect: () => void;
  onPaid: Parameters<typeof PayPanel>[0]["onPaid"];
}) {
  const options: { p: Pick; label: string }[] = [
    { p: 1, label: f.home },
    ...(hasDraw(f.sport) ? [{ p: 2 as Pick, label: "Draw" }] : []),
    { p: 3, label: f.away },
  ];
  const titleId = `m-${f.id}`;
  return (
    <li className="card" aria-labelledby={titleId}>
      <div className="card-meta">
        <span>{f.league}</span>
        <time dateTime={f.kickoff}>{kickoffFmt.format(new Date(f.kickoff))}</time>
      </div>
      <h3 id={titleId} className="teams">
        <span className="team"><Badge src={f.homeBadge} />{f.home}</span>
        <span className="vs">vs</span>
        <span className="team"><Badge src={f.awayBadge} />{f.away}</span>
      </h3>
      <fieldset className="picks">
        <legend className="visually-hidden">Your prediction for {f.home} vs {f.away}</legend>
        {options.map((o) => (
          <label key={o.p} className="pick">
            <input type="radio" name={`pick-${f.id}`} checked={pick === o.p} onChange={() => setPick(o.p)} />
            <span>{o.p === 2 ? "Draw" : `${o.label} win`}</span>
          </label>
        ))}
      </fieldset>
      {pick ? <PayPanel fixture={f} pick={pick} onConnect={onConnect} onPaid={onPaid} /> : <p className="hint">Choose a result to see the price and pay.</p>}
    </li>
  );
}
