const Stoppable = artifacts.require("./Stoppable.sol");
const util = require('./util');
const getEventsPromise = util.getEventsPromise;
const expectedExceptionPromise = util.expectedExceptionPromise;
const promisify = util.promisify;
const expectThrow = util.expectThrow;
const async = require('asyncawait/async');
const await = require('asyncawait/await');

contract('Stoppable', accounts => {
  const owner = accounts[0];
  let instance;

  describe('Stoppable', async (() => {
    beforeEach(async (() => {
      instance = await (Stoppable.new(
        { from: owner }
      ));
    }));

    it("should initialize running state to true", async(() => {
      const _running = await (instance.running());
      assert.equal(_running, true, 'is not running');
    }));

    it("should set running state to false", async(() => {
      await (instance.runSwitch(false), { from: owner });
      const _running = await (instance.running());
      assert.equal(_running, false, 'is running');
    }));
  }));

});
