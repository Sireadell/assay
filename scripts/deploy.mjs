// Deploys TruePaidStamp to Arc mainnet. The key is read from the .env file named
// in KEY_ENV_FILE (variable MINER_PRIVATE_KEY) and is never printed or saved here.
// Usage: KEY_ENV_FILE=path node scripts/deploy.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { JsonRpcProvider, Wallet, ContractFactory } from 'ethers';

const RPC = 'https://rpc.mainnet.arc.io';
const m = readFileSync(process.env.KEY_ENV_FILE, 'utf8').match(/^MINER_PRIVATE_KEY=(.*)$/m);
let key = m[1].trim().replace(/^["']|["']$/g, '');
if (!key.startsWith('0x')) key = '0x' + key;

const { abi, bytecode } = JSON.parse(readFileSync(new URL('../build/TruePaidStamp.json', import.meta.url)));
const provider = new JsonRpcProvider(RPC, 5042, { staticNetwork: true });
const wallet = new Wallet(key, provider);
const before = await provider.getBalance(wallet.address);
const factory = new ContractFactory(abi, bytecode, wallet);
const c = await factory.deploy({ gasPrice: 25_000_000_000n });
const rcpt = await c.deploymentTransaction().wait();
const after = await provider.getBalance(wallet.address);
const info = {
  address: await c.getAddress(),
  deployTx: rcpt.hash,
  block: rcpt.blockNumber,
  deployer: wallet.address,
  gasUsed: rcpt.gasUsed.toString(),
  costUsdc: Number(before - after) / 1e18,
  chainId: 5042,
};
writeFileSync(new URL('../deployment.json', import.meta.url), JSON.stringify(info, null, 2));
console.log(info);
