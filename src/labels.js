// Words and colours for each verdict, shared by the main page and the proof page.
export const LABEL = {
  PAID: 'PAID',
  NOT_PAID: 'NOT PAID',
  FAKE_TOKEN: 'NOT PAID: FAKE TOKEN',
  PARTIAL: 'PARTLY PAID',
  OVERPAID: 'OVERPAID',
  WRONG_COIN: 'PAID IN EURC, NOT USDC',
  PENDING: 'PENDING',
  WRONG_CHAIN: 'WRONG CHAIN',
  UNVERIFIED: 'CANNOT VERIFY',
};

// One plain sentence shown under a fake-token verdict, so a stranger can see why.
export const FAKE_EXPLAINER =
  'Anyone can make a token and name it USDC. Real USDC on Arc lives at one address only: 0x3600000000000000000000000000000000000000. This one lives somewhere else.';

// Colour family for each verdict: ok (green), bad (red) or warn (amber).
export const TONE = {
  PAID: 'ok',
  NOT_PAID: 'bad',
  FAKE_TOKEN: 'bad',
  WRONG_CHAIN: 'bad',
  PARTIAL: 'warn',
  OVERPAID: 'warn',
  WRONG_COIN: 'warn',
  PENDING: 'warn',
  UNVERIFIED: 'warn',
};

// The big word and the short line under it. LABEL keeps the one-line form.
export function verdictHead(verdict) {
  if (verdict === 'FAKE_TOKEN') return ['NOT PAID', 'Fake token'];
  if (verdict === 'WRONG_COIN') return ['WRONG COIN', 'Paid in EURC, not USDC'];
  return [LABEL[verdict] || verdict, ''];
}

// "You were sent" and "You needed" lines, in plain words. Empty when there is
// nothing useful to compare.
export function verdictFacts(d, expected) {
  const need = expected ? `${expected} real USDC` : 'Real USDC';
  switch (d.verdict) {
    case 'PAID':
    case 'PARTIAL':
    case 'OVERPAID':
      return [
        ['You were sent', `${d.received} real USDC`],
        ...(expected ? [['You expected', `${expected} USDC`]] : []),
      ];
    case 'FAKE_TOKEN':
      return [
        ['You were sent', `A token that calls itself "${d.fakeSymbol || 'USDC'}" (not real)`],
        ['You needed', need],
      ];
    case 'WRONG_COIN':
      return [['You were sent', `${d.receivedEurc} EURC`], ['You needed', need]];
    case 'NOT_PAID':
      return d.otherToken ? [['You were sent', 'A different token, not USDC'], ['You needed', need]] : [];
    default:
      return [];
  }
}
