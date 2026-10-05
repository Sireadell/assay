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
