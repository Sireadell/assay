// Builds the transaction a visitor's wallet sends to stamp a verdict on Arc.
// Pure functions, no libraries, so the browser page and the tests share them.

export const STAMP_CONTRACT = '0x208F3477d9073085C455bDa460F4cBd65dA7C20c';
export const EXPLORER = 'https://explorer.arc.io';
export const ARC_CHAIN = {
  chainId: '0x13b2', // 5042
  chainName: 'Arc Mainnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.arc.io'],
  blockExplorerUrls: [EXPLORER],
};

// stamp(bytes32,address,uint8) selector
const SELECTOR = '0x4addd6fd';

// Codes the contract accepts. Verdicts that are not final (pending, cannot
// verify, wrong chain) have no code and cannot be stamped.
export const STAMP_CODE = { PAID: 1, NOT_PAID: 2, FAKE_TOKEN: 3, PARTIAL: 4, OVERPAID: 5 };

export function stampData(txHash, seller, verdict) {
  const code = STAMP_CODE[verdict];
  if (!code) throw new Error('This verdict cannot be stamped.');
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error('Bad transaction hash.');
  if (!/^0x[0-9a-fA-F]{40}$/.test(seller)) throw new Error('Bad seller address.');
  return (
    SELECTOR +
    txHash.slice(2).toLowerCase() +
    seller.slice(2).toLowerCase().padStart(64, '0') +
    code.toString(16).padStart(64, '0')
  );
}

// Arc silently drops payments with a fee cap under 20 gwei, so ask for 25.
export function stampTx(from, txHash, seller, verdict) {
  return { from, to: STAMP_CONTRACT, data: stampData(txHash, seller, verdict), gasPrice: '0x5d21dba00' };
}
