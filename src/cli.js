// Usage: node src/cli.js <txHash> <sellerAddress> [expectedUsdc]
import { checkPayment } from './check.js';

const [hash, seller, expected] = process.argv.slice(2);
if (!/^0x[0-9a-fA-F]{64}$/.test(hash || '') || !seller) {
  console.error('Usage: node src/cli.js <txHash> <sellerAddress> [expectedUsdc]');
  process.exit(2);
}
console.log(JSON.stringify(await checkPayment(hash, seller, expected), null, 2));
