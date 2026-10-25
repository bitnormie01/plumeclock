# PlumeClock architecture at a glance

```mermaid
flowchart TB
    classDef data fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px,color:#1b1b1b;
    classDef app fill:#e3f2fd,stroke:#1565c0,stroke-width:1px,color:#1b1b1b;
    classDef chain fill:#fff3e0,stroke:#ef6c00,stroke-width:1px,color:#1b1b1b;
    classDef action fill:#f3e5f5,stroke:#6a1b9a,stroke-width:1px,color:#1b1b1b;
    classDef risk fill:#ffebee,stroke:#c62828,stroke-width:1px,color:#1b1b1b;

    subgraph IMEO["UNEP IMEO / MARS public data"]
        D1["Detected plume zip"]
        D2["Country response-rate zip"]
    end

    subgraph PIPE["Data pipeline"]
        P1["npm run pin\nstore immutable zips + provenance"]
        P2["npm run fixtures\nbuild snapshot + Merkle root + proofs"]
        P3["npm run notices\nAI / fallback notices"]
    end

    subgraph CHAIN["On-chain system"]
        C1["PlumeClock\nroot registry + tickets"]
        C2["MitigationFund\nslash receiver"]
        C3["Operators\npledge bond + sign response"]
        C4["Anyone\nopen / resolve / slash"]
    end

    subgraph UI["Frontend dashboard"]
        U1["Next.js static app"]
        U2["Map + ticket list + live clock"]
        U3["Explorer links + proof verify"]
    end

    subgraph OPS["Operations / demo"]
        O1["Deploy script\nBase Sepolia / anvil"]
        O2["Demo script\nopens tickets, resolves, slashes"]
    end

    D1 --> P1
    D2 --> P1
    P1 --> P2
    P2 --> P3

    P2 -->|"publish root / open tickets"| C1
    P3 --> U1
    C1 -->|"read state + logs"| U1
    C1 -->|"bond transfers"| C2
    C3 -->|"respond / dispute"| C1
    C4 -->|"resolve / reopen / slash"| C1

    U1 --> U2
    U1 --> U3

    O1 --> C1
    O1 --> C2
    O2 --> C1

    C1 -->|"event stream"| U2
    U2 -->|"verify proofs"| C1

    class D1,D2 data
    class P1,P2,P3 data
    class C1,C2,C3,C4 chain
    class U1,U2,U3 app
    class O1,O2 action
```

## What this means

- Public IMEO/MARS methane alerts are pinned and provenance-checked.
- The data pipeline turns those records into a Merkle snapshot plus proofs.
- Smart contracts enforce ticket lifecycle: open, respond, resolve, reopen, slash.
- The dashboard reads on-chain state and displays it to the public in real time.
- Demo and deploy scripts replay the end-to-end flow without needing a real production operator.

## Simplified lifecycle

```mermaid
sequenceDiagram
    participant I as IMEO data
    participant P as Pin + Fixtures
    participant C as PlumeClock contract
    participant O as Operator
    participant U as Public dashboard

    I->>P: Detect plume and response stats
    P->>C: Post Merkle root
    U->>C: Load ticket state
    O->>C: Pledge bond + open ticket
    O->>C: Sign response attestation
    C-->>U: Update live clock + status
    U->>C: Verify proof and explorer links
    alt Re-observation shows no plume
        C-->>U: Ticket resolves
    else Missed deadline
        Anyone->>C: Slash bond
        C-->>U: Bond moved to mitigation fund
    end
```

## File map

- `contracts/` — Solidity smart contracts
- `src/` — Next.js dashboard app
- `public/data/` — generated fixtures, proofs, notices
- `data/imeo/` — pinned IMEO source data and provenance
- `scripts/` — deploy, fixtures, demo automation
- `docs/` — architecture, security, impact documentation
- `demo/` — video/demo tooling and generated visuals

## One-line summary

PlumeClock turns public methane alerts into transparent on-chain tickets, and the whole project is a tight loop: public data → pinned snapshot → smart contracts → public dashboard → mitigation through slashing.
