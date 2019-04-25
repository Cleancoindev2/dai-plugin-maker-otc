import { DAI, ETH, WETH } from '../src/Currency';
import { placeLimitOrder, createDai } from './helpers';
import Maker from '@makerdao/dai';
import MakerOtc from '../dist/index.js';

let oasisExchangeService;

async function buildTestOasisExchangeService() {
  oasisExchangeService = buildTestService('exchange', {
    exchange: 'OasisExchangeService'
  });
  await oasisExchangeService.manager().authenticate();
  return oasisExchangeService;
}

beforeAll(async () => {
  await buildTestOasisExchangeService();
  await createDai(oasisExchangeService);
});

test('sell Dai, console log the balances (used for debugging)', async done => {
  const oasisExchangeService = await buildTestOasisExchangeService();
  let order;
  /* eslint-disable-next-line */
  let initialBalance;
  /* eslint-disable-next-line */
  let finalBalance;
  let daiToken;

  return placeLimitOrder(oasisExchangeService)
    .then(() => {
      const oasisContract = oasisExchangeService
        .get('smartContract')
        .getContractByName('MAKER_OTC');
      return oasisContract.getBestOffer(
        '0x7ba25f791fa76c3ef40ac98ed42634a8bc24c238',
        '0xc226f3cd13d508bc319f4f4290172748199d6612'
      );
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');
      daiToken = ethereumTokenService.getToken(DAI);
      return daiToken.balanceOf(
        oasisExchangeService.get('web3').currentAddress()
      );
    })
    .then(balance => {
      initialBalance = balance;
      const wethToken = oasisExchangeService.get('token').getToken(WETH);
      return wethToken.balanceOf(
        oasisExchangeService.get('web3').currentAddress()
      );
    })
    .then(() => {
      const oasisContract = oasisExchangeService
        .get('smartContract')
        .getContractByName('MAKER_OTC');
      return daiToken.approveUnlimited(oasisContract.address);
    })
    .then(() => {
      const oasisContract = oasisExchangeService
        .get('smartContract')
        .getContractByName('MAKER_OTC');
      return daiToken.allowance(
        oasisExchangeService.get('web3').currentAddress(),
        oasisContract.address
      );
    })
    .then(() => {
      order = oasisExchangeService.sellDai('0.01', WETH);
      return order;
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');
      const token = ethereumTokenService.getToken(WETH);
      return token.balanceOf(oasisExchangeService.get('web3').currentAddress());
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');
      const token = ethereumTokenService.getToken(DAI);
      return token.balanceOf(oasisExchangeService.get('web3').currentAddress());
    })
    .then(balance => {
      finalBalance = balance;
      done();
    });
});

test('sell Dai', async () => {
  const oasisExchangeService = await buildTestOasisExchangeService();
  await placeLimitOrder(oasisExchangeService);
  const order = await oasisExchangeService.sellDai('0.01', WETH);
  expect(order.fees().gt(ETH.wei(80000))).toBeTruthy();
  expect(order.fillAmount()).toEqual(WETH(0.0005));
});

test('buy Dai', async () => {
  const oasisService = await buildTestOasisExchangeService();
  await placeLimitOrder(oasisService, true);
  const order = await oasisService.buyDai('0.01', WETH);
  expect(order.fees().gt(ETH.wei(80000))).toBeTruthy();
  expect(order.fillAmount()).toEqual(DAI(0.04));
});

test('buy Dai with wei amount', async () => {
  const oasisService = await buildTestOasisExchangeService();
  await placeLimitOrder(oasisService, true);
  const order = await oasisService.buyDai(DAI.wei(10000000000000000), WETH);
  expect(order.fees().gt(ETH.wei(80000))).toBeTruthy();
  expect(order.fillAmount()).toEqual(DAI(0.04));
});