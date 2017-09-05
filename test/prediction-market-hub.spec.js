const PredictionMarketHub = artifacts.require("./PredictionMarketHub.sol");
const PredictionMarket = artifacts.require("./PredictionMarket.sol");
const util = require('./util');
const getEventsPromise = util.getEventsPromise;
const expectedExceptionPromise = util.expectedExceptionPromise;
const promisify = util.promisify;
const expectThrow = util.expectThrow;
const async = require('asyncawait/async');
const await = require('asyncawait/await');

contract('PredictionMarketHub', accounts => {
  const owner = accounts[0];
  let hub;
  let predictionMarket;

  describe('PredictionMarketHub', async (() => {
    beforeEach(async (() => {
      hub = await (PredictionMarketHub.new(
        { from: owner }
      ));
      predictionMarket = await (hub.createPredictionMarket());
    }));

    it("hub should intantiate new market", async(() => {
      const _marketAddress = await (hub.predictionMarkets(0));
      assert.ok(_marketAddress, 'market is not set');

      const _doesMarketExist = await (hub.predictionMarketExists(_marketAddress));
      assert.equal(_doesMarketExist, true, 'market does not exist');

      const _marketCount = await (hub.getPredictionMarketCount());
      assert.equal(_marketCount.valueOf(), 1, 'wrong market count');
    }));

    it("hub should stop a market", async(() => {
      const _marketAddress = await (hub.predictionMarkets(0));
      const _isStopped = await (hub.stopPredictionMarket.call(_marketAddress));
      assert.equal(_isStopped, true, 'market is not stopped');
    }));

    it("hub should start a market", async(() => {
      const _marketAddress = await (hub.predictionMarkets(0));
      const _isStarted = await (hub.startPredictionMarket.call(_marketAddress));
      assert.equal(_isStarted, true, 'market is not started');
    }));

    it("should throw when a non owner tries to stop", async(() => {
      const _marketAddress = await (hub.predictionMarkets(0));
      await (expectThrow(hub.stopPredictionMarket.call(_marketAddress, {
        from: accounts[1], gas: 1000000
      })));
    }));

    it("should throw when a non owner tries to start", async(() => {
      const _marketAddress = await (hub.predictionMarkets(0));
      await (expectThrow(hub.startPredictionMarket.call(_marketAddress, {
        from: accounts[1], gas: 1000000
      })));
    }));

    //add is running to code

    //should throw when stopped
  }));

});
