# TruePaid

Did you really get paid in USDC on Arc, or in a fake token with the same name?

Paste a transaction hash and your Arc address. TruePaid gives one answer: **PAID**, **PARTLY PAID**, **NOT PAID**, or **NOT PAID: FAKE TOKEN**.

## Why this exists

Arc's block explorer shows a lookalike token transfer as "Transfer 20 USDC". Look at transaction `0x4a36399e8e34ebdcba92cee84ff0a1dc574ee03086d99ca14197ba2adcbfab85`. The seller `0xad3cd9a7995c2895ce41f9c0220deb344173ba4b` received 20 of a token that only copies the name. It is not real USDC. Someone new to digital currency would call that payment complete and hand over the goods.

TruePaid reads the same transaction and says: NOT PAID: FAKE TOKEN.

## What it checks

| Check | How |
|---|---|
| Real USDC, not a lookalike | Only the real USDC contract on Arc mainnet counts (`0x3600000000000000000000000000000000000000`). A real USDC move also writes a second log from the system address `0xfffffffffffffffffffffffffffffffffffffffe`, and plain sends write only that one. TruePaid counts both without double counting. |
| Right recipient | Only transfers to the address you typed count. |
| Right amount | Optional. Type the USDC amount, or a naira price and today's rate, and it says PAID, PARTLY PAID or OVERPAID. |
| Confirmed | A failed or missing transaction is not PAID. |

| Also | How |
|---|---|
| EURC sent instead of USDC | Real EURC (`0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1`) is called out as "PAID IN EURC, NOT USDC", not as a fake. |
| Proof link | `/p/<hash>?seller=<address>` shows the verdict to anyone. It re-reads the chain every time it is opened. Nothing is stored on a server. |
| WhatsApp share | One tap sends the verdict and the proof link. |
| Payment link for sellers | A seller makes a link with their address, the amount and what it's for. The buyer opens it, pays, pastes the hash and gets a proof link to send back. Everything lives inside the link. |
| Pasted explorer links | Paste `https://explorer.arc.io/tx/0x...` and TruePaid pulls the hash out. |
| Why a fake is fake | The fake-token verdict links to the fake token on the explorer and says where real USDC lives. |

## The stamp on Arc

After a check you can press "Stamp this verdict on Arc". Your wallet sends one small transaction (about 0.001 USDC) to the TruePaidStamp contract. It pins one line on the chain: this transaction, to this seller, got this verdict.

| Item | Value |
|---|---|
| Contract | `0x208F3477d9073085C455bDa460F4cBd65dA7C20c` on Arc mainnet (chain 5042) |
| Explorer | https://explorer.arc.io/address/0x208F3477d9073085C455bDa460F4cBd65dA7C20c |
| Source | `contracts/TruePaidStamp.sol`, verified on the explorer (solc 0.8.26, optimizer 200 runs) |
| Owner, upgrades, fees | None |
| Deploy tx | `0xda0d1bed5371435e56456733b086b9da735c2d8e7c760dbb47bf431647d26f5c` |

Anyone can stamp, so a stamp records who made the claim, not that the claim is true. The checker page recomputes the verdict from the chain every time.

## Why Arc

| Reason | Detail |
|---|---|
| USDC is the gas coin | A normal user holds only USDC, so one balance pays for the payment and the stamp. |
| The system log pair identifies real USDC | This is the signal that separates a real transfer from a lookalike. |
| Cheap | A stamp costs about 0.001 USDC. |

## What it cannot do

- It cannot tell you whether the goods or service were delivered.
- It cannot reverse a payment.
- It reads one transaction only. It does not see other payments, or chain history.
- A payment that was dropped by the network (Arc silently drops fee caps under 20 gwei) shows up as "cannot verify".
- A naira price is converted with a rate you type. It is not a live price.

## Related tools

| Tool | What it does | What TruePaid does differently |
|---|---|---|
| [Arc explorer](https://explorer.arc.io) | Shows every Arc transaction and headlines most with a summary like "Transfer 20 USDC", using the token's own name. | TruePaid checks the token contract against real USDC and gives one verdict for a named seller. The explorer calls the fake-token example above a 20 USDC transfer. |
| [Payproof](https://github.com/Kriptoboss/payproof) | Invoicing on Arc: make an invoice link, get paid, give the client a receipt anyone can check. Its "Verify a payment" mode rebuilds a receipt from a transaction hash. From its source (checked 2026-10-05): it only accepts the real USDC and EURC contracts, so a fake token gets "no transfer found"; it reads the first transfer only; it does not check who received the money; it does not see plain USDC sends (the ones that only write the system log); and it runs on Arc Testnet. | TruePaid names the fake and says NOT PAID: FAKE TOKEN, checks the money reached the right seller, counts plain USDC sends, and runs on mainnet. TruePaid's payment link borrows Payproof's good idea of keeping everything inside the link. |

## Run it

```
npm install
npm test
node src/server.js          # page at http://localhost:8787
node src/cli.js <hash> <seller>
```

| File | Purpose |
|---|---|
| `src/verdict.js` | The verdict engine. Pure functions, no network. |
| `src/arcRpc.js` | Reads a transaction from Arc mainnet. |
| `src/server.js` | Serves the page, `/api/check` and the proof link. |
| `src/share.js` | Proof, WhatsApp and payment request links. |
| `src/naira.js` | Naira to USDC with a rate the user types. |
| `src/stamp.js` | Builds the stamp transaction for the visitor's wallet. |
| `contracts/TruePaidStamp.sol` | The stamp contract. |
| `scripts/` | Compile, deploy and a live stamp check. |
| `test/` | 28 tests, including two real Arc mainnet transactions saved as fixtures. |

## License

MIT
