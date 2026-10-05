// Compiles contracts/TruePaidStamp.sol and writes build/ (abi, bytecode, and the
// standard JSON input the explorer needs to verify the source).
import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

export function compile() {
  const source = readFileSync(new URL('../contracts/TruePaidStamp.sol', import.meta.url), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'TruePaidStamp.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'paris',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors || []).filter((e) => e.severity === 'error');
  if (errors.length) throw new Error(errors.map((e) => e.formattedMessage).join('\n'));
  const c = out.contracts['TruePaidStamp.sol'].TruePaidStamp;
  return { input, abi: c.abi, bytecode: '0x' + c.evm.bytecode.object, version: solc.version() };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('compile.mjs')) {
  const r = compile();
  mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../build/TruePaidStamp.json', import.meta.url), JSON.stringify({ abi: r.abi, bytecode: r.bytecode, compiler: r.version }, null, 2));
  writeFileSync(new URL('../build/standard-input.json', import.meta.url), JSON.stringify(r.input, null, 2));
  console.log('compiled with', r.version, 'bytecode bytes:', (r.bytecode.length - 2) / 2);
}
