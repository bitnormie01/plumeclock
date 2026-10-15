# PlumeClock Contracts Implementation Plan

**Goal:** Scaffold the shared toolchain and build the PlumeClock accountability contracts (Merkle-proven tickets, bonds, EIP-712 responses, re-observations, permissionless slash) with unit and invariant tests, then export their ABIs to TypeScript.
**Architecture:** One root npm package also configures Foundry (OpenZeppelin 5.4.0 and forge-std v1.11.0 come from node_modules). PlumeClock is a linear stack of abstract layers, one file per task: PlumeTypes -> PlumeBase -> PlumeBonds -> PlumeTickets -> PlumeResponses -> PlumeReobservations -> PlumeClock. MitigationFund is standalone. Each layer is tested through a harness contract.
**Tech Stack:** Solidity 0.8.28 (evm cancun, optimizer 200), Foundry forge 1.4.4, @openzeppelin/contracts 5.4.0, forge-std v1.11.0 (git+https), Node 22.21, npm 10.9, TypeScript 5.9.3, vitest 3.2.7, tsx 4.23.15
**Source spec:** docs/superpowers/specs/2026-10-15-plumeclock-design.md

---

## How to read these tasks

- Run every command from the repository root. Commands work in Windows PowerShell and Git Bash; the README gate (Task 4.10 in the demo plan) is PowerShell-only.
- A code block introduced by "Create ... with exactly this content" is the complete file. Write it byte-for-byte; do not reformat or "improve" it. These files were compiled and tested together before this plan was written.
- Write every file as UTF-8 without a byte-order mark. Use your file-writing tool, not PowerShell 5.1's `Set-Content` or `Out-File`, which add a BOM (`JSON.parse` on a file read with `readFileSync` fails on it).
- `npm run check -- <files>` runs `tsc --noEmit` over the whole project, then vitest on the named files. Both must pass.
- Never run git. The orchestrator commits exactly the files listed under **Files:**.
- Tasks marked HUMAN-GATED are never executed by an executor: the orchestrator pauses them for the user or the gate-concierge.

### Task 1.1: Scaffold the repository toolchain

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.e2e.config.ts`
- Create: `foundry.toml`
- Create: `.gitignore`
- Create: `.gitattributes`
- Create: `.env.example`
- Create: `LICENSE`
- Test:   `contracts/test/Smoke.t.sol`
- Test:   `test/smoke.test.ts`

**Effort:** low
**Model tier:** fast
**Provides:** `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

One npm package at the repo root drives both toolchains: Foundry reads OpenZeppelin and forge-std from `node_modules` (no git submodules), and every later task's gate is an npm script defined here. All versions are pinned exactly. `tsconfig.json` and `next-env.d.ts` are written exactly as `next build` would write them so later builds never touch them. The repo path contains a space (`C:\ieee hackathon\...`); this setup was verified to work from such a path.

- [ ] **Step 1: Write the failing test**

Create `contracts/test/Smoke.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract SmokeTest is Test {
    function test_toolchainResolvesForgeStdAndOpenZeppelin() public pure {
        bytes32 leaf = keccak256("leaf");
        bytes32[] memory proof = new bytes32[](0);
        assertTrue(MerkleProof.verify(proof, leaf, leaf));
    }
}
````

Create `test/smoke.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import { keccak256, toHex } from 'viem';

