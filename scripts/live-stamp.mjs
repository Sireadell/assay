// Sends one real stamp to the deployed contract and reads it back.
import { readFileSync } from 'node:fs';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
const m = readFileSync(process.env.KEY_ENV_FILE, 'utf8').match(/^MINER_PRIVATE_KEY=(.*)$/m);
let key = m[1].trim().replace(/^["']|["']$/g, ''); if (!key.startsWith('0x')) key = '0x' + key;
const { abi } = JSON.parse(readFileSync(new URL('../build/TruePaidStamp.json', import.meta.url)));
const dep = JSON.parse(readFileSync(new URL('../deployment.json', import.meta.url)));
const provider = new JsonRpcProvider('https://rpc.mainnet.arc.io', 5042, { staticNetwork: true });
const w = new Wallet(key, provider);
const c = new Contract(dep.address, abi, w);
const hash = JSON.parse(readFileSync(new URL('../test/fixtures/real.tx.json', import.meta.url))).hash;
const seller = '0x8366a39cc670b4001a1121b8f6a443a643e40951';
const tx = await c.stamp(hash, seller, 1, { gasPrice: 25_000_000_000n });
const r = await tx.wait();
const got = await c.stamps(hash, seller, w.address);
console.log({ stampTx: r.hash, gasUsed: r.gasUsed.toString(), verdict: got.verdict.toString(), time: got.time.toString() });
let bad = 'no revert'; try { await c.stamp.staticCall(hash, seller, 9); } catch (e) { bad = e.reason || e.shortMessage; }
console.log('verdict 9 rejected:', bad);
