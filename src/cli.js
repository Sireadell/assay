// Usage: node src/cli.js <txHash> <sellerAddress> [expectedUsdc]
import { fetchPayment } from './arcRpc.js';
import { decide } from './verdict.js';

const [hash, seller, expected] = process.argv.slice(2);
if (!/^0x[0-9a-fA-F]{64}$/.test(hash || '') || !seller) {
  console.error('Usage: node src/cli.js <txHash> <sellerAddress> [expectedUsdc]');
  process.exit(2);
}
const p = await fetchPayment(hash);
console.log(JSON.stringify(decide({ ...p, seller, expected }), null, 2));