describe('toolchain smoke', () => {
  it('resolves viem and agrees on keccak256 for string and bytes input', () => {
    expect(keccak256(toHex('leaf'))).toBe(keccak256(new TextEncoder().encode('leaf')));
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run test:smoke`
      Expected: FAIL — npm cannot find `package.json` (ENOENT) because the toolchain does not exist yet

- [ ] **Step 3: Minimal implementation**

Create `package.json` with exactly this content:

````json
{
  "name": "plumeclock",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "check": "tsc --noEmit && vitest run",
    "test": "vitest run",
    "test:contracts": "forge test",
    "test:smoke": "forge test --match-contract SmokeTest && vitest run test/smoke.test.ts",
    "test:abi": "forge build && vitest run test/abi.test.ts",
    "test:e2e": "forge build && vitest run --config vitest.e2e.config.ts",
    "verify:web": "vitest run test/dashboard.test.tsx && next build",
    "abi": "forge build && tsx scripts/export-abi.ts",
    "pin": "tsx scripts/pin-snapshot.ts",
    "check:snapshot": "tsx scripts/check-snapshot.ts",
    "fixtures": "tsx scripts/build-fixtures.ts",
    "notices": "tsx scripts/notices.ts",
    "deploy": "tsx scripts/deploy.ts",
    "verify:contracts": "tsx scripts/verify-contracts.ts",
    "check:deployment": "tsx scripts/check-deployment.ts",
    "demo": "tsx scripts/demo.ts",
    "check:demo": "tsx scripts/check-demo.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "0.130.0",
    "d3-geo": "3.1.1",
    "next": "15.5.28",
    "react": "19.2.9",
    "react-dom": "19.2.9",
    "topojson-client": "3.1.0",
    "viem": "2.56.9",
    "world-atlas": "2.0.2"
  },
  "devDependencies": {
    "@openzeppelin/contracts": "5.4.0",
    "@testing-library/dom": "10.4.2",
    "@testing-library/react": "16.3.3",
    "@types/d3-geo": "3.1.1",
    "@types/geojson": "7946.0.16",
    "@types/node": "22.20.5",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.7",
    "@types/topojson-client": "3.1.5",
    "csv-parse": "5.6.0",
    "fflate": "0.8.3",
    "forge-std": "git+https://github.com/foundry-rs/forge-std.git#v1.11.0",
    "jsdom": "26.1.0",
    "tsx": "4.23.15",
    "typescript": "5.9.3",
    "vitest": "3.2.7"
  }
}
````

Create `tsconfig.json` with exactly this content:

````json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2023"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "out", ".next", "contracts"]
}
````

Create `next-env.d.ts` with exactly this content:

````ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference path="./.next/types/routes.d.ts" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
````

Create `next.config.mjs` with exactly this content:

````js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  images: { unoptimized: true },
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
````

Create `vitest.config.ts` with exactly this content:

````ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['test/e2e/**', 'node_modules/**'],
    environment: 'node',
    testTimeout: 20000,
  },
});
````

Create `vitest.e2e.config.ts` with exactly this content:

````ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.test.ts'],
    environment: 'node',
    testTimeout: 240000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
````

Create `foundry.toml` with exactly this content:

````toml
[profile.default]
src = "contracts/src"
test = "contracts/test"
script = "contracts/script"
out = "contracts/out"
cache_path = "contracts/cache"
libs = ["node_modules"]
auto_detect_remappings = false
remappings = [
  "forge-std/=node_modules/forge-std/src/",
  "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/",
]
solc_version = "0.8.28"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200

[fuzz]
runs = 256

[invariant]
runs = 64
depth = 32
fail_on_revert = false

[lint]
lint_on_build = false
````

Create `.gitignore` with exactly this content:

````text
node_modules/
.next/
out/
contracts/out/
contracts/cache/
broadcast/
*.tsbuildinfo
.env
.env.*
!.env.example
public/deployments/anvil.json
public/deployments/anvil.demo.json
coverage/
*.log
````

Create `.gitattributes` with exactly this content:

````text
*.zip binary
````

Create `.env.example` with exactly this content:

````text
# Copy to .env (git-ignored) and fill in locally. Never commit real values.
# Testnet burner keys only: fresh, faucet-funded, never used on mainnet.
RPC_URL=
DEPLOYER_PRIVATE_KEY=
FEEDER_PRIVATE_KEY=
OPERATOR_A_PRIVATE_KEY=
OPERATOR_B_PRIVATE_KEY=
RESPONSE_WINDOW_SECONDS=180
MIN_BOND_WEI=500000000000000
DEMO_BOND_WEI=1000000000000000
LLM_API_KEY=
LLM_MODEL=claude-opus-5-5
NEXT_PUBLIC_NETWORK=base-sepolia
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_BASE_PATH=
````

Create `LICENSE` with exactly this content:

````text
MIT License

Copyright (c) 2026 bitnormie01 and PlumeClock contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

The IMEO data in data/imeo/ and the files derived from it (public/data/) are
not covered by this license: they are licensed CC BY-NC-SA 4.0 by UNEP's
International Methane Emissions Observatory (see data/imeo/NOTICE.md).
````

Then install the pinned dependencies (creates `package-lock.json` and the git-ignored `node_modules/`; needs network access to registry.npmjs.org and github.com for forge-std):

      Run: `npm install --no-audit --no-fund`
      Expected: `added 162 packages` (the exact count may differ by a few transitive packages)

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run test:smoke`
      Expected: PASS — forge prints `Suite result: ok. 1 passed; 0 failed` and vitest prints `Tests  1 passed (1)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `chore: scaffold npm + Foundry toolchain`

### Task 1.2: Contract types and MitigationFund

**Files:**
- Create: `contracts/src/PlumeTypes.sol`
- Create: `contracts/src/MitigationFund.sol`
- Test:   `contracts/test/MitigationFund.t.sol`

**Depends on:** Task 1.1
**Effort:** high
**Model tier:** top
**Provides:** `PlumeTypes.sol: enum Status {None, Open, Responded, Resolved, Slashed, Disputed, Dismissed}; enum RootKind {None, Snapshot, Reobservation}; structs SourceRecord, Reobservation, Attestation, DisputeClaim, RootInfo, Bond, Ticket; file-level custom errors; interface IPlumeClockEvents`, `MitigationFund(address steward_): receive(), disburse(address payable to, uint256 amount, string memo), steward(), totalReceived(), totalDisbursed()`
**Requires:** `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

`PlumeTypes.sol` holds every enum, struct, custom error and event PlumeClock uses (file-level, so tests and every contract layer import the same definitions). Field order of `SourceRecord`, `Reobservation`, `Attestation` and `DisputeClaim` is part of the cross-language contract with the TypeScript encoder (src/lib/merkle.ts, src/lib/eip712.ts) — do not reorder. `MitigationFund` receives slashed bonds; only its immutable steward can disburse.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/MitigationFund.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MitigationFund, NotSteward, InsufficientBalance} from "../src/MitigationFund.sol";
import {ZeroAddress} from "../src/PlumeTypes.sol";

contract MitigationFundTest is Test {
    event Received(address indexed from, uint256 amount);
    event Disbursed(address indexed to, uint256 amount, string memo);

    MitigationFund internal fund;
    address internal steward = makeAddr("steward");
    address internal payer = makeAddr("payer");
    address payable internal project = payable(makeAddr("project"));

    function setUp() public {
        fund = new MitigationFund(steward);
        vm.deal(payer, 10 ether);
    }

    function test_constructorRejectsZeroSteward() public {
        vm.expectRevert(ZeroAddress.selector);
        new MitigationFund(address(0));
    }

    function test_receiveCountsAndEmits() public {
        vm.expectEmit(true, false, false, true, address(fund));
        emit Received(payer, 1 ether);
        vm.prank(payer);
        (bool ok,) = address(fund).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(fund.totalReceived(), 1 ether);
        assertEq(address(fund).balance, 1 ether);
    }

    function test_disburseByStewardTransfersAndEmits() public {
        vm.prank(payer);
        (bool ok,) = address(fund).call{value: 2 ether}("");
        assertTrue(ok);
        vm.expectEmit(true, false, false, true, address(fund));
        emit Disbursed(project, 0.5 ether, "methane capture retrofit");
        vm.prank(steward);
        fund.disburse(project, 0.5 ether, "methane capture retrofit");
        assertEq(project.balance, 0.5 ether);
        assertEq(fund.totalDisbursed(), 0.5 ether);
        assertEq(address(fund).balance, 1.5 ether);
    }

    function test_disburseRevertsForNonSteward() public {
        vm.prank(payer);
        vm.expectRevert(NotSteward.selector);
        fund.disburse(project, 1, "x");
    }

    function test_disburseRevertsWhenAmountExceedsBalance() public {
        vm.prank(steward);
        vm.expectRevert(InsufficientBalance.selector);
        fund.disburse(project, 1, "x");
    }

    function test_disburseRevertsForZeroRecipient() public {
        vm.prank(steward);
        vm.expectRevert(ZeroAddress.selector);
        fund.disburse(payable(address(0)), 0, "x");
    }
}
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `forge test --match-contract MitigationFundTest`
      Expected: FAIL — compiler error: source `contracts/src/MitigationFund.sol` not found

- [ ] **Step 3: Minimal implementation**

Create `contracts/src/PlumeTypes.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Lifecycle of a PlumeClock ticket.
enum Status {
    None,
    Open,
    Responded,
    Resolved,
    Slashed,
    Disputed,
    Dismissed
}

/// @notice What a posted Merkle root commits to.
enum RootKind {
    None,
    Snapshot,
    Reobservation
}

/// @notice One IMEO MARS source, as committed in a snapshot Merkle tree (one leaf per source).
struct SourceRecord {
    bytes32 sourceId; // IMEO source_name as ASCII, right-padded with zero bytes ("KAZ_S_003")
    string lastPlumeId; // IMEO id_last_plume (UUID)
    uint64 lastPlumeAt; // IMEO last_plume_date, unix seconds (UTC)
    uint32 rateKgPerHour; // ch4_fluxrate of the last plume, kg/h, rounded
    uint32 plumeCount; // IMEO n_plumes_detected
    int32 latE5; // latitude * 1e5, rounded
    int32 lonE5; // longitude * 1e5, rounded
    string country; // verbatim
    string sector; // verbatim
    string sourceType; // verbatim
    string persistency; // persistency_category, verbatim
    string notified; // verbatim
    string feedbackOperator; // verbatim
    string feedbackGovernment; // verbatim
}

/// @notice A replayed satellite re-observation of one source, committed in a re-observation tree.
struct Reobservation {
    bytes32 sourceId;
    uint64 observedAt;
    bool plumeDetected;
    string basis;
}

/// @notice EIP-712 repair attestation signed by a ticket's bonded operator.
struct Attestation {
    bytes32 ticketId;
    string cause;
    string action;
    bytes32 evidenceHash;
}

/// @notice EIP-712 misattribution dispute signed by a ticket's bonded operator.
struct DisputeClaim {
    bytes32 ticketId;
    string reason;
    bytes32 evidenceHash;
}

struct RootInfo {
    RootKind kind;
    uint64 postedAt;
}

struct Bond {
    address operator;
    uint256 amount;
}

struct Ticket {
    bytes32 id;
    bytes32 sourceId;
    bytes32 snapshotRoot;
    address operator;
    Status status;
    uint32 rateKgPerHour;
    uint32 reopenCount;
    uint64 lastPlumeAt;
    uint64 openedAt;
    uint64 deadline;
    uint64 respondedAt;
    uint64 closedAt;
    uint64 pausedRemaining;
    uint256 co2eTonnesPerYear;
    uint256 slashedAmount;
}

error NotFeeder();
error NotArbiter();
error ZeroAddress();
error ZeroWindow();
error ZeroMinBond();
error InvalidRootKind();
error RootExists();
error WrongRootKind();
error InvalidProof();
error TicketExists();
error UnknownTicket();
error LengthMismatch();
error SourceBusy();
error BondTooSmall();
error SourceClaimed();
error NotOperator();
error NoBond();
error BondLocked();
error TransferFailed();
error BadStatus();
error NotBonded();
error DeadlinePassed();
error DeadlineNotPassed();
error TicketMismatch();
error BadSignature();
error TooManyReopens();
error SourceMismatch();
error StaleObservation();
error PlumeStillDetected();
error PlumeNotDetected();

/// @notice Every event PlumeClock emits (inherited by PlumeBase).
interface IPlumeClockEvents {
    event RootPosted(bytes32 indexed root, RootKind kind, string uri);
    event BondPledged(bytes32 indexed sourceId, address indexed operator, uint256 amount, uint256 total);
    event BondWithdrawn(bytes32 indexed sourceId, address indexed operator, uint256 amount);
    event TicketOpened(
        bytes32 indexed ticketId,
        bytes32 indexed sourceId,
        address indexed operator,
        bytes32 root,
        uint64 deadline,
        uint32 rateKgPerHour,
        uint256 co2eTonnesPerYear
    );
    event Responded(bytes32 indexed ticketId, address indexed operator, string cause, string action, bytes32 evidenceHash);
    event Disputed(
        bytes32 indexed ticketId, address indexed operator, string reason, bytes32 evidenceHash, uint64 pausedRemaining
    );
    event DisputeSettled(bytes32 indexed ticketId, bool upheld, uint64 newDeadline);
    event Resolved(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, string basis);
    event Reopened(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, uint64 newDeadline);
    event Slashed(bytes32 indexed ticketId, address indexed operator, uint256 amount, address fund);
}
````

Create `contracts/src/MitigationFund.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ZeroAddress, TransferFailed} from "./PlumeTypes.sol";

error NotSteward();
error InsufficientBalance();

/// @title MitigationFund
/// @notice Receives slashed PlumeClock bonds. A named steward disburses them to mitigation work.
contract MitigationFund {
    address public immutable steward;
    uint256 public totalReceived;
    uint256 public totalDisbursed;

    event Received(address indexed from, uint256 amount);
    event Disbursed(address indexed to, uint256 amount, string memo);

    constructor(address steward_) {
        if (steward_ == address(0)) revert ZeroAddress();
        steward = steward_;
    }

    receive() external payable {
        totalReceived += msg.value;
        emit Received(msg.sender, msg.value);
    }

    function disburse(address payable to, uint256 amount, string calldata memo) external {
        if (msg.sender != steward) revert NotSteward();
        if (to == address(0)) revert ZeroAddress();
        if (amount > address(this).balance) revert InsufficientBalance();
        totalDisbursed += amount;
        emit Disbursed(to, amount, memo);
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `forge test --match-contract MitigationFundTest`
      Expected: PASS — `Suite result: ok. 6 passed; 0 failed; 0 skipped`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(contracts): add PlumeTypes and MitigationFund`

### Task 1.3: PlumeBase: immutables, root registry, hashing, views

**Files:**
- Create: `contracts/src/PlumeBase.sol`
- Create: `contracts/test/utils/Fixtures.sol`
- Test:   `contracts/test/PlumeBase.t.sol`

**Depends on:** Task 1.2
**Effort:** high
**Model tier:** top
**Provides:** `abstract PlumeBase(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is IPlumeClockEvents, EIP712("PlumeClock", "1"), ReentrancyGuard: public immutables feeder, arbiter, mitigationFund, responseWindow, minBond; constants GWP100_X10 = 298, HOURS_PER_YEAR = 8760, MAX_REOPENS = 2; modifiers onlyFeeder, onlyArbiter; postRoot(bytes32,RootKind,string), rootInfo(bytes32), co2eTonnesPerYear(uint32), ticketIdFor(bytes32,uint64), hashSourceRecord(SourceRecord), hashReobservation(Reobservation), getBond(bytes32), activeBondedTicket(bytes32), ticketCount(), getTicket(bytes32), getTickets(uint256,uint256), getTransitionBlocks(bytes32); internal _roots, _bonds, _activeBondedTicket, _tickets, _transitionBlocks, _ticketIds, _recordTransition(bytes32), _close(Ticket storage, Status)`, `contracts/test/utils/Fixtures.sol: Fixtures.record(bytes32 sourceId, uint64 lastPlumeAt, uint32 rate), Fixtures.vectorRecord1(), Fixtures.vectorRecord2(), Fixtures.vectorObservation(), VECTOR_LEAF_1, VECTOR_LEAF_2, VECTOR_OBS_LEAF, VECTOR_ROOT_2`
**Requires:** `PlumeTypes.sol: enum Status {None, Open, Responded, Resolved, Slashed, Disputed, Dismissed}; enum RootKind {None, Snapshot, Reobservation}; structs SourceRecord, Reobservation, Attestation, DisputeClaim, RootInfo, Bond, Ticket; file-level custom errors; interface IPlumeClockEvents`, `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

The abstract base every layer inherits: immutable roles (feeder, arbiter, mitigation fund), response window and minimum bond; the typed Merkle-root registry; the exact leaf hashing `keccak256(bytes.concat(keccak256(abi.encode(struct))))`; integer CO2e math (GWP100 29.8); paged read views; and the internal helpers later layers call. `Fixtures.sol` pins two cross-language vectors that the TypeScript encoder (Task 2.2) asserts too — the hex constants must not change. Storage is `internal` so test harnesses can reach it.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `PlumeTypes.sol: enum Status {None, Open, Responded, Resolved, Slashed, Disputed, Dismissed}; enum RootKind {None, Snapshot, Reobservation}; structs SourceRecord, Reobservation, Attestation, DisputeClaim, RootInfo, Bond, Ticket; file-level custom errors; interface IPlumeClockEvents`
- `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/utils/Fixtures.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SourceRecord, Reobservation} from "../../src/PlumeTypes.sol";

/// @notice Shared test records. The VECTOR_* hashes were computed by the TypeScript encoder
///         (src/lib/merkle.ts) and must match Solidity byte-for-byte.
library Fixtures {
    bytes32 internal constant VECTOR_LEAF_1 = 0x03921c0a78d6b85dd4afdaa1a5b4ff9676991b7e5af8774a5cebca375f6d094a;
    bytes32 internal constant VECTOR_LEAF_2 = 0x50fdc75c9872748f4f6ee30bd066ebd6a409b3429851eac4445aa05f28b6e5fd;
    bytes32 internal constant VECTOR_OBS_LEAF = 0x9e1589fa9a7eace672605a7d660c811852cc42a340a900be64706f57f44b71e3;
    bytes32 internal constant VECTOR_ROOT_2 = 0x581f67a5b8e3a132a67656b87d49e7116dab748d0f308c4a8bf916946162f8a7;

    function vectorRecord1() internal pure returns (SourceRecord memory) {
        return SourceRecord({
            sourceId: bytes32("KAZ_S_003"),
            lastPlumeId: "vector-plume-0001",
            lastPlumeAt: 1780217349,
            rateKgPerHour: 7847,
            plumeCount: 23,
            latE5: 4534143,
            lonE5: 5519165,
            country: "Kazakhstan",
            sector: "Oil and Gas",
            sourceType: "Transmission Compressor Station",
            persistency: "persistent",
            notified: "Yes",
            feedbackOperator: "No",
            feedbackGovernment: "No"
        });
    }

    function vectorRecord2() internal pure returns (SourceRecord memory) {
        return SourceRecord({
            sourceId: bytes32("TUR_S_001"),
            lastPlumeId: "vector-plume-0002",
            lastPlumeAt: 1764547200,
            rateKgPerHour: 1234,
            plumeCount: 2,
            latE5: -3612345,
            lonE5: -6479417,
            country: unicode"Türkiye",
            sector: "Oil and Gas",
            sourceType: "O&G facility (generic)",
            persistency: "absent",
            notified: "Yes",
            feedbackOperator: "Yes",
            feedbackGovernment: "No"
        });
    }

    function vectorObservation() internal pure returns (Reobservation memory) {
        return Reobservation({
            sourceId: bytes32("KAZ_S_003"),
            observedAt: 1790000000,
            plumeDetected: false,
            basis: "vector re-observation"
        });
    }

    /// @notice A plain notified oil & gas record for `sourceId` detected at `lastPlumeAt`.
    function record(bytes32 sourceId, uint64 lastPlumeAt, uint32 rateKgPerHour)
        internal
        pure
        returns (SourceRecord memory)
    {
        return SourceRecord({
            sourceId: sourceId,
            lastPlumeId: "test-plume",
            lastPlumeAt: lastPlumeAt,
            rateKgPerHour: rateKgPerHour,
            plumeCount: 3,
            latE5: 3000000,
            lonE5: 5000000,
            country: "Testland",
            sector: "Oil and Gas",
            sourceType: "Flare",
            persistency: "persistent",
            notified: "Yes",
            feedbackOperator: "No",
            feedbackGovernment: "No"
        });
    }
}
````

Create `contracts/test/PlumeBase.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {
    RootKind,
    RootInfo,
    Ticket,
    NotFeeder,
    ZeroAddress,
    ZeroWindow,
    ZeroMinBond,
    InvalidRootKind,
    RootExists,
    UnknownTicket
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";

contract BaseHarness is PlumeBase {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

contract PlumeBaseTest is Test {
    event RootPosted(bytes32 indexed root, RootKind kind, string uri);

    BaseHarness internal base;
    address internal feeder = makeAddr("feeder");
    address internal arbiter = makeAddr("arbiter");
    address payable internal fund = payable(makeAddr("fund"));

    function setUp() public {
        base = new BaseHarness(feeder, arbiter, fund, 180, 0.0005 ether);
    }

    function test_constructorStoresImmutables() public view {
        assertEq(base.feeder(), feeder);
        assertEq(base.arbiter(), arbiter);
        assertEq(base.mitigationFund(), fund);
        assertEq(base.responseWindow(), 180);
        assertEq(base.minBond(), 0.0005 ether);
        assertEq(base.MAX_REOPENS(), 2);
    }

    function test_constructorRejectsBadArguments() public {
        vm.expectRevert(ZeroAddress.selector);
        new BaseHarness(address(0), arbiter, fund, 180, 1);
        vm.expectRevert(ZeroAddress.selector);
        new BaseHarness(feeder, address(0), fund, 180, 1);
        vm.expectRevert(ZeroAddress.selector);
        new BaseHarness(feeder, arbiter, payable(address(0)), 180, 1);
        vm.expectRevert(ZeroWindow.selector);
        new BaseHarness(feeder, arbiter, fund, 0, 1);
        vm.expectRevert(ZeroMinBond.selector);
        new BaseHarness(feeder, arbiter, fund, 180, 0);
    }

    function test_postRootStoresKindAndTimeAndEmits() public {
        bytes32 root = keccak256("snapshot");
        vm.warp(1_800_000_000);
        vm.expectEmit(true, false, false, true, address(base));
        emit RootPosted(root, RootKind.Snapshot, "imeo:2026-10-15");
        vm.prank(feeder);
        base.postRoot(root, RootKind.Snapshot, "imeo:2026-10-15");
        RootInfo memory info = base.rootInfo(root);
        assertEq(uint8(info.kind), uint8(RootKind.Snapshot));
        assertEq(info.postedAt, 1_800_000_000);
    }

    function test_postRootOnlyFeeder() public {
        vm.expectRevert(NotFeeder.selector);
        base.postRoot(keccak256("x"), RootKind.Snapshot, "");
    }

    function test_postRootRejectsNoneKindAndDuplicates() public {
        vm.startPrank(feeder);
        vm.expectRevert(InvalidRootKind.selector);
        base.postRoot(keccak256("x"), RootKind.None, "");
        base.postRoot(keccak256("x"), RootKind.Reobservation, "");
        vm.expectRevert(RootExists.selector);
        base.postRoot(keccak256("x"), RootKind.Snapshot, "");
        vm.stopPrank();
    }

    function test_co2eUsesGwp100AndFullYear() public view {
        // 7,847 kg/h * 8,760 h * 29.8 / 1,000 = 2,048,443.6 -> floor
        assertEq(base.co2eTonnesPerYear(7847), 2_048_443);
        assertEq(base.co2eTonnesPerYear(123_491), 32_237_078);
        assertEq(base.co2eTonnesPerYear(0), 0);
    }

    function test_ticketIdForIsAbiEncodedPair() public view {
        bytes32 expected = keccak256(abi.encode(bytes32("KAZ_S_003"), uint64(1780217349)));
        assertEq(base.ticketIdFor(bytes32("KAZ_S_003"), 1780217349), expected);
    }

    function test_hashSourceRecordMatchesCrossLanguageVectors() public view {
        assertEq(base.hashSourceRecord(Fixtures.vectorRecord1()), Fixtures.VECTOR_LEAF_1);
        assertEq(base.hashSourceRecord(Fixtures.vectorRecord2()), Fixtures.VECTOR_LEAF_2);
    }

    function test_hashReobservationMatchesCrossLanguageVector() public view {
        assertEq(base.hashReobservation(Fixtures.vectorObservation()), Fixtures.VECTOR_OBS_LEAF);
    }

    function test_crossLanguageRootVerifiesWithOpenZeppelin() public pure {
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = Fixtures.VECTOR_LEAF_2;
        assertTrue(MerkleProof.verify(proof, Fixtures.VECTOR_ROOT_2, Fixtures.VECTOR_LEAF_1));
    }

    function test_emptyViews() public {
        assertEq(base.ticketCount(), 0);
        Ticket[] memory page = base.getTickets(0, 10);
        assertEq(page.length, 0);
        assertEq(base.getTransitionBlocks(keccak256("none")).length, 0);
        vm.expectRevert(UnknownTicket.selector);
        base.getTicket(keccak256("none"));
    }
}
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `forge test --match-contract PlumeBaseTest`
      Expected: FAIL — compiler error: source `contracts/src/PlumeBase.sol` not found

- [ ] **Step 3: Minimal implementation**

Create `contracts/src/PlumeBase.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Reobservation,
    RootInfo,
    Bond,
    Ticket,
    IPlumeClockEvents,
    NotFeeder,
    NotArbiter,
    ZeroAddress,
    ZeroWindow,
    ZeroMinBond,
    InvalidRootKind,
    RootExists,
    UnknownTicket
} from "./PlumeTypes.sol";

/// @title PlumeBase
/// @notice Immutables, storage, Merkle-root registry, pure hashing helpers and read views shared by
///         every PlumeClock layer. No admin, no upgrade path, no pause.
abstract contract PlumeBase is IPlumeClockEvents, EIP712, ReentrancyGuard {
    /// @notice IPCC AR6 GWP100 for fossil CH4 is 29.8; stored x10 to keep integer math.
    uint256 public constant GWP100_X10 = 298;
    uint256 public constant HOURS_PER_YEAR = 8760;
    /// @notice After this many failed fixes (re-observed plume), responses are no longer accepted.
    uint32 public constant MAX_REOPENS = 2;

    address public immutable feeder;
    address public immutable arbiter;
    address payable public immutable mitigationFund;
    uint64 public immutable responseWindow;
    uint256 public immutable minBond;

    mapping(bytes32 root => RootInfo) internal _roots;
    mapping(bytes32 sourceId => Bond) internal _bonds;
    mapping(bytes32 sourceId => bytes32 ticketId) internal _activeBondedTicket;
    mapping(bytes32 ticketId => Ticket) internal _tickets;
    mapping(bytes32 ticketId => uint64[]) internal _transitionBlocks;
    bytes32[] internal _ticketIds;

    modifier onlyFeeder() {
        if (msg.sender != feeder) revert NotFeeder();
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert NotArbiter();
        _;
    }

    constructor(
        address feeder_,
        address arbiter_,
        address payable mitigationFund_,
        uint64 responseWindow_,
        uint256 minBond_
    ) EIP712("PlumeClock", "1") {
        if (feeder_ == address(0) || arbiter_ == address(0) || mitigationFund_ == address(0)) revert ZeroAddress();
        if (responseWindow_ == 0) revert ZeroWindow();
        if (minBond_ == 0) revert ZeroMinBond();
        feeder = feeder_;
        arbiter = arbiter_;
        mitigationFund = mitigationFund_;
        responseWindow = responseWindow_;
        minBond = minBond_;
    }

    // ------------------------------------------------------------------ roots

    /// @notice The feeder commits a Merkle root (a snapshot of IMEO records or a re-observation pass).
    function postRoot(bytes32 root, RootKind kind, string calldata uri) external onlyFeeder {
        if (kind == RootKind.None) revert InvalidRootKind();
        if (_roots[root].kind != RootKind.None) revert RootExists();
        _roots[root] = RootInfo({kind: kind, postedAt: uint64(block.timestamp)});
        emit RootPosted(root, kind, uri);
    }

    function rootInfo(bytes32 root) external view returns (RootInfo memory) {
        return _roots[root];
    }

    // ------------------------------------------------------------------ pure helpers

    /// @notice t CO2e per year if the plume persisted at `rateKgPerHour` all year (GWP100 = 29.8).
    function co2eTonnesPerYear(uint32 rateKgPerHour) public pure returns (uint256) {
        return uint256(rateKgPerHour) * HOURS_PER_YEAR * GWP100_X10 / 10_000;
    }

    function ticketIdFor(bytes32 sourceId, uint64 lastPlumeAt) public pure returns (bytes32) {
        return keccak256(abi.encode(sourceId, lastPlumeAt));
    }

    /// @notice Merkle leaf of a snapshot record: keccak256(bytes.concat(keccak256(abi.encode(rec)))).
    function hashSourceRecord(SourceRecord calldata rec) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(rec))));
    }

    /// @notice Merkle leaf of a re-observation: keccak256(bytes.concat(keccak256(abi.encode(obs)))).
    function hashReobservation(Reobservation calldata obs) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(obs))));
    }

    // ------------------------------------------------------------------ views

    function getBond(bytes32 sourceId) external view returns (Bond memory) {
        return _bonds[sourceId];
    }

    function activeBondedTicket(bytes32 sourceId) external view returns (bytes32) {
        return _activeBondedTicket[sourceId];
    }

    function ticketCount() external view returns (uint256) {
        return _ticketIds.length;
    }

    function getTicket(bytes32 ticketId) external view returns (Ticket memory) {
        Ticket memory t = _tickets[ticketId];
        if (t.status == Status.None) revert UnknownTicket();
        return t;
    }

    /// @notice Page through tickets in open order; returns fewer than `count` at the end.
    function getTickets(uint256 start, uint256 count) external view returns (Ticket[] memory page) {
        uint256 total = _ticketIds.length;
        if (start >= total) return new Ticket[](0);
        uint256 end = count > total - start ? total : start + count;
        page = new Ticket[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = _tickets[_ticketIds[i]];
        }
    }

    /// @notice Block number of every state change of a ticket (open first), for one-block log reads.
    function getTransitionBlocks(bytes32 ticketId) external view returns (uint64[] memory) {
        return _transitionBlocks[ticketId];
    }

    // ------------------------------------------------------------------ internal

    function _recordTransition(bytes32 ticketId) internal {
        _transitionBlocks[ticketId].push(uint64(block.number));
    }

    /// @dev Moves a ticket to a terminal status and frees its source's bonded slot.
    function _close(Ticket storage t, Status finalStatus) internal {
        t.status = finalStatus;
        t.closedAt = uint64(block.timestamp);
        if (_activeBondedTicket[t.sourceId] == t.id) {
            delete _activeBondedTicket[t.sourceId];
        }
        _recordTransition(t.id);
    }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `forge test --match-contract PlumeBaseTest`
      Expected: PASS — `Suite result: ok. 11 passed; 0 failed; 0 skipped`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(contracts): add PlumeBase root registry, hashing and views`

### Task 1.4: PlumeBonds: pledge and withdraw

**Files:**
- Create: `contracts/src/PlumeBonds.sol`
- Test:   `contracts/test/PlumeBonds.t.sol`

**Depends on:** Task 1.3
**Effort:** high
**Model tier:** top
**Provides:** `abstract PlumeBonds is PlumeBase: pledge(bytes32 sourceId) payable, withdrawBond(bytes32 sourceId)`
**Requires:** `abstract PlumeBase(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is IPlumeClockEvents, EIP712("PlumeClock", "1"), ReentrancyGuard: public immutables feeder, arbiter, mitigationFund, responseWindow, minBond; constants GWP100_X10 = 298, HOURS_PER_YEAR = 8760, MAX_REOPENS = 2; modifiers onlyFeeder, onlyArbiter; postRoot(bytes32,RootKind,string), rootInfo(bytes32), co2eTonnesPerYear(uint32), ticketIdFor(bytes32,uint64), hashSourceRecord(SourceRecord), hashReobservation(Reobservation), getBond(bytes32), activeBondedTicket(bytes32), ticketCount(), getTicket(bytes32), getTickets(uint256,uint256), getTransitionBlocks(bytes32); internal _roots, _bonds, _activeBondedTicket, _tickets, _transitionBlocks, _ticketIds, _recordTransition(bytes32), _close(Ticket storage, Status)`

Operators opt in per source by pledging native testnet ETH. The first pledger owns the source; only the same operator can top up. A bond is locked while the source has an active bonded ticket (`_activeBondedTicket`), which the tickets layer sets (the test harness sets it directly). Withdrawal follows checks-effects-interactions behind `nonReentrant`; a hostile operator contract that re-enters `withdrawBond` from `receive()` must make the withdrawal revert with `TransferFailed`.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `abstract PlumeBase(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is IPlumeClockEvents, EIP712("PlumeClock", "1"), ReentrancyGuard: public immutables feeder, arbiter, mitigationFund, responseWindow, minBond; constants GWP100_X10 = 298, HOURS_PER_YEAR = 8760, MAX_REOPENS = 2; modifiers onlyFeeder, onlyArbiter; postRoot(bytes32,RootKind,string), rootInfo(bytes32), co2eTonnesPerYear(uint32), ticketIdFor(bytes32,uint64), hashSourceRecord(SourceRecord), hashReobservation(Reobservation), getBond(bytes32), activeBondedTicket(bytes32), ticketCount(), getTicket(bytes32), getTickets(uint256,uint256), getTransitionBlocks(bytes32); internal _roots, _bonds, _activeBondedTicket, _tickets, _transitionBlocks, _ticketIds, _recordTransition(bytes32), _close(Ticket storage, Status)`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/PlumeBonds.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeBonds} from "../src/PlumeBonds.sol";
import {
    Bond, BondTooSmall, SourceClaimed, NoBond, NotOperator, BondLocked, TransferFailed
} from "../src/PlumeTypes.sol";

contract BondsHarness is PlumeBonds {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}

    /// @dev Test hook standing in for PlumeTickets (which sets the slot when a bonded ticket opens).
    function setActive(bytes32 sourceId, bytes32 ticketId) external {
        _activeBondedTicket[sourceId] = ticketId;
    }
}

/// @dev An operator contract that tries to withdraw twice by re-entering from receive().
contract ReentrantOperator {
    BondsHarness internal immutable bonds;
    bytes32 internal immutable source;

    constructor(BondsHarness bonds_, bytes32 source_) {
        bonds = bonds_;
        source = source_;
    }

    function pledge() external payable {
        bonds.pledge{value: msg.value}(source);
    }

    function withdraw() external {
        bonds.withdrawBond(source);
    }

    receive() external payable {
        bonds.withdrawBond(source);
    }
}

contract PlumeBondsTest is Test {
    event BondPledged(bytes32 indexed sourceId, address indexed operator, uint256 amount, uint256 total);
    event BondWithdrawn(bytes32 indexed sourceId, address indexed operator, uint256 amount);

    BondsHarness internal bonds;
    address internal operatorA = makeAddr("operatorA");
    address internal operatorB = makeAddr("operatorB");
    bytes32 internal constant SOURCE = bytes32("IRQ_S_067");
    uint256 internal constant MIN_BOND = 0.0005 ether;

    function setUp() public {
        bonds = new BondsHarness(makeAddr("feeder"), makeAddr("arbiter"), payable(makeAddr("fund")), 180, MIN_BOND);
        vm.deal(operatorA, 1 ether);
        vm.deal(operatorB, 1 ether);
    }

    function test_firstPledgeClaimsSource() public {
        vm.expectEmit(true, true, false, true, address(bonds));
        emit BondPledged(SOURCE, operatorA, 0.001 ether, 0.001 ether);
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        Bond memory b = bonds.getBond(SOURCE);
        assertEq(b.operator, operatorA);
        assertEq(b.amount, 0.001 ether);
        assertEq(address(bonds).balance, 0.001 ether);
    }

    function test_pledgeBelowMinBondReverts() public {
        vm.prank(operatorA);
        vm.expectRevert(BondTooSmall.selector);
        bonds.pledge{value: MIN_BOND - 1}(SOURCE);
    }

    function test_topUpBySameOperatorAccumulates() public {
        vm.startPrank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        bonds.pledge{value: 1 wei}(SOURCE);
        vm.stopPrank();
        assertEq(bonds.getBond(SOURCE).amount, 0.001 ether + 1 wei);
    }

    function test_zeroTopUpReverts() public {
        vm.startPrank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        vm.expectRevert(BondTooSmall.selector);
        bonds.pledge{value: 0}(SOURCE);
        vm.stopPrank();
    }

    function test_pledgeByAnotherOperatorReverts() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        vm.prank(operatorB);
        vm.expectRevert(SourceClaimed.selector);
        bonds.pledge{value: 0.001 ether}(SOURCE);
    }

    function test_withdrawReturnsWholeBondAndClears() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.002 ether}(SOURCE);
        uint256 before = operatorA.balance;
        vm.expectEmit(true, true, false, true, address(bonds));
        emit BondWithdrawn(SOURCE, operatorA, 0.002 ether);
        vm.prank(operatorA);
        bonds.withdrawBond(SOURCE);
        assertEq(operatorA.balance, before + 0.002 ether);
        assertEq(bonds.getBond(SOURCE).operator, address(0));
        assertEq(address(bonds).balance, 0);
    }

    function test_withdrawRevertsWithoutBond() public {
        vm.prank(operatorA);
        vm.expectRevert(NoBond.selector);
        bonds.withdrawBond(SOURCE);
    }

    function test_withdrawRevertsForNonOperator() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        vm.prank(operatorB);
        vm.expectRevert(NotOperator.selector);
        bonds.withdrawBond(SOURCE);
    }

    function test_withdrawCannotBeReentered() public {
        ReentrantOperator attacker = new ReentrantOperator(bonds, SOURCE);
        attacker.pledge{value: 0.001 ether}();
        vm.expectRevert(TransferFailed.selector);
        attacker.withdraw();
        assertEq(bonds.getBond(SOURCE).amount, 0.001 ether);
        assertEq(address(bonds).balance, 0.001 ether);
    }

    function test_withdrawRevertsWhileBondedTicketActive() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        bonds.setActive(SOURCE, keccak256("ticket"));
        vm.prank(operatorA);
        vm.expectRevert(BondLocked.selector);
        bonds.withdrawBond(SOURCE);
    }
}
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `forge test --match-contract PlumeBondsTest`
      Expected: FAIL — compiler error: source `contracts/src/PlumeBonds.sol` not found

