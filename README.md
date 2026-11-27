# IMD EDGE

Sports predictions with swarm analysis on Ethereum Mainnet (chain id 1). A visitor picks a result for an upcoming
match and pays exactly **1 IMD**: **0.5 IMD** buys a pre-match research report from the IMD swarm and **0.5 IMD**
goes directly to the creator wallet `0x83027AD9d0D5374335086c539dADD1db983441B0`, in one transaction.

The static export is committed in `dist/` (relative asset URLs, `base: "./"`), so it can be served from any
static host, an IPFS gateway subpath or an ENS name. There is no backend.

## Status: mainnet payments are not active yet

The payment contract (`contracts/src/ImdEdgePayments.sol`) is written, tested (including a test against
mainnet state with the real IMD token and the real swarm Intake) and reviewed, but **not deployed**: deploying
needs the owner's key and ETH for gas, which this build never had. Until the site is rebuilt with the deployed
address, every pay control is disabled and says so; nothing can be charged. See "Activate payments" below.

## Integrations and how each was verified

| Integration | Choice | Verified |
| --- | --- | --- |
| Chain | Ethereum Mainnet, chain id 1 (`viem/chains` `mainnet`), RPC `https://ethereum-rpc.publicnode.com` | `cast call` against it on 2026-11-27 |
| IMD token | `0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7` | Listed for Ethereum in the IMD docs (imd.fun/skill/onchain.md) and in `GET api.imd.fun/requests/capabilities` for chain 1. Onchain: `name()` "Identity.md", `symbol()` "IMD", 18 decimals. An older contract with the same name and symbol (`0xf944…d7e9`, 1e27 supply) is still listed by some aggregators; the IMD docs and the swarm's Intake use `0xd34a…63b7`, so that is the one used. No token is created. |
| Swarm (payment and analysis) | IMD Intake v2 `0xa43e6F75ee006411F79Ac1C84120606C2330DE82`, action `job.open@job-1`, skill `research-report`, price 0.5 IMD | Address and price from the docs and the live capabilities response (chain 1 sells `job.open` at `500000000000000000`). The exact body the site builds (`src/brief.ts`) passed `POST /requests/check` with `blockers: []` and no suggestions. A forked-mainnet test paid the real Intake through the contract and saw its event. Job status is read from `GET api.imd.fun/intake/1/<tx>` (CORS open) and linked to `explorer.imd.fun/jobs/<id>`. |
| Wallets | wagmi 3 + viem: `injected()` with EIP-6963 discovery (MetaMask, Rabby and any other extension by name and icon), Coinbase Wallet / Smart Wallet, and "Open in MetaMask / Rabby / Coinbase Wallet / Phantom" links on phones | No relay, no WalletConnect project ID, no account needed. Interaction tests with mocked EIP-6963 MetaMask and Rabby providers. |
| Sports data | [TheSportsDB](https://www.thesportsdb.com) v1 `eventsnextleague.php`, eight leagues (Premier League, La Liga, Serie A, Bundesliga, Champions League, NBA, NFL, NHL) | CORS-enabled and keyless with the provider's published free key `123`. Results are cached for 15 minutes per browser session; if the API is unreachable the site shows a bundled list saved on 2026-11-27 (`src/data/fixtures-snapshot.json`) and says so. |
| Domain | `imd-edge.imd.site` | `GET api.imd.fun/sites/by-label/imd-edge` answered `unknown_label` (free) on 2026-11-27. Publishing is done by the IMD plane, not by this build. |

### Subscriptions to know about

- **TheSportsDB**: the free key returns only the next fixture per league and is rate limited. A full fixture list,
  live scores and higher limits need TheSportsDB's paid (Patreon) tier; check thesportsdb.com for the current price.
  Build with `VITE_SPORTSDB_KEY=<your key>` to use it. Nothing else changes.
- **IMD swarm**: no subscription; 0.5 IMD per analysis, paid in the same transaction.
- **Wallets / RPC**: none. The public RPC can be swapped in `src/config.ts` (`PUBLIC_RPC_URL`).

## Install, preview, rebuild

Requires Node 20+ (built with Node 24.21.0, npm 11).

```sh
npm ci            # install exactly what package-lock.json pins
npm run dev       # local dev server
npm run build     # typecheck (tsc --noEmit) and write the static export to dist/
npm run preview   # serve dist/ at http://localhost:4173
npm run typecheck # typecheck only
```

Commit `dist/` after every rebuild: the publisher serves the committed export and does not build.

## Activate payments (owner)

1. Contracts (Foundry, no submodules needed):
   ```sh
   cd contracts
   forge test -vv                                            # unit tests + mainnet fork test
   OWNER=<owner address> forge script script/Deploy.s.sol \
     --rpc-url https://eth.drpc.org --account <your keystore> --broadcast --verify
   ```
   The constructor takes the IMD token, the creator wallet and the Intake (fixed in the script) and the owner,
   who can only pause payments, point the contract at a new Intake version (the IMD docs say new versions land
   at new addresses), and hand over ownership in two steps. The owner can never move a visitor's IMD.
2. Verify the source on Etherscan, then send one real 1 IMD prediction from a test wallet and check the split
   (0.5 IMD to the creator, 0.5 IMD to the Intake, job admitted at `api.imd.fun/intake/1/<tx>`).
3. Rebuild the site with the address and commit `dist/`:
   ```sh
   VITE_PAYMENT_CONTRACT=0x<deployed address> npm run build
   ```

Visitors then approve 1 IMD once per prediction (`Approve 1 IMD`) and pay (`Pay 1 IMD and get analysis`).

## Layout

- `src/` React + TypeScript site. `config.ts` holds every address, chain, RPC and ABI; `ConnectSheet.tsx` the
  connect control; `PayPanel.tsx` the approve/pay flow; `sports.ts` the fixture feed; `brief.ts` the swarm job body.
- `public/` favicon and the 1200×630 `og.png` share image.
- `contracts/` Foundry project: `ImdEdgePayments.sol`, tests, deploy script, `AUDIT.md`.
- `dist/` the committed production export.
- `DESIGN.md` the implemented design system. `artifacts/validation.md` checks, review and limitations.

## Checks run for this build (2026-11-27)

| Command | Result |
| --- | --- |
| `npm run build` (runs `tsc --noEmit`, then `vite build`) | Pass: no type errors; export of about 580 KB in `dist/` |
| `forge test -vv` in `contracts/` with `FORK_RPC_URL=https://ethereum-rpc.publicnode.com` | Pass: 10/10 (9 unit, 1 mainnet fork against the real IMD token and Intake v2) |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Pass: 16/16 checks at 320, 390 and 1440 wide |
| Playwright interaction test of `dist/` served under a subpath | Pass: 31/31 (filters, picks, price split, inactive-payment state, keyboard and focus in the connect sheet, EIP-6963 MetaMask and Rabby rows, connect and disconnect, wrong chain, phone sheet and links, saved-fixture fallback) |
| `POST api.imd.fun/requests/check` with the body from `src/brief.ts` | `blockers: []`, no suggestions |

Not performed: a real browser-extension wallet, a real mainnet payment (the contract is not deployed), a
screen-reader session, native 200% zoom and physical phones. Details in `artifacts/validation.md`.

Analysis is for entertainment and is not betting advice.
