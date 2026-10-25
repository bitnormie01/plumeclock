<!-- readme-schema: R1-web-app v1 -->
# PlumeClock

Every satellite-detected methane super-emitter gets an on-chain ticket and a public response clock; ignored leaks slash a bond.

## Demo

TBD-post-build:[demo video URL (3–5 min)](https://youtu.be/ipP8JDeIPt4) \n
TBD-post-build:[live dashboard URL](https://plumeclock-18tp.vercel.app/) \n


The money shot, as it runs on Base Sepolia:

1. A real UNEP IMEO super-emitter drops onto the map and opens an on-chain ticket with a 30-day
   response clock (time-warped for the demo).
2. Operator A signs a repair attestation, a replayed satellite pass shows no plume, and the ticket
   turns green.
3. Operator B stays silent. The clock hits zero, one `slash()` moves B's bond to the mitigation fund,
   and the explorer shows the transaction.

## What it does

UNEP's Methane Alert and Response System (MARS) notifies governments and companies when satellites see
a methane super-emitter, yet nearly 90 per cent of MARS alerts went unanswered (UNEP, *Eye on Methane
2025*). PlumeClock commits IMEO's public alert data to a blockchain as a Merkle root, so anyone can open
a verifiable ticket for any notified source. Each ticket shows IMEO's published status verbatim and
the CO2e at stake.

Operators who opt in pledge a bond per source and answer with a signed attestation. A ticket closes
only when a later satellite re-observation shows no plume. A bonded ticket left unanswered past its
deadline can be slashed by anyone, sending the bond to a mitigation fund.

An AI analyst drafts plain-language notices next to a transparent triage score. A public map shows
every alert, country response rates, live clocks, and an explorer link for every state change.

## Quickstart

Needs Node 22 and Foundry (`forge`, `anvil`). Install and test:

```bash
npm ci
npm run test:contracts
npm test
npm run test:e2e
```

Run the whole money shot on a local chain (start `anvil` in a second terminal first):

```bash
npm run demo -- --network anvil --deploy
npm run dev
```

Then open `http://localhost:3000/?network=anvil`.

## Built at IEEE ClimateChain Global Hackathon 2026

- **Event:** IEEE ClimateChain Global Hackathon (Devpost), October 2026, supporting the goals of UN
  COP 31.
- **Track:** Climate Data & Environmental Monitoring.
- **Team:** bitnormie01 (solo) with an AI build pipeline: architect, executor subagents, and a
  reviewer.
- **Built during the event:** all code and docs in this repository, written from 2026-10-15 onward:
  the contracts, data pipeline, dashboard, AI notices, deploy/demo scripts and docs. Not ours: the
  pinned IMEO data and the open-source dependencies.
- **Data:** UNEP IMEO Eye on Methane // GLOBAL public datasets (CC BY-NC-SA 4.0), pinned in
  `data/imeo/`.
- **Simulated parts:** operators, bonds, attestations and the re-observation replay. No real operator
  was contacted. Testnet only.

## How it works

1. **Pin.** `npm run pin` stores IMEO's detected-plumes and response-rate zips byte-for-byte, with
   SHA-256 provenance (`data/imeo/provenance.json`).
2. **Commit.** `npm run fixtures` turns every MARS-notified oil and gas source into a Solidity-encoded
   record and builds a Merkle root. The feeder posts that root to PlumeClock.
3. **Open.** Anyone opens a ticket by proving a record against the root. The clock starts at open.
4. **Respond.** The bonded operator signs an EIP-712 attestation (cause, action, evidence hash).
5. **Close or slash.**
   - A proven re-observation with no plume, newer than the response, resolves the ticket.
   - A persisting plume reopens it (at most twice).
   - A missed deadline lets anyone call `slash()`, sending the bond to the MitigationFund.

Docs:

- [Architecture and technical specification](docs/architecture.md)
- [Security and data-integrity assessment](docs/security-and-data-integrity.md)
- [Impact and adoption](docs/impact-and-adoption.md)

## Tech stack

- **Contracts:** Solidity 0.8.28, Foundry 1.4, OpenZeppelin Contracts 5.4 (EIP712, SignatureChecker,
  MerkleProof, ReentrancyGuard). Unit and invariant tests.
- **Data:** TypeScript on Node 22 (csv-parse, fflate, viem ABI encoding), with an OpenZeppelin-compatible
  Merkle tree.
- **Dashboard:** Next.js 15.5 static export, React 19.2, d3-geo + world-atlas, viem 2.56.
- **AI:** Anthropic Messages API (`claude-opus-5-5`) for notices, with a deterministic template
  fallback.
- **Chain:** Base Sepolia testnet, Blockscout explorer. Local rehearsal on anvil.

## Run locally

| Command | What it does |
|---|---|
| `npm run test:contracts` | Foundry unit + invariant tests |
| `npm test` | vitest suites (data, Merkle, UI) |
| `npm run test:e2e` | builds contracts, then deploys and runs the money shot on a throwaway anvil |
| `npm run pin` | re-downloads the IMEO snapshot (changes `data/imeo/`) |
| `npm run fixtures` | rebuilds `public/data/snapshot.json` from `data/imeo/` |
| `npm run notices` | rebuilds `public/data/notices.json` (Claude if `LLM_API_KEY` is set, else templates) |
| `npm run deploy -- --network base-sepolia` | deploys to Base Sepolia (needs `.env`) |
| `npm run demo -- --network base-sepolia` | runs the scenes on Base Sepolia (needs `.env`) |
| `npm run dev` / `npm run build` | dashboard dev server / static export to `out/` |

Environment variables (copy `.env.example` to `.env`; never commit it):

| Name | Purpose |
|---|---|
| `RPC_URL` | optional Base Sepolia RPC endpoint (defaults to the public one) |
| `DEPLOYER_PRIVATE_KEY` | testnet burner key: deploys, arbiter, fund steward |
| `FEEDER_PRIVATE_KEY` | testnet burner key: posts roots, opens and settles tickets |
| `OPERATOR_A_PRIVATE_KEY` | testnet burner key for simulated operator A |
| `OPERATOR_B_PRIVATE_KEY` | testnet burner key for simulated operator B |
| `RESPONSE_WINDOW_SECONDS` | response window for new deployments (default 180) |
| `MIN_BOND_WEI` | minimum bond for new deployments (default 0.0005 ETH) |
| `DEMO_BOND_WEI` | bond each demo operator pledges (default 0.001 ETH) |
| `LLM_API_KEY` | optional Anthropic API key for AI notices |
| `LLM_MODEL` | optional model id (default `claude-opus-5-5`) |
| `NEXT_PUBLIC_NETWORK` | dashboard network: `base-sepolia` (default) or `anvil` |
| `NEXT_PUBLIC_RPC_URL` | optional dashboard RPC override |
| `NEXT_PUBLIC_BASE_PATH` | optional base path for static hosting |

## Contract addresses

Filled from `public/deployments/base-sepolia.json` after the human-gated testnet deploy:

PlumeClock: [`0x402931fa5b7e97049b1522a05a6019dfd6196ac4`](https://base-sepolia.blockscout.com/address/0x402931fa5b7e97049b1522a05a6019dfd6196ac4)
MitigationFund: [`0x33fae8476373818d8eb813ca6b8d6e15376c03f9`](https://base-sepolia.blockscout.com/address/0x33fae8476373818d8eb813ca6b8d6e15376c03f9)

## Roadmap

- Bond unbonding delay; multisig feeder and arbiter roles.
- Coal and waste alerts (MARS expanded to these sectors in 2026).
- Archival of operator evidence (IPFS/Walrus).
- User interviews with IMEO/MARS stakeholders, gas buyers and newsrooms.
- Known limitations are listed in [docs/security-and-data-integrity.md](docs/security-and-data-integrity.md).

## License

Code: MIT (see `LICENSE`). Data: UNEP's International Methane Emissions Observatory, Eye on Methane //
GLOBAL (https://methanedata.unep.org), CC BY-NC-SA 4.0. The pinned files and the adapted data derived
from them are non-commercial and share-alike (see `data/imeo/NOTICE.md`).