- [ ] **Step 3: Minimal implementation**

Create `contracts/src/PlumeBonds.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PlumeBase} from "./PlumeBase.sol";
import {Bond, BondTooSmall, SourceClaimed, NoBond, NotOperator, BondLocked, TransferFailed} from "./PlumeTypes.sol";

/// @title PlumeBonds
/// @notice Operators opt in per source by pledging native testnet ETH; a bond is locked while the
///         source has an active bonded ticket.
abstract contract PlumeBonds is PlumeBase {
    /// @notice First pledger becomes the source's operator; the same operator may top up.
    function pledge(bytes32 sourceId) external payable {
        Bond storage b = _bonds[sourceId];
        if (b.operator == address(0)) {
            if (msg.value < minBond) revert BondTooSmall();
            b.operator = msg.sender;
        } else if (b.operator != msg.sender) {
            revert SourceClaimed();
        } else if (msg.value == 0) {
            revert BondTooSmall();
        }
        b.amount += msg.value;
        emit BondPledged(sourceId, msg.sender, msg.value, b.amount);
    }

    /// @notice The operator takes the whole bond back while no bonded ticket is active for the source.
    function withdrawBond(bytes32 sourceId) external nonReentrant {
        Bond memory b = _bonds[sourceId];
        if (b.operator == address(0)) revert NoBond();
        if (b.operator != msg.sender) revert NotOperator();
        if (_activeBondedTicket[sourceId] != bytes32(0)) revert BondLocked();
        delete _bonds[sourceId];
        emit BondWithdrawn(sourceId, msg.sender, b.amount);
        (bool ok,) = payable(msg.sender).call{value: b.amount}("");
        if (!ok) revert TransferFailed();
    }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `forge test --match-contract PlumeBondsTest`
      Expected: PASS — `Suite result: ok. 10 passed; 0 failed; 0 skipped`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(contracts): add per-source operator bonds`

