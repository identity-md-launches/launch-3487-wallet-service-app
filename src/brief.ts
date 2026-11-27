import type { Fixture } from "./sports";
import { SPORT_LABEL } from "./sports";

export type Pick = 1 | 2 | 3; // home, draw, away

export const pickLabel = (f: Fixture, p: Pick) => (p === 1 ? `${f.home} win` : p === 3 ? `${f.away} win` : "Draw");

/**
 * The job body sent to the swarm with the payment (job.open@job-1, research-report). The same
 * template was run through POST api.imd.fun/requests/check with no blockers on 2026-11-27.
 * Only fixture data from TheSportsDB goes into it: no wallet address or personal data.
 */
export function buildBody(f: Fixture, p: Pick) {
  const when = f.kickoff.replace("T", " ").slice(0, 16);
  const objective =
    `Write a pre-match analysis of ${f.home} vs ${f.away} (${f.league}, ${SPORT_LABEL[f.sport].toLowerCase()}, ` +
    `kick-off ${when} UTC${f.venue ? `, ${f.venue}` : ""}). The visitor predicts: ${pickLabel(f, p)}. ` +
    `Cover each side's recent form over its last ten matches, head-to-head results, injuries and suspensions, ` +
    `and home advantage. Give a probability estimate for each possible result in a table, then say in two sentences ` +
    `how well the evidence supports the visitor's prediction. Sources: official league and club sites, ` +
    `reputable sports news and statistics sites, cited inline. Period: the current season up to today. ` +
    `Format: one page of Markdown. This is analysis for entertainment, not betting advice.`;
  return {
    objective,
    skill: "research-report",
    outputs: [{ name: "report", path: "artifacts/report.md", mediaType: "text/markdown" }],
  };
}
