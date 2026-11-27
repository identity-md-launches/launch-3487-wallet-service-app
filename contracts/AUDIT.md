# ImdEdgePayments: review notes

Scope: `src/ImdEdgePayments.sol` (Solidity 0.8.26, no dependencies). This is the builder's own review, not an
independent audit.

## What it does

`predict(matchId, pick, body)` pulls exactly 1 IMD from the caller, sends 0.5 IMD to the immutable creator
wallet, approves the Intake for 0.5 IMD and calls `Intake.request("job.open@job-1", body, no callback, IMD, 0.5 IMD)`,
which pulls the 0.5 IMD to the swarm treasury. The contract ends every call with the balance it started with and no
allowance left to the Intake.

## Checks

| Area | Finding | Status |
| --- | --- | --- |
| Custody | No function lets anyone (owner included) move IMD held by or approved to the contract; the contract holds no balance between calls (`BalanceLeft` guard). | OK |
| Split | Constants `PRICE = 1e18`, `SWARM_SHARE = CREATOR_SHARE = 5e17`; test `testSplitsExactlyOneImd` and the fork test assert exact balances. | OK |
| Reentrancy | IMD is a standard OFT ERC-20 with no hooks, and the Intake is a known contract; `nonReentrant` is still applied to `predict`. | OK |
| Token returns | `_call` accepts tokens that return `true` or nothing, and reverts on `false` or a failed call. | OK |
| Leftover allowance | Allowance to the Intake is reset to 0 if the Intake did not use it. | OK |
| Admin | Owner can pause and change the Intake (contract code required); ownership moves in two steps. A compromised owner could point at a hostile "Intake", which could take at most the 0.5 IMD swarm share of later predictions; it cannot reach approvals beyond the 1 IMD a visitor grants per prediction. Use a multisig as owner. | Accepted, documented |
| Body | Length 1 to 16 KiB enforced; JSON validity is checked by the Intake's control plane after payment, so the site only sends a template that passed `POST /requests/check`. A refused body is a spent payment (IMD docs). | Accepted, documented |
| Job ownership | The paying address seen by the Intake is this contract, so `job.continue` is not available to visitors. Analyses are read by transaction hash. | Accepted |

## Tests

`forge test -vv`: 9 unit tests (split, missing allowance, empty body, bad pick, pause, owner-only admin, EOA
rejected as Intake, two-step ownership, zero-address constructor) and 1 fork test on Ethereum mainnet state paying the
real Intake v2 with the real IMD token. All 10 passed on 2026-11-27.