### Task 1.5: PlumeTickets: open tickets from Merkle-proven IMEO records

**Files:**
- Create: `contracts/src/PlumeTickets.sol`
- Create: `contracts/test/utils/MerkleHelper.sol`
- Test:   `contracts/test/PlumeTickets.t.sol`

**Depends on:** Task 1.4
**Effort:** high
**Model tier:** top
**Provides:** `abstract PlumeTickets is PlumeBonds: openTicket(bytes32 root, SourceRecord rec, bytes32[] proof) returns (bytes32), openTickets(bytes32 root, SourceRecord[] recs, bytes32[][] proofs) returns (bytes32[])`, `contracts/test/utils/MerkleHelper.sol: MerkleHelper.root(bytes32[] leaves), MerkleHelper.proof(bytes32[] leaves, bytes32 leaf)`
**Requires:** `abstract PlumeBonds is PlumeBase: pledge(bytes32 sourceId) payable, withdrawBond(bytes32 sourceId)`, `contracts/test/utils/Fixtures.sol: Fixtures.record(bytes32 sourceId, uint64 lastPlumeAt, uint32 rate), Fixtures.vectorRecord1(), Fixtures.vectorRecord2(), Fixtures.vectorObservation(), VECTOR_LEAF_1, VECTOR_LEAF_2, VECTOR_OBS_LEAF, VECTOR_ROOT_2`

Anyone can open a ticket for a record proven against a posted `Snapshot` root (OpenZeppelin `MerkleProof.verifyCalldata`). One ticket per (source, last plume); a bonded source can have only one active bonded ticket. The clock starts at open: `deadline = now + responseWindow`. `MerkleHelper.sol` (test only) builds trees exactly like src/lib/merkle.ts: leaves sorted ascending, sorted-pair keccak, odd node carried up.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `abstract PlumeBonds is PlumeBase: pledge(bytes32 sourceId) payable, withdrawBond(bytes32 sourceId)`
- `contracts/test/utils/Fixtures.sol: Fixtures.record(bytes32 sourceId, uint64 lastPlumeAt, uint32 rate), Fixtures.vectorRecord1(), Fixtures.vectorRecord2(), Fixtures.vectorObservation(), VECTOR_LEAF_1, VECTOR_LEAF_2, VECTOR_OBS_LEAF, VECTOR_ROOT_2`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/utils/MerkleHelper.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Test-only Merkle builder, identical to src/lib/merkle.ts: leaves sorted ascending,
///         sorted-pair keccak256, odd node carried up unchanged (OpenZeppelin MerkleProof compatible).
library MerkleHelper {
    function hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function root(bytes32[] memory leaves) internal pure returns (bytes32) {
        bytes32[] memory level = _sorted(leaves);
        while (level.length > 1) {
            level = _next(level);
        }
        return level[0];
    }

    function proof(bytes32[] memory leaves, bytes32 leaf) internal pure returns (bytes32[] memory) {
        bytes32[] memory level = _sorted(leaves);
        uint256 index = type(uint256).max;
        for (uint256 i = 0; i < level.length; i++) {
            if (level[i] == leaf) {
                index = i;
                break;
            }
        }
        require(index != type(uint256).max, "MerkleHelper: leaf not found");
        bytes32[] memory buffer = new bytes32[](64);
        uint256 count = 0;
        while (level.length > 1) {
            uint256 sibling = index ^ 1;
            if (sibling < level.length) {
                buffer[count] = level[sibling];
                count++;
            }
            index = index >> 1;
            level = _next(level);
        }
        bytes32[] memory out = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            out[i] = buffer[i];
        }
        return out;
    }

    function _next(bytes32[] memory level) private pure returns (bytes32[] memory next) {
        next = new bytes32[]((level.length + 1) / 2);
        for (uint256 i = 0; i < level.length; i += 2) {
            next[i / 2] = i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i];
        }
    }

    function _sorted(bytes32[] memory leaves) private pure returns (bytes32[] memory out) {
        require(leaves.length > 0, "MerkleHelper: no leaves");
        out = new bytes32[](leaves.length);
        for (uint256 i = 0; i < leaves.length; i++) {
            out[i] = leaves[i];
        }
        for (uint256 i = 1; i < out.length; i++) {
            bytes32 key = out[i];
            uint256 j = i;
            while (j > 0 && out[j - 1] > key) {
                out[j] = out[j - 1];
                j--;
            }
            out[j] = key;
        }
    }
}
````

Create `contracts/test/PlumeTickets.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeTickets} from "../src/PlumeTickets.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Ticket,
    WrongRootKind,
    InvalidProof,
    TicketExists,
    SourceBusy,
    LengthMismatch
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

contract TicketsHarness is PlumeTickets {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

contract PlumeTicketsTest is Test {
    event TicketOpened(
        bytes32 indexed ticketId,
        bytes32 indexed sourceId,
        address indexed operator,
        bytes32 root,
        uint64 deadline,
        uint32 rateKgPerHour,
        uint256 co2eTonnesPerYear
    );

    TicketsHarness internal clock;
    address internal feeder = makeAddr("feeder");
    address internal operatorA = makeAddr("operatorA");
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    bytes32 internal constant SRC_B = bytes32("KAZ_S_003");
    bytes32 internal constant SRC_C = bytes32("TKM_S_022");

    SourceRecord[] internal recs;
    bytes32[] internal leaves;
    bytes32 internal root;

    function setUp() public {
        vm.warp(1_800_000_000);
        clock = new TicketsHarness(feeder, makeAddr("arbiter"), payable(makeAddr("fund")), 180, 0.0005 ether);
        recs.push(Fixtures.record(SRC_A, 1_761_905_340, 123_491));
        recs.push(Fixtures.record(SRC_B, 1_780_217_349, 7_847));
        recs.push(Fixtures.record(SRC_C, 1_786_000_000, 12_080));
        recs.push(Fixtures.record(SRC_A, 1_790_000_000, 50_000)); // a later detection of source A
        for (uint256 i = 0; i < recs.length; i++) {
            leaves.push(clock.hashSourceRecord(recs[i]));
        }
        root = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "test-snapshot");
        vm.deal(operatorA, 1 ether);
    }

    function _proof(uint256 i) internal view returns (bytes32[] memory) {
        return MerkleHelper.proof(leaves, leaves[i]);
    }

    function test_openUnbondedTicket() public {
        bytes32 expectedId = clock.ticketIdFor(SRC_B, recs[1].lastPlumeAt);
        vm.expectEmit(true, true, true, true, address(clock));
        emit TicketOpened(expectedId, SRC_B, address(0), root, 1_800_000_180, 7_847, 2_048_443);
        bytes32 id = clock.openTicket(root, recs[1], _proof(1));
        assertEq(id, expectedId);
        Ticket memory t = clock.getTicket(id);
        assertEq(uint8(t.status), uint8(Status.Open));
        assertEq(t.operator, address(0));
        assertEq(t.sourceId, SRC_B);
        assertEq(t.snapshotRoot, root);
        assertEq(t.openedAt, 1_800_000_000);
        assertEq(t.deadline, 1_800_000_180);
        assertEq(t.rateKgPerHour, 7_847);
        assertEq(t.co2eTonnesPerYear, 2_048_443);
        assertEq(clock.ticketCount(), 1);
        assertEq(clock.activeBondedTicket(SRC_B), bytes32(0));
    }

    function test_openBondedTicketLocksSourceSlot() public {
        vm.prank(operatorA);
        clock.pledge{value: 0.001 ether}(SRC_A);
        bytes32 id = clock.openTicket(root, recs[0], _proof(0));
        assertEq(clock.getTicket(id).operator, operatorA);
        assertEq(clock.activeBondedTicket(SRC_A), id);
    }

    function test_secondBondedTicketForBusySourceReverts() public {
        vm.prank(operatorA);
        clock.pledge{value: 0.001 ether}(SRC_A);
        clock.openTicket(root, recs[0], _proof(0));
        vm.expectRevert(SourceBusy.selector);
        clock.openTicket(root, recs[3], _proof(3));
    }

    function test_openRejectsUnknownAndWrongKindRoots() public {
        vm.expectRevert(WrongRootKind.selector);
        clock.openTicket(keccak256("unposted"), recs[0], _proof(0));
        bytes32 obsRoot = keccak256("reobservation-root");
        vm.prank(feeder);
        clock.postRoot(obsRoot, RootKind.Reobservation, "obs");
        vm.expectRevert(WrongRootKind.selector);
        clock.openTicket(obsRoot, recs[0], _proof(0));
    }

    function test_openRejectsBadProofAndTamperedRecord() public {
        vm.expectRevert(InvalidProof.selector);
        clock.openTicket(root, recs[0], _proof(1));
        SourceRecord memory tampered = recs[1];
        tampered.feedbackOperator = "Yes";
        vm.expectRevert(InvalidProof.selector);
        clock.openTicket(root, tampered, _proof(1));
    }

    function test_openRejectsDuplicateTicket() public {
        clock.openTicket(root, recs[2], _proof(2));
        vm.expectRevert(TicketExists.selector);
        clock.openTicket(root, recs[2], _proof(2));
    }

    function test_openTicketsBatchAndLengthCheck() public {
        SourceRecord[] memory batch = new SourceRecord[](2);
        bytes32[][] memory proofs = new bytes32[][](2);
        batch[0] = recs[1];
        batch[1] = recs[2];
        proofs[0] = _proof(1);
        proofs[1] = _proof(2);
        bytes32[] memory ids = clock.openTickets(root, batch, proofs);
        assertEq(ids.length, 2);
        assertEq(clock.ticketCount(), 2);
        bytes32[][] memory shortProofs = new bytes32[][](1);
        shortProofs[0] = _proof(1);
        vm.expectRevert(LengthMismatch.selector);
        clock.openTickets(root, batch, shortProofs);
    }

    function test_getTicketsPagesInOpenOrder() public {
        bytes32 first = clock.openTicket(root, recs[1], _proof(1));
        bytes32 second = clock.openTicket(root, recs[2], _proof(2));
        Ticket[] memory all = clock.getTickets(0, 10);
        assertEq(all.length, 2);
        assertEq(all[0].id, first);
        assertEq(all[1].id, second);
        Ticket[] memory tail = clock.getTickets(1, 10);
        assertEq(tail.length, 1);
        assertEq(tail[0].id, second);
        assertEq(clock.getTickets(2, 10).length, 0);
    }

    function test_openRecordsTransitionBlock() public {
        vm.roll(4242);
        bytes32 id = clock.openTicket(root, recs[1], _proof(1));
        uint64[] memory blocks = clock.getTransitionBlocks(id);
        assertEq(blocks.length, 1);
        assertEq(blocks[0], 4242);
    }
}
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `forge test --match-contract PlumeTicketsTest`
      Expected: FAIL — compiler error: source `contracts/src/PlumeTickets.sol` not found

- [ ] **Step 3: Minimal implementation**

Create `contracts/src/PlumeTickets.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PlumeBonds} from "./PlumeBonds.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Ticket,
    WrongRootKind,
    InvalidProof,
    TicketExists,
    SourceBusy,
    LengthMismatch
} from "./PlumeTypes.sol";

