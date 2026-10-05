import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Interface } from 'ethers';
import { stampData, stampTx, STAMP_CODE, STAMP_CONTRACT } from '../src/stamp.js';

const abi = JSON.parse(readFileSync(new URL('../build/TruePaidStamp.json', import.meta.url))).abi;
const iface = new Interface(abi);
const hash = '0x' + 'ab'.repeat(32);
const seller = '0x8366a39cc670b4001a1121b8f6a443a643e40951';

test('stamp data matches what the compiled contract expects', () => {
  for (const [name, code] of Object.entries(STAMP_CODE)) {
    const data = stampData(hash, seller, name);
    const parsed = iface.parseTransaction({ data });
    assert.equal(parsed.name, 'stamp');
    assert.equal(parsed.args[0], hash);
    assert.equal(parsed.args[1].toLowerCase(), seller);
    assert.equal(Number(parsed.args[2]), code);
  }
});

test('stamp tx goes to the deployed contract at 25 gwei', () => {
  const t = stampTx('0x' + '11'.repeat(20), hash, seller, 'PAID');
  assert.equal(t.to, STAMP_CONTRACT);
  assert.equal(BigInt(t.gasPrice), 25_000_000_000n);
});

test('verdicts that are not final cannot be stamped', () => {
  for (const v of ['PENDING', 'UNVERIFIED', 'WRONG_CHAIN']) {
    assert.throws(() => stampData(hash, seller, v), /cannot be stamped/);
  }
});

test('bad hash or address is refused', () => {
  assert.throws(() => stampData('0x12', seller, 'PAID'), /Bad transaction hash/);
  assert.throws(() => stampData(hash, '0x12', 'PAID'), /Bad seller address/);
});
