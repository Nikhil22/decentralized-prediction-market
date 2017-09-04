const async = require('asyncawait/async');
const await = require('asyncawait/await');

function promisify(inner) {
  return new Promise((resolve, reject) =>
    inner((err, res) => {
      err ? reject(err) : resolve(res);
    })
  );
}


function getTransactionReceiptMined(txHash, interval) {
  const transactionReceiptAsync = function(resolve, reject) {
    web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
      if (error) {
        reject(error);
      } else if (receipt == null) {
        setTimeout(
          () => transactionReceiptAsync(resolve, reject),
          interval ? interval : 500);
      } else {
        resolve(receipt);
      }
    });
  };

  if (Array.isArray(txHash)) {
    return Promise.all(txHash.map(
      oneTxHash => getTransactionReceiptMined(oneTxHash, interval)));
  } else if (typeof txHash === "string") {
    return new Promise(transactionReceiptAsync);
  } else {
    throw new Error("Invalid Type: " + txHash);
  }
};

function expectedExceptionPromise(action, gasToUse) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(action());
    } catch(e) {
      reject(e);
    }
  })
  .then(function (txn) {
    // https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
    return getTransactionReceiptMined(txn);
  })
  .then(function (receipt) {
    // We are in Geth
    assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
  })
  .catch(function (e) {
    if (((e + "").indexOf("invalid opcode") > -1) || ((e + "").indexOf("out of gas") > -1)) {
      // We are in TestRPC
    } else if ((e + "").indexOf("please check your gas amount") > -1) {
      // We are in Geth for a deployment
    } else {
      throw e;
    }
  });
};

var getEventsPromise = function (myFilter, count) {
  return new Promise(function (resolve, reject) {
    count = count ? count : 1;
    var results = [];
    myFilter.watch(function (error, result) {
      if (error) {
        reject(error);
      } else {
        count--;
        results.push(result);
      }
      if (count <= 0) {
        resolve(results);
        myFilter.stopWatching();
      }
    });
  });
};

function sendRpc(method, params) {
    return new Promise((resolve) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method,
        params: params || [],
        id: new Date().getTime(),
      }, (err, res) => { resolve(res); });
    });
  }
function waitUntilBlock(seconds, targetBlock) {
  return new Promise((resolve) => {
    const asyncIterator = () => {
      return web3.eth.getBlock('latest', (e, { number }) => {
        if (number >= targetBlock - 1) {
          return sendRpc('evm_increaseTime', [seconds])
          .then(() => sendRpc('evm_mine')).then(resolve);
        }
        return sendRpc('evm_mine').then(asyncIterator);
      });
    };
    asyncIterator();
  });
}

function wait(seconds = 20, blocks = 1) {
  return new Promise((resolve) => {
    return web3.eth.getBlock('latest', (e, { number }) => {
      resolve(blocks + number);
    });
  })
  .then((targetBlock) => {
    return waitUntilBlock(seconds, targetBlock);
  });
}

module.exports = {
  getTransactionReceiptMined,
  expectedExceptionPromise,
  promisify,
  getEventsPromise,
  waitUntilBlock,
  expectThrow: async ((promise) => {
      try {
          await (promise)
      } catch (error) {
          // TODO: Check jump destination to destinguish between a throw
          //       and an actual invalid jump.
          const invalidOpcode = error.message.search('invalid opcode') >= 0;
          // TODO: When we contract A calls contract B, and B throws, instead
          //       of an 'invalid jump', we get an 'out of gas' error. How do
          //       we distinguish this from an actual out of gas event? (The
          //       testrpc log actually show an 'invalid jump' event.)
          const outOfGas = error.message.search('out of gas') >= 0;
          assert(
              invalidOpcode || outOfGas,
              "Expected throw, got '" + error + "' instead"
          )
          return
      }
      assert.fail('Expected throw not received')
  })
};
