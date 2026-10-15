# PlumeClock security and data-integrity assessment

> Status: hackathon proof of concept, **unaudited**, deployed on testnets only (Base Sepolia).
> Nothing here holds real funds.

## Scope

This assessment covers:

- the Solidity contracts in `contracts/src/` (PlumeClock layers and MitigationFund);
- the data path from IMEO's public files to on-chain Merkle roots (`src/lib/imeo.ts`,
  `src/lib/records.ts`, `src/lib/merkle.ts`, `src/lib/fixtures.ts`);
- the scripts that sign and send transactions (`src/lib/actors.ts`, `src/lib/deploy.ts`,
  `src/lib/demo.ts`).

The dashboard is read-only and holds no keys.

## Trust assumptions

| Actor | Can | Cannot |
|---|---|---|
| Feeder (one key) | post snapshot roots and re-observation roots | change a ticket, move a bond, or overwrite a posted root |
| Arbiter | settle disputes (dismiss, or resume the clock) | slash, resolve, or touch bonds outside the dispute path |
| Operator | pledge and withdraw its own bond; sign attestations and disputes for its tickets | withdraw while a bonded ticket is active, or act for another operator's source |
| Anyone | open tickets with valid proofs; resolve, reopen or slash when the rules allow | open a ticket for a record that is not in a posted snapshot root |

The feeder is trusted to post roots that faithfully represent IMEO's published data. In production
that role belongs to IMEO itself or a committee. Operator ↔ source binding is self-asserted by
pledging in this prototype; in production it would be attested by a buyer or a MARS focal point.

## Data integrity

- **Verbatim pinning.** The IMEO zips are committed byte-for-byte, and `provenance.json` records each
  file's URL, `Last-Modified`, size and SHA-256. `npm run check:snapshot` re-hashes them before every
  fixture build.
- **Schema guard.** The exact CSV headers are asserted at parse time, so a renamed or missing column
  fails loudly. A planning-time check already found that the published data dictionary lists an
  `emission_status` column that is absent from the real file. PlumeClock does not use it.
- **Commitment.** Every record in the universe is a Merkle leaf. A ticket can only be opened with a
  proof against a posted snapshot root, and the leaf commits to every IMEO field shown in the UI. A
  tampered field (for example flipping the feedback status) fails `InvalidProof` (tested).
- **Cross-language equality.** One `SourceRecord` vector, with a negative latitude and the non-ASCII
  country name `Türkiye`, hashes to the same leaf in TypeScript (viem) and Solidity. Both test suites
  pin it.
- **Re-observations.** These use a separate root kind (`RootKind.Reobservation`). They must name the
  ticket's source and be newer than the operator's response.
- **Anyone can audit.** The dashboard's Verify button recomputes a record's leaf in the browser,
  checks its proof, and confirms the root was posted on-chain.

## Threat model

| Threat | Mitigation |
|---|---|
| Fake or edited detection opened as a ticket | Merkle proof against a feeder-posted snapshot root; leaf commits to all fields |
| Snapshot root reused as a re-observation root (or the reverse) | roots are typed; `WrongRootKind` on mismatch |
| Forged operator response | EIP-712 signature checked with `SignatureChecker` against the bonded operator (EOA or ERC-1271); domain binds chain id and contract |
| Replay of an attestation on another ticket or chain | `ticketId` is in the signed struct; EIP-712 domain separator |
| Stale "no plume" observation closing a ticket | `observedAt` must be later than `respondedAt` (`StaleObservation`) |
| Endless attest-then-leak loop | `MAX_REOPENS = 2`, then responses are refused (`TooManyReopens`) |
| Reentrancy on fund movement | checks-effects-interactions plus `nonReentrant` on `withdrawBond` and `slash`; the fund is an immutable address |
| Withdrawing a bond to escape an open ticket | bond is locked while the source has an active bonded ticket (`BondLocked`) |
| Slashing an unbonded or answered ticket | `NotBonded` / `BadStatus`; slash only after the deadline (`DeadlineNotPassed`) |
| Admin abuse | none possible: no owner, no upgrade, no pause; roles are immutable |
| Leaked keys in the repo | env-var names only; `.env` is git-ignored; deployment files store public RPC URLs, never `RPC_URL` |

## Smart-contract safeguards

- Custom errors for every failure mode, and events for every state change: `TicketOpened`,
  `Responded`, `Disputed`, `DisputeSettled`, `Resolved`, `Reopened`, `Slashed`, `RootPosted`,
  `BondPledged`, `BondWithdrawn`.
- Integer-only CO2e math (`rate × 8760 × 298 / 10000`) with no division before multiplication.
- One active bonded ticket per source, so the bond accounting stays simple and checkable.

## Testing evidence

- **Foundry unit tests per contract layer**, through harness contracts: constructor checks, roots,
  hashing vectors, bonds, ticket opening and proofs, EIP-712 responses and disputes, re-observations,
  slashing, and the full money-shot flow.
- **Hostile-contract tests:**
  - a reentrant operator calling `withdrawBond` again from `receive()`, and a reentrant fund calling
    `slash` from `receive()`, both revert (`TransferFailed`) and leave every balance unchanged;
  - an ERC-1271 smart-contract wallet can bond and respond as an operator;
  - disputes from unbonded tickets, after the deadline, or with a wrong signer are rejected.
- **Foundry invariant suite** (4 invariants, 64 runs × 32 calls each), over random pledge, withdraw,
  open, respond, resolve, dispute, slash and time-warp sequences:
  - contract balance == sum of bonds;
  - the fund holds exactly the slashed bonds;
  - active slots point only to live bonded tickets;
  - a closed ticket (resolved, slashed or dismissed) never changes again.
- **vitest suites** for parsing, selection rules, Merkle proofs, triage, notices, the read model and
  the UI components.
- **anvil end-to-end test** (`npm run test:e2e`): it deploys, opens the real IMEO ticket set, and
  checks A resolved, B slashed, and the fund balance.

## Known limitations

- **Unaudited prototype**, testnet only.
- **Single trusted feeder key.** A dishonest feeder could post a false root, though never move funds.
- **No unbonding delay.** An operator watching the mempool could withdraw before a new detection's
  ticket opens. An unbonding period is on the roadmap.
- **Self-asserted operator binding** (see trust assumptions).
- **Replayed re-observations.** The demo's re-observation pass is replayed from IMEO's published
  `persistency_category` rather than a new satellite retrieval. PlumeClock runs no retrievals of its
  own.
- **The 30-day clock is time-warped** to 180 s on the demo deployment.

## Responsible data use

- **No real operator is named or contacted.** IMEO publishes source IDs, not operators, and every
  operator, bond and attestation in the demo is simulated and labelled as such.
- **Demo outcomes follow IMEO's published record.** The silent operator B sits on a source IMEO lists
  as "Notified – no response received". The repaired operator A sits on a source where IMEO lists the
  government and operator as responded and recent observations show no plume.
- **IMEO's caveat is shown next to every status:** low response rates may not necessarily signal
  indifference.
- **Licensing:** IMEO data is CC BY-NC-SA 4.0, used non-commercially with attribution and a
  changes-made notice (`data/imeo/NOTICE.md`). The derived files carry the same license.