/// @title PlumeTickets
/// @notice Anyone opens a ticket from a record proven against a posted snapshot root.
abstract contract PlumeTickets is PlumeBonds {
    function openTicket(bytes32 root, SourceRecord calldata rec, bytes32[] calldata proof)
        external
        returns (bytes32 ticketId)
    {
        if (_roots[root].kind != RootKind.Snapshot) revert WrongRootKind();
        ticketId = _open(root, rec, proof);
    }

    function openTickets(bytes32 root, SourceRecord[] calldata recs, bytes32[][] calldata proofs)
        external
        returns (bytes32[] memory ids)
    {
        if (_roots[root].kind != RootKind.Snapshot) revert WrongRootKind();
        if (recs.length != proofs.length) revert LengthMismatch();
        ids = new bytes32[](recs.length);
        for (uint256 i = 0; i < recs.length; i++) {
            ids[i] = _open(root, recs[i], proofs[i]);
        }
    }

    function _open(bytes32 root, SourceRecord calldata rec, bytes32[] calldata proof)
        internal
        returns (bytes32 ticketId)
    {
        if (!MerkleProof.verifyCalldata(proof, root, hashSourceRecord(rec))) revert InvalidProof();
        ticketId = ticketIdFor(rec.sourceId, rec.lastPlumeAt);
        if (_tickets[ticketId].status != Status.None) revert TicketExists();
        address operator = _bonds[rec.sourceId].operator;
        if (operator != address(0)) {
            if (_activeBondedTicket[rec.sourceId] != bytes32(0)) revert SourceBusy();
            _activeBondedTicket[rec.sourceId] = ticketId;
        }
        uint64 deadline = uint64(block.timestamp) + responseWindow;
        uint256 co2e = co2eTonnesPerYear(rec.rateKgPerHour);
        Ticket storage t = _tickets[ticketId];
        t.id = ticketId;
        t.sourceId = rec.sourceId;
        t.snapshotRoot = root;
        t.operator = operator;
        t.status = Status.Open;
        t.rateKgPerHour = rec.rateKgPerHour;
        t.lastPlumeAt = rec.lastPlumeAt;
        t.openedAt = uint64(block.timestamp);
        t.deadline = deadline;
        t.co2eTonnesPerYear = co2e;
        _ticketIds.push(ticketId);
        _recordTransition(ticketId);
        emit TicketOpened(ticketId, rec.sourceId, operator, root, deadline, rec.rateKgPerHour, co2e);
    }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `forge test --match-contract PlumeTicketsTest`
      Expected: PASS — `Suite result: ok. 9 passed; 0 failed; 0 skipped`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(contracts): open tickets from Merkle-proven IMEO records`

### Task 1.6: PlumeResponses: EIP-712 attestations and disputes

**Files:**
- Create: `contracts/src/PlumeResponses.sol`
- Test:   `contracts/test/PlumeResponses.t.sol`

**Depends on:** Task 1.5
**Effort:** xhigh
**Model tier:** top
**Provides:** `abstract PlumeResponses is PlumeTickets: respond(bytes32,Attestation,bytes), dispute(bytes32,DisputeClaim,bytes), settleDispute(bytes32,bool), attestationDigest(Attestation), disputeDigest(DisputeClaim), ATTESTATION_TYPEHASH, DISPUTE_TYPEHASH`
**Requires:** `abstract PlumeTickets is PlumeBonds: openTicket(bytes32 root, SourceRecord rec, bytes32[] proof) returns (bytes32), openTickets(bytes32 root, SourceRecord[] recs, bytes32[][] proofs) returns (bytes32[])`, `contracts/test/utils/MerkleHelper.sol: MerkleHelper.root(bytes32[] leaves), MerkleHelper.proof(bytes32[] leaves, bytes32 leaf)`

The bonded operator answers an open ticket before its deadline with an EIP-712 signed `Attestation` (cause, action, evidence hash) or disputes attribution with a signed `DisputeClaim`, which pauses the clock until the arbiter settles it. Signatures are checked with OpenZeppelin `SignatureChecker` (EOA or ERC-1271; the test bonds and responds through a minimal ERC-1271 wallet). The domain is `EIP712("PlumeClock", "1")` from PlumeBase and the typehash strings must match the viem typed data in src/lib/eip712.ts (Task 4.1) exactly. After `MAX_REOPENS` failed fixes responses are refused.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `abstract PlumeTickets is PlumeBonds: openTicket(bytes32 root, SourceRecord rec, bytes32[] proof) returns (bytes32), openTickets(bytes32 root, SourceRecord[] recs, bytes32[][] proofs) returns (bytes32[])`
- `contracts/test/utils/MerkleHelper.sol: MerkleHelper.root(bytes32[] leaves), MerkleHelper.proof(bytes32[] leaves, bytes32 leaf)`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/PlumeResponses.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeResponses} from "../src/PlumeResponses.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Attestation,
    DisputeClaim,
    Ticket,
    BadStatus,
    NotBonded,
    NotArbiter,
    DeadlinePassed,
    TicketMismatch,
    BadSignature
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

contract ResponsesHarness is PlumeResponses {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

/// @dev A contract-wallet operator (ERC-1271) whose owner key signs on its behalf.
contract ERC1271Wallet {
    address internal immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function pledgeTo(ResponsesHarness clock, bytes32 sourceId) external payable {
        clock.pledge{value: msg.value}(sourceId);
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        return ECDSA.recover(hash, signature) == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}

contract PlumeResponsesTest is Test {
    event Responded(bytes32 indexed ticketId, address indexed operator, string cause, string action, bytes32 evidenceHash);
    event Disputed(
        bytes32 indexed ticketId, address indexed operator, string reason, bytes32 evidenceHash, uint64 pausedRemaining
    );
    event DisputeSettled(bytes32 indexed ticketId, bool upheld, uint64 newDeadline);

    ResponsesHarness internal clock;
    address internal feeder = makeAddr("feeder");
    address internal arbiter = makeAddr("arbiter");
    address internal operator;
    uint256 internal operatorKey;
    bytes32 internal bondedId;
    bytes32 internal unbondedId;
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    bytes32 internal constant SRC_B = bytes32("KAZ_S_003");
    bytes32 internal constant EVIDENCE = keccak256("valve replaced; work order 4711");

    function setUp() public {
        vm.warp(1_800_000_000);
        (operator, operatorKey) = makeAddrAndKey("operatorA");
        clock = new ResponsesHarness(feeder, arbiter, payable(makeAddr("fund")), 180, 0.0005 ether);
        SourceRecord memory a = Fixtures.record(SRC_A, 1_761_905_340, 123_491);
        SourceRecord memory b = Fixtures.record(SRC_B, 1_780_217_349, 7_847);
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = clock.hashSourceRecord(a);
        leaves[1] = clock.hashSourceRecord(b);
        bytes32 root = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "test");
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        clock.pledge{value: 0.001 ether}(SRC_A);
        bondedId = clock.openTicket(root, a, MerkleHelper.proof(leaves, leaves[0]));
        unbondedId = clock.openTicket(root, b, MerkleHelper.proof(leaves, leaves[1]));
    }

    function _attestation(bytes32 ticketId) internal pure returns (Attestation memory) {
        return Attestation({
            ticketId: ticketId,
            cause: "Stuck pressure-relief valve",
            action: "Valve replaced and line re-pressurised",
            evidenceHash: EVIDENCE
        });
    }

    function _sign(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_attestationDigestIsEip712() public view {
        Attestation memory att = _attestation(bondedId);
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Attestation(bytes32 ticketId,string cause,string action,bytes32 evidenceHash)"),
                att.ticketId,
                keccak256(bytes(att.cause)),
                keccak256(bytes(att.action)),
                att.evidenceHash
            )
        );
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("PlumeClock"),
                keccak256("1"),
                block.chainid,
                address(clock)
            )
        );
        assertEq(clock.attestationDigest(att), keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash)));
    }

    function test_respondWithOperatorSignature() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.warp(1_800_000_060);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Responded(bondedId, operator, att.cause, att.action, EVIDENCE);
        vm.prank(makeAddr("relayer"));
        clock.respond(bondedId, att, sig);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Responded));
        assertEq(t.respondedAt, 1_800_000_060);
        assertEq(clock.getTransitionBlocks(bondedId).length, 2);
    }

    function test_respondRejectsWrongSigner() public {
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(strangerKey, clock.attestationDigest(att));
        vm.expectRevert(BadSignature.selector);
        clock.respond(bondedId, att, sig);
    }

    function test_respondRejectsMismatchedTicket() public {
        Attestation memory att = _attestation(keccak256("other"));
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.expectRevert(TicketMismatch.selector);
        clock.respond(bondedId, att, sig);
    }

    function test_respondRejectsAfterDeadline() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.warp(1_800_000_181);
        vm.expectRevert(DeadlinePassed.selector);
        clock.respond(bondedId, att, sig);
    }

    function test_respondAcceptedExactlyAtDeadline() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.warp(1_800_000_180);
        clock.respond(bondedId, att, sig);
        assertEq(uint8(clock.getTicket(bondedId).status), uint8(Status.Responded));
    }

    function test_respondRejectsUnbondedTicket() public {
        Attestation memory att = _attestation(unbondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.expectRevert(NotBonded.selector);
        clock.respond(unbondedId, att, sig);
    }

    function test_respondAcceptsAnErc1271ContractWalletOperator() public {
        (address owner, uint256 ownerKey) = makeAddrAndKey("walletOwner");
        ERC1271Wallet wallet = new ERC1271Wallet(owner);
        SourceRecord memory c = Fixtures.record(bytes32("TKM_S_022"), 1_786_000_000, 12_080);
        bytes32 root = clock.hashSourceRecord(c);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "single-record root");
        wallet.pledgeTo{value: 0.001 ether}(clock, c.sourceId);
        bytes32 id = clock.openTicket(root, c, new bytes32[](0));
        Attestation memory att = _attestation(id);
        clock.respond(id, att, _sign(ownerKey, clock.attestationDigest(att)));
        assertEq(uint8(clock.getTicket(id).status), uint8(Status.Responded));
        assertEq(clock.getTicket(id).operator, address(wallet));
    }

    function test_disputeRejectsUnbondedAndLateClaims() public {
        DisputeClaim memory unbonded = DisputeClaim({ticketId: unbondedId, reason: "not ours", evidenceHash: bytes32(0)});
        bytes memory unbondedSig = _sign(operatorKey, clock.disputeDigest(unbonded));
        vm.expectRevert(NotBonded.selector);
        clock.dispute(unbondedId, unbonded, unbondedSig);
        DisputeClaim memory late = DisputeClaim({ticketId: bondedId, reason: "not ours", evidenceHash: bytes32(0)});
        bytes memory lateSig = _sign(operatorKey, clock.disputeDigest(late));
        vm.warp(1_800_000_181);
        vm.expectRevert(DeadlinePassed.selector);
        clock.dispute(bondedId, late, lateSig);
    }

    function test_respondRejectsSecondResponse() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        clock.respond(bondedId, att, sig);
        vm.expectRevert(BadStatus.selector);
        clock.respond(bondedId, att, sig);
    }

    function _dispute() internal returns (DisputeClaim memory claim) {
        claim = DisputeClaim({
            ticketId: bondedId,
            reason: "Plume attributed to neighbouring facility",
            evidenceHash: keccak256("site map + flare logs")
        });
        bytes memory sig = _sign(operatorKey, clock.disputeDigest(claim));
        vm.warp(1_800_000_050);
        clock.dispute(bondedId, claim, sig);
    }

    function test_disputePausesClock() public {
        DisputeClaim memory claim = DisputeClaim({
            ticketId: bondedId,
            reason: "Plume attributed to neighbouring facility",
            evidenceHash: keccak256("site map + flare logs")
        });
        bytes memory sig = _sign(operatorKey, clock.disputeDigest(claim));
        vm.warp(1_800_000_050);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Disputed(bondedId, operator, claim.reason, claim.evidenceHash, 130);
        clock.dispute(bondedId, claim, sig);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Disputed));
        assertEq(t.pausedRemaining, 130);
    }

    function test_disputeRejectsWrongSigner() public {
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        DisputeClaim memory claim = DisputeClaim({ticketId: bondedId, reason: "not ours", evidenceHash: bytes32(0)});
        bytes memory sig = _sign(strangerKey, clock.disputeDigest(claim));
        vm.expectRevert(BadSignature.selector);
        clock.dispute(bondedId, claim, sig);
    }

    function test_settleDisputeUpheldDismissesAndFreesSlot() public {
        _dispute();
        vm.expectEmit(true, false, false, true, address(clock));
        emit DisputeSettled(bondedId, true, 0);
        vm.prank(arbiter);
        clock.settleDispute(bondedId, true);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Dismissed));
        assertEq(t.closedAt, 1_800_000_050);
        assertEq(clock.activeBondedTicket(SRC_A), bytes32(0));
    }

    function test_settleDisputeRejectedResumesRemainingClock() public {
        _dispute();
        vm.warp(1_800_001_000);
        vm.prank(arbiter);
        clock.settleDispute(bondedId, false);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Open));
        assertEq(t.deadline, 1_800_001_130);
        assertEq(t.pausedRemaining, 0);
        assertEq(clock.activeBondedTicket(SRC_A), bondedId);
    }

    function test_settleDisputeOnlyArbiterAndOnlyDisputed() public {
        vm.prank(arbiter);
        vm.expectRevert(BadStatus.selector);
        clock.settleDispute(bondedId, true);
        _dispute();
        vm.expectRevert(NotArbiter.selector);
        clock.settleDispute(bondedId, true);
    }
}
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `forge test --match-contract PlumeResponsesTest`
      Expected: FAIL — compiler error: source `contracts/src/PlumeResponses.sol` not found

- [ ] **Step 3: Minimal implementation**

Create `contracts/src/PlumeResponses.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {PlumeTickets} from "./PlumeTickets.sol";
import {
    Status,
    Attestation,
    DisputeClaim,
    Ticket,
    BadStatus,
    NotBonded,
    DeadlinePassed,
    TicketMismatch,
    BadSignature,
    TooManyReopens
} from "./PlumeTypes.sol";

/// @title PlumeResponses
/// @notice The bonded operator answers an open ticket with an EIP-712 signed attestation, or
///         disputes attribution (clock paused) for the arbiter to settle. Anyone may relay.
abstract contract PlumeResponses is PlumeTickets {
    bytes32 public constant ATTESTATION_TYPEHASH =
        keccak256("Attestation(bytes32 ticketId,string cause,string action,bytes32 evidenceHash)");
    bytes32 public constant DISPUTE_TYPEHASH =
        keccak256("DisputeClaim(bytes32 ticketId,string reason,bytes32 evidenceHash)");

    function attestationDigest(Attestation calldata att) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTESTATION_TYPEHASH,
                    att.ticketId,
                    keccak256(bytes(att.cause)),
                    keccak256(bytes(att.action)),
                    att.evidenceHash
                )
            )
        );
    }

    function disputeDigest(DisputeClaim calldata claim) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(DISPUTE_TYPEHASH, claim.ticketId, keccak256(bytes(claim.reason)), claim.evidenceHash))
        );
    }

    function respond(bytes32 ticketId, Attestation calldata att, bytes calldata signature) external {
        Ticket storage t = _openBondedTicket(ticketId);
        if (t.reopenCount >= MAX_REOPENS) revert TooManyReopens();
        if (att.ticketId != ticketId) revert TicketMismatch();
        if (!SignatureChecker.isValidSignatureNow(t.operator, attestationDigest(att), signature)) {
            revert BadSignature();
        }
        t.status = Status.Responded;
        t.respondedAt = uint64(block.timestamp);
        _recordTransition(ticketId);
        emit Responded(ticketId, t.operator, att.cause, att.action, att.evidenceHash);
    }

    function dispute(bytes32 ticketId, DisputeClaim calldata claim, bytes calldata signature) external {
        Ticket storage t = _openBondedTicket(ticketId);
        if (claim.ticketId != ticketId) revert TicketMismatch();
        if (!SignatureChecker.isValidSignatureNow(t.operator, disputeDigest(claim), signature)) {
            revert BadSignature();
        }
        uint64 remaining = t.deadline - uint64(block.timestamp);
        t.status = Status.Disputed;
        t.pausedRemaining = remaining;
        _recordTransition(ticketId);
        emit Disputed(ticketId, t.operator, claim.reason, claim.evidenceHash, remaining);
    }

    /// @notice upheld = misattribution confirmed (ticket dismissed); otherwise the clock resumes.
    function settleDispute(bytes32 ticketId, bool upheld) external onlyArbiter {
        Ticket storage t = _tickets[ticketId];
        if (t.status != Status.Disputed) revert BadStatus();
        uint64 newDeadline = 0;
        if (upheld) {
            t.pausedRemaining = 0;
            _close(t, Status.Dismissed);
        } else {
            newDeadline = uint64(block.timestamp) + t.pausedRemaining;
            t.deadline = newDeadline;
            t.pausedRemaining = 0;
            t.status = Status.Open;
            _recordTransition(ticketId);
        }
        emit DisputeSettled(ticketId, upheld, newDeadline);
    }

    function _openBondedTicket(bytes32 ticketId) internal view returns (Ticket storage t) {
        t = _tickets[ticketId];
        if (t.status != Status.Open) revert BadStatus();
        if (t.operator == address(0)) revert NotBonded();
        if (block.timestamp > t.deadline) revert DeadlinePassed();
    }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `forge test --match-contract PlumeResponsesTest`
      Expected: PASS — `Suite result: ok. 15 passed; 0 failed; 0 skipped`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(contracts): EIP-712 operator attestations and disputes`

### Task 1.7: PlumeReobservations: resolve or reopen from a proven re-observation

**Files:**
- Create: `contracts/src/PlumeReobservations.sol`
- Test:   `contracts/test/PlumeReobservations.t.sol`

**Depends on:** Task 1.6
**Effort:** high
**Model tier:** top
**Provides:** `abstract PlumeReobservations is PlumeResponses: resolve(bytes32 ticketId, bytes32 root, Reobservation obs, bytes32[] proof), reopen(bytes32 ticketId, bytes32 root, Reobservation obs, bytes32[] proof)`
**Requires:** `abstract PlumeResponses is PlumeTickets: respond(bytes32,Attestation,bytes), dispute(bytes32,DisputeClaim,bytes), settleDispute(bytes32,bool), attestationDigest(Attestation), disputeDigest(DisputeClaim), ATTESTATION_TYPEHASH, DISPUTE_TYPEHASH`

A responded ticket closes only when a re-observation proven against a posted `Reobservation` root, for the same source and newer than the response, shows no plume. A persisting plume reopens the ticket with a fresh clock and increments `reopenCount`. Anyone may submit either.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `abstract PlumeResponses is PlumeTickets: respond(bytes32,Attestation,bytes), dispute(bytes32,DisputeClaim,bytes), settleDispute(bytes32,bool), attestationDigest(Attestation), disputeDigest(DisputeClaim), ATTESTATION_TYPEHASH, DISPUTE_TYPEHASH`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/PlumeReobservations.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeReobservations} from "../src/PlumeReobservations.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Reobservation,
    Attestation,
    Ticket,
    BadStatus,
    WrongRootKind,
    InvalidProof,
    SourceMismatch,
    StaleObservation,
    PlumeStillDetected,
    PlumeNotDetected,
    TooManyReopens
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

contract ReobservationsHarness is PlumeReobservations {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

contract PlumeReobservationsTest is Test {
    event Resolved(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, string basis);
    event Reopened(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, uint64 newDeadline);

    ReobservationsHarness internal clock;
    address internal feeder = makeAddr("feeder");
    address internal operator;
    uint256 internal operatorKey;
    bytes32 internal ticketId;
    bytes32 internal snapshotRoot;
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    uint256 internal rootNonce;

    function setUp() public {
        vm.warp(1_800_000_000);
        (operator, operatorKey) = makeAddrAndKey("operatorA");
        clock = new ReobservationsHarness(feeder, makeAddr("arbiter"), payable(makeAddr("fund")), 180, 0.0005 ether);
        SourceRecord memory a = Fixtures.record(SRC_A, 1_761_905_340, 123_491);
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = clock.hashSourceRecord(a);
        snapshotRoot = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(snapshotRoot, RootKind.Snapshot, "test");
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        clock.pledge{value: 0.001 ether}(SRC_A);
        ticketId = clock.openTicket(snapshotRoot, a, new bytes32[](0));
        _respond();
    }

    function _respond() internal {
        Attestation memory att = Attestation({
            ticketId: ticketId,
            cause: "Stuck pressure-relief valve",
            action: "Valve replaced",
            evidenceHash: keccak256("work order")
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(operatorKey, clock.attestationDigest(att));
        clock.respond(ticketId, att, abi.encodePacked(r, s, v));
    }

    /// @dev Posts a fresh two-leaf re-observation root: `obs` plus a unique padding leaf.
    function _postObservation(Reobservation memory obs) internal returns (bytes32 root) {
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = clock.hashReobservation(obs);
        leaves[1] = keccak256(abi.encode("padding", rootNonce++));
        root = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Reobservation, "replayed pass");
    }

    function _proofFor(Reobservation memory obs, bytes32 root) internal view returns (bytes32[] memory) {
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = clock.hashReobservation(obs);
        leaves[1] = keccak256(abi.encode("padding", rootNonce - 1));
        assertEq(MerkleHelper.root(leaves), root);
        return MerkleHelper.proof(leaves, leaves[0]);
    }

    function _obs(bool plume, uint64 at) internal pure returns (Reobservation memory) {
        return Reobservation({
            sourceId: SRC_A,
            observedAt: at,
            plumeDetected: plume,
            basis: plume ? "IMEO persistency_category=persistent" : "IMEO persistency_category=absent"
        });
    }

    function test_resolveWithCleanReobservation() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        vm.warp(1_800_000_090);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Resolved(ticketId, root, 1_800_000_001, obs.basis);
        vm.prank(makeAddr("anyone"));
        clock.resolve(ticketId, root, obs, _proofFor(obs, root));
        Ticket memory t = clock.getTicket(ticketId);
        assertEq(uint8(t.status), uint8(Status.Resolved));
        assertEq(t.closedAt, 1_800_000_090);
        assertEq(clock.activeBondedTicket(SRC_A), bytes32(0));
        assertEq(clock.getBond(SRC_A).amount, 0.001 ether);
    }

    function test_resolveRejectsPlumeStillDetected() public {
        Reobservation memory obs = _obs(true, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(PlumeStillDetected.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_resolveRejectsStaleObservation() public {
        Reobservation memory obs = _obs(false, 1_800_000_000);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(StaleObservation.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_resolveRejectsOtherSource() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        obs.sourceId = bytes32("KAZ_S_003");
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(SourceMismatch.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_resolveRejectsSnapshotRootAndBadProof() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        vm.expectRevert(WrongRootKind.selector);
        clock.resolve(ticketId, snapshotRoot, obs, new bytes32[](0));
        bytes32 root = _postObservation(obs);
        vm.expectRevert(InvalidProof.selector);
        clock.resolve(ticketId, root, obs, new bytes32[](0));
    }

    function test_resolveRejectsWhenNotResponded() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        clock.resolve(ticketId, root, obs, proof);
        vm.expectRevert(BadStatus.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_reopenWhenPlumePersists() public {
        Reobservation memory obs = _obs(true, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        vm.warp(1_800_000_100);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Reopened(ticketId, root, 1_800_000_001, 1_800_000_280);
        clock.reopen(ticketId, root, obs, _proofFor(obs, root));
        Ticket memory t = clock.getTicket(ticketId);
        assertEq(uint8(t.status), uint8(Status.Open));
        assertEq(t.deadline, 1_800_000_280);
        assertEq(t.reopenCount, 1);
        assertEq(clock.activeBondedTicket(SRC_A), ticketId);
    }

    function test_reopenRejectsCleanObservation() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(PlumeNotDetected.selector);
        clock.reopen(ticketId, root, obs, proof);
    }

    function test_respondBlockedAfterMaxReopens() public {
        for (uint64 i = 1; i <= 2; i++) {
            vm.warp(1_800_000_000 + i * 10);
            Reobservation memory obs = _obs(true, uint64(block.timestamp));
            bytes32 root = _postObservation(obs);
            vm.warp(block.timestamp + 1);
            clock.reopen(ticketId, root, obs, _proofFor(obs, root));
            if (i < 2) _respond();
        }
        Attestation memory att =
            Attestation({ticketId: ticketId, cause: "again", action: "again", evidenceHash: bytes32(0)});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(operatorKey, clock.attestationDigest(att));
        vm.expectRevert(TooManyReopens.selector);
        clock.respond(ticketId, att, abi.encodePacked(r, s, v));
    }
}
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `forge test --match-contract PlumeReobservationsTest`
      Expected: FAIL — compiler error: source `contracts/src/PlumeReobservations.sol` not found

- [ ] **Step 3: Minimal implementation**

Create `contracts/src/PlumeReobservations.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PlumeResponses} from "./PlumeResponses.sol";
import {
    Status,
    RootKind,
    Reobservation,
    Ticket,
    BadStatus,
    WrongRootKind,
    InvalidProof,
    SourceMismatch,
    StaleObservation,
    PlumeStillDetected,
    PlumeNotDetected
} from "./PlumeTypes.sol";

/// @title PlumeReobservations
/// @notice A responded ticket closes only when a re-observation (proven against a posted
///         re-observation root, newer than the response) shows no plume; a plume reopens it.
abstract contract PlumeReobservations is PlumeResponses {
    function resolve(bytes32 ticketId, bytes32 root, Reobservation calldata obs, bytes32[] calldata proof) external {
        Ticket storage t = _checkReobservation(ticketId, root, obs, proof);
        if (obs.plumeDetected) revert PlumeStillDetected();
        _close(t, Status.Resolved);
        emit Resolved(ticketId, root, obs.observedAt, obs.basis);
    }

    function reopen(bytes32 ticketId, bytes32 root, Reobservation calldata obs, bytes32[] calldata proof) external {
        Ticket storage t = _checkReobservation(ticketId, root, obs, proof);
        if (!obs.plumeDetected) revert PlumeNotDetected();
        uint64 newDeadline = uint64(block.timestamp) + responseWindow;
        t.status = Status.Open;
        t.deadline = newDeadline;
        t.reopenCount += 1;
        _recordTransition(ticketId);
        emit Reopened(ticketId, root, obs.observedAt, newDeadline);
    }

    function _checkReobservation(bytes32 ticketId, bytes32 root, Reobservation calldata obs, bytes32[] calldata proof)
        internal
        view
        returns (Ticket storage t)
    {
        t = _tickets[ticketId];
        if (t.status != Status.Responded) revert BadStatus();
        if (_roots[root].kind != RootKind.Reobservation) revert WrongRootKind();
        if (!MerkleProof.verifyCalldata(proof, root, hashReobservation(obs))) revert InvalidProof();
        if (obs.sourceId != t.sourceId) revert SourceMismatch();
        if (obs.observedAt <= t.respondedAt) revert StaleObservation();
    }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `forge test --match-contract PlumeReobservationsTest`
      Expected: PASS — `Suite result: ok. 9 passed; 0 failed; 0 skipped`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(contracts): resolve or reopen tickets from re-observations`

### Task 1.8: PlumeClock: permissionless slash and the full money-shot flow

**Files:**
- Create: `contracts/src/PlumeClock.sol`
- Test:   `contracts/test/PlumeClock.t.sol`

**Depends on:** Task 1.7
**Effort:** xhigh
**Model tier:** top
**Provides:** `contract PlumeClock(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is PlumeReobservations: slash(bytes32 ticketId)`
**Requires:** `abstract PlumeReobservations is PlumeResponses: resolve(bytes32 ticketId, bytes32 root, Reobservation obs, bytes32[] proof), reopen(bytes32 ticketId, bytes32 root, Reobservation obs, bytes32[] proof)`, `MitigationFund(address steward_): receive(), disburse(address payable to, uint256 amount, string memo), steward(), totalReceived(), totalDisbursed()`

The concrete contract. `slash` is permissionless: an open bonded ticket past its deadline sends the source's whole bond to the immutable MitigationFund (checks-effects-interactions + `nonReentrant`). The test file also runs the complete money shot (A responds and resolves, B is slashed, A withdraws) and proves a hostile fund that re-enters `slash` from `receive()` makes the slash revert.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `abstract PlumeReobservations is PlumeResponses: resolve(bytes32 ticketId, bytes32 root, Reobservation obs, bytes32[] proof), reopen(bytes32 ticketId, bytes32 root, Reobservation obs, bytes32[] proof)`
- `MitigationFund(address steward_): receive(), disburse(address payable to, uint256 amount, string memo), steward(), totalReceived(), totalDisbursed()`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/PlumeClock.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeClock} from "../src/PlumeClock.sol";
import {MitigationFund} from "../src/MitigationFund.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Reobservation,
    Attestation,
    Ticket,
    BadStatus,
    NotBonded,
    DeadlineNotPassed,
    TransferFailed
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

/// @dev A hostile "fund" that tries to slash a second ticket while receiving the first bond.
contract ReentrantFund {
    PlumeClock public clock;
    bytes32 public target;

    function arm(PlumeClock clock_, bytes32 target_) external {
        clock = clock_;
        target = target_;
    }

    receive() external payable {
        clock.slash(target);
    }
}

contract PlumeClockTest is Test {
    event Slashed(bytes32 indexed ticketId, address indexed operator, uint256 amount, address fund);

    PlumeClock internal clock;
    MitigationFund internal fund;
    address internal deployer = makeAddr("deployer");
    address internal feeder = makeAddr("feeder");
    address internal operatorA;
    uint256 internal keyA;
    address internal operatorB;
    uint256 internal keyB;
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    bytes32 internal constant SRC_B = bytes32("KAZ_S_003");
    bytes32 internal constant SRC_C = bytes32("TKM_S_022");
    bytes32 internal root;
    bytes32 internal ticketA;
    bytes32 internal ticketB;
    bytes32 internal ticketC;
    uint256 internal constant BOND = 0.001 ether;
    SourceRecord[] internal recs;
    bytes32[] internal leaves;

    function setUp() public {
        vm.warp(1_800_000_000);
        (operatorA, keyA) = makeAddrAndKey("operatorA");
        (operatorB, keyB) = makeAddrAndKey("operatorB");
        fund = new MitigationFund(deployer);
        clock = new PlumeClock(feeder, deployer, payable(address(fund)), 180, 0.0005 ether);
        recs.push(Fixtures.record(SRC_A, 1_761_905_340, 123_491));
        recs.push(Fixtures.record(SRC_B, 1_780_217_349, 7_847));
        recs.push(Fixtures.record(SRC_C, 1_786_000_000, 12_080));
        for (uint256 i = 0; i < 3; i++) {
            leaves.push(clock.hashSourceRecord(recs[i]));
        }
        root = MerkleHelper.root(leaves);
        vm.deal(operatorA, 1 ether);
        vm.deal(operatorB, 1 ether);
        vm.prank(operatorA);
        clock.pledge{value: BOND}(SRC_A);
        vm.prank(operatorB);
        clock.pledge{value: BOND}(SRC_B);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "imeo snapshot");
        ticketA = clock.openTicket(root, recs[0], MerkleHelper.proof(leaves, leaves[0]));
        ticketB = clock.openTicket(root, recs[1], MerkleHelper.proof(leaves, leaves[1]));
        ticketC = clock.openTicket(root, recs[2], MerkleHelper.proof(leaves, leaves[2]));
    }

    function test_slashAfterDeadlineMovesBondToFund() public {
        vm.warp(1_800_000_181);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Slashed(ticketB, operatorB, BOND, address(fund));
        vm.prank(makeAddr("anyone"));
        clock.slash(ticketB);
        Ticket memory t = clock.getTicket(ticketB);
        assertEq(uint8(t.status), uint8(Status.Slashed));
        assertEq(t.slashedAmount, BOND);
        assertEq(t.closedAt, 1_800_000_181);
        assertEq(address(fund).balance, BOND);
        assertEq(fund.totalReceived(), BOND);
        assertEq(clock.getBond(SRC_B).operator, address(0));
        assertEq(clock.getBond(SRC_B).amount, 0);
        assertEq(clock.activeBondedTicket(SRC_B), bytes32(0));
        assertEq(address(clock).balance, BOND);
    }

    function test_slashCannotBeReenteredFromTheFund() public {
        ReentrantFund evil = new ReentrantFund();
        PlumeClock clock2 = new PlumeClock(feeder, deployer, payable(address(evil)), 180, 0.0005 ether);
        vm.prank(operatorA);
        clock2.pledge{value: BOND}(SRC_A);
        vm.prank(operatorB);
        clock2.pledge{value: BOND}(SRC_B);
        vm.prank(feeder);
        clock2.postRoot(root, RootKind.Snapshot, "imeo snapshot");
        bytes32 a2 = clock2.openTicket(root, recs[0], MerkleHelper.proof(leaves, leaves[0]));
        bytes32 b2 = clock2.openTicket(root, recs[1], MerkleHelper.proof(leaves, leaves[1]));
        evil.arm(clock2, b2);
        vm.warp(1_800_000_181);
        vm.expectRevert(TransferFailed.selector);
        clock2.slash(a2);
        assertEq(address(evil).balance, 0);
        assertEq(address(clock2).balance, 2 * BOND);
        assertEq(uint8(clock2.getTicket(a2).status), uint8(Status.Open));
        assertEq(uint8(clock2.getTicket(b2).status), uint8(Status.Open));
    }

    function test_slashRejectsAtOrBeforeDeadline() public {
        vm.warp(1_800_000_180);
        vm.expectRevert(DeadlineNotPassed.selector);
        clock.slash(ticketB);
    }

    function test_slashRejectsUnbondedTicket() public {
        vm.warp(1_800_000_181);
        vm.expectRevert(NotBonded.selector);
        clock.slash(ticketC);
    }

    function test_slashRejectsRespondedAndRepeatedSlash() public {
        Attestation memory att =
            Attestation({ticketId: ticketA, cause: "valve", action: "replaced", evidenceHash: keccak256("wo")});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(keyA, clock.attestationDigest(att));
        clock.respond(ticketA, att, abi.encodePacked(r, s, v));
        vm.warp(1_800_000_181);
        vm.expectRevert(BadStatus.selector);
        clock.slash(ticketA);
        clock.slash(ticketB);
        vm.expectRevert(BadStatus.selector);
        clock.slash(ticketB);
    }

    function test_moneyShotFlow() public {
        // Operator A answers within the clock and a replayed pass shows no plume.
        Attestation memory att = Attestation({
            ticketId: ticketA,
            cause: "Stuck pressure-relief valve",
            action: "Valve replaced and line re-pressurised",
            evidenceHash: keccak256("work order 4711")
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(keyA, clock.attestationDigest(att));
        vm.warp(1_800_000_030);
        clock.respond(ticketA, att, abi.encodePacked(r, s, v));
        Reobservation memory obs = Reobservation({
            sourceId: SRC_A,
            observedAt: 1_800_000_031,
            plumeDetected: false,
            basis: "IMEO persistency_category=absent"
        });
        bytes32[] memory obsLeaves = new bytes32[](1);
        obsLeaves[0] = clock.hashReobservation(obs);
        vm.prank(feeder);
        clock.postRoot(obsLeaves[0], RootKind.Reobservation, "replayed pass");
        vm.warp(1_800_000_040);
        clock.resolve(ticketA, obsLeaves[0], obs, new bytes32[](0));
        // Operator B stays silent; the clock runs out and anyone slashes.
        vm.warp(1_800_000_181);
        clock.slash(ticketB);
        assertEq(uint8(clock.getTicket(ticketA).status), uint8(Status.Resolved));
        assertEq(uint8(clock.getTicket(ticketB).status), uint8(Status.Slashed));
        assertEq(uint8(clock.getTicket(ticketC).status), uint8(Status.Open));
        assertEq(address(fund).balance, BOND);
        // A's bond is free again once its ticket closed.
        uint256 before = operatorA.balance;
        vm.prank(operatorA);
        clock.withdrawBond(SRC_A);
        assertEq(operatorA.balance, before + BOND);
        assertEq(address(clock).balance, 0);
    }
}
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `forge test --match-contract PlumeClockTest`
      Expected: FAIL — compiler error: source `contracts/src/PlumeClock.sol` not found

- [ ] **Step 3: Minimal implementation**

Create `contracts/src/PlumeClock.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PlumeBase} from "./PlumeBase.sol";
import {PlumeReobservations} from "./PlumeReobservations.sol";
import {Status, Ticket, BadStatus, NotBonded, DeadlineNotPassed, TransferFailed} from "./PlumeTypes.sol";

/// @title PlumeClock
/// @notice Every satellite-detected methane super-emitter opens an on-chain ticket with a public
///         response clock. Signed repair attestations plus a clean re-observation close it; when a
///         bonded operator ignores the clock, anyone can slash the bond to the mitigation fund.
contract PlumeClock is PlumeReobservations {
    constructor(
        address feeder_,
        address arbiter_,
        address payable mitigationFund_,
        uint64 responseWindow_,
        uint256 minBond_
    ) PlumeBase(feeder_, arbiter_, mitigationFund_, responseWindow_, minBond_) {}

    /// @notice Permissionless deadline enforcement: an open bonded ticket past its deadline sends the
    ///         operator's whole source bond to the mitigation fund.
    function slash(bytes32 ticketId) external nonReentrant {
        Ticket storage t = _tickets[ticketId];
        if (t.status != Status.Open) revert BadStatus();
        if (t.operator == address(0)) revert NotBonded();
        if (block.timestamp <= t.deadline) revert DeadlineNotPassed();
        uint256 amount = _bonds[t.sourceId].amount;
        delete _bonds[t.sourceId];
        t.slashedAmount = amount;
        _close(t, Status.Slashed);
        emit Slashed(ticketId, t.operator, amount, mitigationFund);
        (bool ok,) = mitigationFund.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `forge test --match-contract PlumeClockTest`
      Expected: PASS — `Suite result: ok. 6 passed; 0 failed; 0 skipped`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(contracts): permissionless slash into the mitigation fund`

### Task 1.9: Invariant suite for bond and fund accounting

**Files:**
- Test:   `contracts/test/PlumeClockInvariant.t.sol`

**Depends on:** Task 1.8
**Effort:** high
**Model tier:** top
**Provides:** `PlumeClockInvariantTest: balance == sum of bonds; fund == slashed bonds; active slots point to live bonded tickets; closed tickets never change`
**Requires:** `contract PlumeClock(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is PlumeReobservations: slash(bytes32 ticketId)`

A handler drives random pledge / withdraw / open / respond / resolve / dispute-and-settle / slash / time-warp sequences over 4 sources x 2 detections, keeps ghost totals, and snapshots each ticket the moment it closes. Four invariants must hold for every run: contract balance == sum of bonds, the fund holds exactly the slashed bonds, active slots point only to live bonded tickets, and a closed ticket never changes again. This task adds a test only; the contracts must already satisfy it.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `contract PlumeClock(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is PlumeReobservations: slash(bytes32 ticketId)`

- [ ] **Step 1: Write the failing test**

Create `contracts/test/PlumeClockInvariant.t.sol` with exactly this content:

````solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeClock} from "../src/PlumeClock.sol";
import {MitigationFund} from "../src/MitigationFund.sol";
import {
    Status, RootKind, SourceRecord, Reobservation, Attestation, DisputeClaim, Ticket, Bond
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

/// @notice Drives random pledge / withdraw / open / respond / resolve / dispute / slash / warp
///         sequences, keeps ghost balances, and snapshots every ticket the moment it closes.
contract PlumeHandler is Test {
    PlumeClock public immutable clock;
    address internal immutable feeder;
    address internal immutable arbiter;
    uint256 public ghostBondSum;
    uint256 public ghostSlashed;
    bytes32[] public closedIds;
    mapping(bytes32 ticketId => bytes32 snapshotHash) public closedHash;

    SourceRecord[] internal recs;
    bytes32[] internal leaves;
    bytes32 public root;
    bytes32[4] public sources = [bytes32("SRC_0"), bytes32("SRC_1"), bytes32("SRC_2"), bytes32("SRC_3")];
    address[3] internal operators;
    uint256[3] internal keys;

    constructor(PlumeClock clock_, address feeder_, address arbiter_) {
        clock = clock_;
        feeder = feeder_;
        arbiter = arbiter_;
        for (uint256 i = 0; i < 3; i++) {
            (operators[i], keys[i]) = makeAddrAndKey(string(abi.encodePacked("op", vm.toString(i))));
        }
        for (uint256 s = 0; s < 4; s++) {
            for (uint64 d = 0; d < 2; d++) {
                SourceRecord memory rec = Fixtures.record(sources[s], 1_700_000_000 + d * 1000, uint32(1000 + s));
                recs.push(rec);
                leaves.push(clock.hashSourceRecord(rec));
            }
        }
        root = MerkleHelper.root(leaves);
    }

    function sourceCount() external pure returns (uint256) {
        return 4;
    }

    function closedCount() external view returns (uint256) {
        return closedIds.length;
    }

    function _idFor(uint256 seed) internal view returns (bytes32) {
        uint256 i = seed % recs.length;
        return clock.ticketIdFor(recs[i].sourceId, recs[i].lastPlumeAt);
    }

    function _find(bytes32 id) internal view returns (bool found, Ticket memory t) {
        Ticket[] memory page = clock.getTickets(0, 64);
        for (uint256 k = 0; k < page.length; k++) {
            if (page[k].id == id) return (true, page[k]);
        }
    }

    function _keyOf(address operator) internal view returns (uint256 key) {
        for (uint256 o = 0; o < 3; o++) {
            if (operators[o] == operator) key = keys[o];
        }
    }

    function _recordClosed(bytes32 id) internal {
        if (closedHash[id] != bytes32(0)) return;
        closedIds.push(id);
        closedHash[id] = keccak256(abi.encode(clock.getTicket(id)));
    }

    function pledge(uint256 opSeed, uint256 srcSeed, uint256 amount) external {
        address op = operators[opSeed % 3];
        bytes32 src = sources[srcSeed % 4];
        amount = bound(amount, clock.minBond(), 0.01 ether);
        Bond memory b = clock.getBond(src);
        if (b.operator != address(0) && b.operator != op) return;
        vm.deal(op, op.balance + amount);
        vm.prank(op);
        clock.pledge{value: amount}(src);
        ghostBondSum += amount;
    }

    function withdraw(uint256 srcSeed) external {
        bytes32 src = sources[srcSeed % 4];
        Bond memory b = clock.getBond(src);
        if (b.operator == address(0) || clock.activeBondedTicket(src) != bytes32(0)) return;
        vm.prank(b.operator);
        clock.withdrawBond(src);
        ghostBondSum -= b.amount;
    }

    function open(uint256 recSeed) external {
        uint256 i = recSeed % recs.length;
        try clock.openTicket(root, recs[i], MerkleHelper.proof(leaves, leaves[i])) {} catch {}
    }

    function respond(uint256 recSeed) external {
        bytes32 id = _idFor(recSeed);
        (bool found, Ticket memory t) = _find(id);
        if (!found || t.status != Status.Open || t.operator == address(0) || block.timestamp > t.deadline) return;
        if (t.reopenCount >= clock.MAX_REOPENS()) return;
        Attestation memory att = Attestation({ticketId: id, cause: "c", action: "a", evidenceHash: bytes32(0)});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_keyOf(t.operator), clock.attestationDigest(att));
        clock.respond(id, att, abi.encodePacked(r, s, v));
    }

    function resolve(uint256 recSeed) external {
        bytes32 id = _idFor(recSeed);
        (bool found, Ticket memory t) = _find(id);
        if (!found || t.status != Status.Responded) return;
        if (block.timestamp <= t.respondedAt) vm.warp(t.respondedAt + 1);
        Reobservation memory obs =
            Reobservation({sourceId: t.sourceId, observedAt: uint64(block.timestamp), plumeDetected: false, basis: "inv"});
        bytes32 obsRoot = clock.hashReobservation(obs);
        if (clock.rootInfo(obsRoot).kind == RootKind.None) {
            vm.prank(feeder);
            clock.postRoot(obsRoot, RootKind.Reobservation, "invariant replay");
        }
        clock.resolve(id, obsRoot, obs, new bytes32[](0));
        _recordClosed(id);
    }

    function disputeAndSettle(uint256 recSeed, bool upheld) external {
        bytes32 id = _idFor(recSeed);
        (bool found, Ticket memory t) = _find(id);
        if (!found || t.status != Status.Open || t.operator == address(0) || block.timestamp > t.deadline) return;
        DisputeClaim memory claim = DisputeClaim({ticketId: id, reason: "misattributed", evidenceHash: bytes32(0)});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_keyOf(t.operator), clock.disputeDigest(claim));
        clock.dispute(id, claim, abi.encodePacked(r, s, v));
        vm.prank(arbiter);
        clock.settleDispute(id, upheld);
        if (upheld) _recordClosed(id);
    }

    function slash(uint256 recSeed) external {
        uint256 i = recSeed % recs.length;
        bytes32 id = clock.ticketIdFor(recs[i].sourceId, recs[i].lastPlumeAt);
        uint256 amount = clock.getBond(recs[i].sourceId).amount;
        try clock.slash(id) {
            ghostBondSum -= amount;
            ghostSlashed += amount;
            _recordClosed(id);
        } catch {}
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 400));
    }
}

contract PlumeClockInvariantTest is Test {
    PlumeClock internal clock;
    MitigationFund internal fund;
    PlumeHandler internal handler;

    function setUp() public {
        vm.warp(1_800_000_000);
        address feeder = makeAddr("feeder");
        address arbiter = makeAddr("arbiter");
        fund = new MitigationFund(makeAddr("steward"));
        clock = new PlumeClock(feeder, arbiter, payable(address(fund)), 180, 0.0005 ether);
        handler = new PlumeHandler(clock, feeder, arbiter);
        bytes32 snapshotRoot = handler.root();
        vm.prank(feeder);
        clock.postRoot(snapshotRoot, RootKind.Snapshot, "invariant snapshot");
        targetContract(address(handler));
    }

    function invariant_contractBalanceEqualsSumOfBonds() public view {
        assertEq(address(clock).balance, handler.ghostBondSum());
    }

    function invariant_fundHoldsExactlyTheSlashedBonds() public view {
        assertEq(address(fund).balance, handler.ghostSlashed());
        assertEq(fund.totalReceived(), handler.ghostSlashed());
    }

    function invariant_activeSlotsPointToLiveBondedTickets() public view {
        for (uint256 s = 0; s < handler.sourceCount(); s++) {
            bytes32 src = handler.sources(s);
            bytes32 id = clock.activeBondedTicket(src);
            if (id == bytes32(0)) continue;
            Ticket memory t = clock.getTicket(id);
            assertEq(t.sourceId, src);
            assertTrue(t.operator != address(0));
            assertTrue(t.status == Status.Open || t.status == Status.Responded || t.status == Status.Disputed);
        }
    }

    function invariant_closedTicketsNeverChange() public view {
        for (uint256 k = 0; k < handler.closedCount(); k++) {
            bytes32 id = handler.closedIds(k);
            assertEq(keccak256(abi.encode(clock.getTicket(id))), handler.closedHash(id));
        }
    }
}
````

- [ ] **Step 2: Run to confirm it passes (gate)**
      Run: `forge test --match-contract PlumeClockInvariantTest`
      Expected: PASS — `Suite result: ok. 4 passed; 0 failed; 0 skipped` (each invariant line shows `runs: 64, calls: 2048`)

- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `test(contracts): invariant suite for bond and fund accounting`

### Task 1.10: Export the contract ABIs to TypeScript

**Files:**
- Create: `scripts/export-abi.ts`
- Create: `src/lib/abi.generated.ts`
- Test:   `test/abi.test.ts`

**Depends on:** Task 1.8
**Effort:** low
**Model tier:** fast
**Provides:** `src/lib/abi.generated.ts: export const plumeClockAbi, export const mitigationFundAbi (as const, generated from the Foundry artifacts)`
**Requires:** `contract PlumeClock(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is PlumeReobservations: slash(bytes32 ticketId)`, `MitigationFund(address steward_): receive(), disburse(address payable to, uint256 amount, string memo), steward(), totalReceived(), totalDisbursed()`

The dashboard and scripts type their viem calls from a generated ABI module, never a hand-written ABI. `npm run abi` builds the contracts and writes `src/lib/abi.generated.ts` from the Foundry artifacts; the test proves the committed file equals the artifacts.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `contract PlumeClock(address feeder_, address arbiter_, address payable mitigationFund_, uint64 responseWindow_, uint256 minBond_) is PlumeReobservations: slash(bytes32 ticketId)`
- `MitigationFund(address steward_): receive(), disburse(address payable to, uint256 amount, string memo), steward(), totalReceived(), totalDisbursed()`

- [ ] **Step 1: Write the failing test**

Create `test/abi.test.ts` with exactly this content:

````ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mitigationFundAbi, plumeClockAbi } from '../src/lib/abi.generated';

function artifactAbi(path: string): unknown {
  return (JSON.parse(readFileSync(path, 'utf8')) as { abi: unknown }).abi;
}

describe('src/lib/abi.generated.ts', () => {
  it('equals the PlumeClock Foundry artifact ABI', () => {
    expect(JSON.parse(JSON.stringify(plumeClockAbi))).toEqual(artifactAbi('contracts/out/PlumeClock.sol/PlumeClock.json'));
  });

  it('equals the MitigationFund Foundry artifact ABI', () => {
    expect(JSON.parse(JSON.stringify(mitigationFundAbi))).toEqual(
      artifactAbi('contracts/out/MitigationFund.sol/MitigationFund.json'),
    );
  });

  it('exposes every function the scripts and dashboard call', () => {
    const names = plumeClockAbi.filter((i) => i.type === 'function').map((i) => i.name);
    for (const fn of [
      'postRoot',
      'pledge',
      'withdrawBond',
      'openTicket',
      'openTickets',
      'respond',
      'dispute',
      'settleDispute',
      'resolve',
      'reopen',
      'slash',
      'getTickets',
      'getTicket',
      'ticketCount',
      'getBond',
      'rootInfo',
      'getTransitionBlocks',
      'attestationDigest',
      'hashSourceRecord',
      'responseWindow',
    ]) {
      expect(names).toContain(fn);
    }
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run test:abi`
      Expected: FAIL — vitest cannot resolve `../src/lib/abi.generated`

- [ ] **Step 3: Minimal implementation**

Create `scripts/export-abi.ts` with exactly this content:

````ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function readAbi(path: string): unknown[] {
  const artifact = JSON.parse(readFileSync(path, 'utf8')) as { abi?: unknown };
  if (!Array.isArray(artifact.abi)) throw new Error(`No abi array in ${path} (run forge build first)`);
  return artifact.abi;
}

const plumeClockAbi = readAbi('contracts/out/PlumeClock.sol/PlumeClock.json');
const mitigationFundAbi = readAbi('contracts/out/MitigationFund.sol/MitigationFund.json');
const source = [
  '// Generated by scripts/export-abi.ts from the Foundry artifacts. Do not edit by hand: run `npm run abi`.',
  `export const plumeClockAbi = ${JSON.stringify(plumeClockAbi, null, 2)} as const;`,
  '',
  `export const mitigationFundAbi = ${JSON.stringify(mitigationFundAbi, null, 2)} as const;`,
  '',
].join('\n');
mkdirSync('src/lib', { recursive: true });
writeFileSync('src/lib/abi.generated.ts', source);
console.log(`Wrote src/lib/abi.generated.ts (${plumeClockAbi.length} PlumeClock + ${mitigationFundAbi.length} MitigationFund ABI items)`);
````

Generate the ABI module (do not hand-edit it; it is about 1,880 lines):

      Run: `npm run abi`
      Expected: `Wrote src/lib/abi.generated.ts (80 PlumeClock + 12 MitigationFund ABI items)`

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run test:abi`
      Expected: PASS — vitest reports `Test Files  1 passed (1)` and `Tests  3 passed (3)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat: export PlumeClock and MitigationFund ABIs to TypeScript`
