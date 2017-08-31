const PredictionMarket = artifacts.require("./PredictionMarket.sol");
const util = require('./util');
const getEventsPromise = util.getEventsPromise;
const expectedExceptionPromise = util.expectedExceptionPromise;
const promisify = util.promisify;

contract('PredictionMarket', accounts => {
  const duration = 5;
  const admin = accounts[0];
  const playerOne = accounts[1];
  const playerTwo = accounts[2];
  const trustedSource = accounts[3];
  let instance;

  beforeEach(() => {
    return PredictionMarket.new(
      duration,
      { from: admin }
    )
    .then(thisInstance => {
      instance = thisInstance;
    });
  });

  it("admin should be set", () => {
    instance.admin()
      .then(_admin => {
        assert.equal(admin, _admin, 'admin is not set');
      })
  });

  it('should revert if a non admin tries to add a trusted source', () => {
    return expectedExceptionPromise(() => {
      return instance.addTrustedSource(
        trustedSource,
        { from: playerOne, gas: 1000000 }
      )
      .then(txObj => txObj.tx);
    }, 1000000);
  });

  it('should revert if a non admin tries to add a question', () => {
    return expectedExceptionPromise(() => {
      return instance.addQuestion(
        'blah',
        { from: playerOne, gas: 1000000 }
      )
      .then(txObj => txObj.tx);
    }, 1000000);
  });

  it('should revert if a player bets a 0 amount on a question', () => {
    return expectedExceptionPromise(() => {
      return instance.bet(
        1,
        1,
        { from: playerOne, value: 0, gas: 1000000 }
      )
      .then(txObj => txObj.tx);
    }, 1000000);
  });

  it("admin should be able to add a trusted source", done => {
    instance.addTrustedSource(
        trustedSource,
        { from: admin }
      )
      .then(tx => {
        return instance.trustedSources(trustedSource);
      })
      .then(_didAddSource => {
        assert.equal(_didAddSource, true, 'should have added a trusted source');
        return getEventsPromise(instance.AddedTrustedSource(
            trustedSource
        ));
      })
      .then((event) => {
        const eventArgs = event[0].args;
        assert.equal(eventArgs.source.valueOf(), trustedSource, "should be the newly added trusted source");
        done();
      })
      .catch(done);
    });

    it("admin should be able to add a question", done => {
      const questionOne = {
        question: 'Will Conor Mcgregor defeat Floyd Mayweather?',
        id: 1,
        outcome: false,
        numPositiveBets: 0,
        numNegativeBets: 0,
        positiveBetAmount: 0,
        negativeBetAmount: 0,
        resolved: false,
      };

      instance.addQuestion(
          questionOne.question,
          { from: admin }
        )
        .then(tx => {
          return instance.getQuestion(questionOne.id);
        })
        .then(_question => {
          assert.equal(_question[0], questionOne.question, 'question text should be same');
          assert.equal(_question[1], questionOne.resolved, 'question resolution status should be same');
          assert.equal(_question[2], questionOne.outcome, 'question outcome should be same');
          assert.equal(_question[3], questionOne.numPositiveBets, 'question numPositiveBets should be same');
          assert.equal(_question[4], questionOne.numNegativeBets, 'question numNegativeBets should be same');
          assert.equal(_question[5], questionOne.positiveBetAmount, 'question positiveBetAmount should be same');
          assert.equal(_question[6], questionOne.negativeBetAmount, 'question negativeBetAmount should be same');
          assert.equal(_question[7], questionOne.id, 'question id should be same');
          return getEventsPromise(instance.QuestionAdded(
              _question[7]
          ));
        })
        .then((event) => {
          const eventArgs = event[0].args;
          assert.equal(eventArgs._question.valueOf(), questionOne.question, "should be the newly added question");
          done();
        })
        .catch(done);
    });

    it("playerOne should be able to bet", done => {
      const playerOneBet = {
        questionId: 1,
        bettingAddress: playerOne,
        bet: true,
        amount: web3.toWei(1, 'ether'),
      };

      const updatedQuestionSubObject = {
        numPositiveBets: 1,
        positiveBetAmount: playerOneBet.amount,
      };

      instance.bet(
          playerOneBet.questionId,
          playerOneBet.bet,
          { from: playerOne, value: playerOneBet.amount }
        )
        .then(tx => {
          return instance.getBet(playerOneBet.bettingAddress);
        })
        .then(_playerOneBet => {
          assert.equal(_playerOneBet[0], playerOneBet.questionId);
          assert.equal(_playerOneBet[1], playerOneBet.bettingAddress);
          assert.equal(_playerOneBet[2], playerOneBet.bet);
          assert.equal(_playerOneBet[3], playerOneBet.amount);
          return getEventsPromise(instance.NewBet(
            _playerOneBet[1],
            _playerOneBet[0],
            _playerOneBet[2],
            _playerOneBet[3]
          ));
        })
        .then((event) => {
          const eventArgs = event[0].args;
          assert.equal(eventArgs._better.valueOf(), playerOne, "should be playerOne address");
          assert.equal(eventArgs._questionId.valueOf(), playerOneBet.questionId, "should be playerOne bet's question id");
          assert.equal(eventArgs._bet.valueOf(), playerOneBet.bet, "should be playerOne's bet");
          assert.equal(eventArgs._amount.valueOf(), playerOneBet.amount, "should be playerOne's bet amount");
          return;
        })
        .then(() => {
          return instance.getQuestion(playerOneBet.questionId);
        })
        .then(_question => {
          assert.equal(_question[3], updatedQuestionSubObject.numPositiveBets, 'question numPositiveBets should be updated');
          assert.equal(_question[5], updatedQuestionSubObject.positiveBetAmount, 'question positiveBetAmount should be updated');
          return getEventsPromise(instance.UpdatedQuestionData(
              _question.question,
              _question.id,
              _question.numPositiveBets,
              _question.numNegativeBets
          ));
        })
        .then((event) => {
          const eventArgs = event[0].args;
          assert.equal(eventArgs._numPositiveBets.valueOf(), updatedQuestionSubObject.numPositiveBets, "should be 1 positive bet");
          assert.equal(eventArgs._positiveBetAmount.valueOf(), updatedQuestionSubObject.positiveBetAmount, "should be 1 positive bet amount");
          done();
        })
        .catch(done);
    });

    it("playerTwo should be able to bet", done => {
      const playerTwoBet = {
        questionId: 1,
        bettingAddress: playerTwo,
        bet: false,
        amount: web3.toWei(0.5, 'ether'),
      };

      const updatedQuestionSubObject = {
        numNegativeBets: 1,
        negativeBetAmount: playerTwoBet.amount,
      };

      instance.bet(
          playerTwoBet.questionId,
          playerTwoBet.bet,
          { from: playerTwo, value: playerTwoBet.amount }
        )
        .then(tx => {
          return instance.getBet(playerTwoBet.bettingAddress);
        })
        .then(_playerTwoBet => {
          assert.equal(_playerTwoBet[0], playerTwoBet.questionId);
          assert.equal(_playerTwoBet[1], playerTwoBet.bettingAddress);
          assert.equal(_playerTwoBet[2], playerTwoBet.bet);
          assert.equal(_playerTwoBet[3], playerTwoBet.amount);
          return getEventsPromise(instance.NewBet(
              _playerTwoBet[1],
              _playerTwoBet[0],
              _playerTwoBet[2],
              _playerTwoBet[3]
          ));
        })
        .then((event) => {
          const eventArgs = event[0].args;
          assert.equal(eventArgs._better.valueOf(), playerTwo, "should be playerTwo address");
          assert.equal(eventArgs._questionId.valueOf(), playerTwoBet.questionId, "should be playerTwo bet's question id");
          assert.equal(eventArgs._bet.valueOf(), playerTwoBet.bet, "should be playerTwo's bet");
          assert.equal(eventArgs._amount.valueOf(), playerTwoBet.amount, "should be playerTwo's bet amount");
          return;
        })
        .then(() => {
          return instance.getQuestion(playerTwoBet.questionId);
        })
        .then(_question => {
          assert.equal(_question[4], updatedQuestionSubObject.numNegativeBets, 'question numNegativeBets should be updated');
          assert.equal(_question[6], updatedQuestionSubObject.negativeBetAmount, 'question negativeBetAmount should be updated');
          return getEventsPromise(instance.UpdatedQuestionData(
              _question.question,
              _question.id,
              _question.numPositiveBets,
              _question.numNegativeBets
          ));
        })
        .then((event) => {
          const eventArgs = event[0].args;
          assert.equal(eventArgs._numNegativeBets.valueOf(), updatedQuestionSubObject.numNegativeBets, "should be 1 negative bet");
          assert.equal(eventArgs._negativeBetAmount.valueOf(), updatedQuestionSubObject.negativeBetAmount, "should be 0.5 negative bet amount");
          done();
        })
        .catch(done);
    });

    it('should revert if a player tries to claim funds on an unresolved question', () => {
      return expectedExceptionPromise(() => {
        return instance.claimFunds(
          1,
          { from: playerOne, gas: 1000000 }
        )
        .then(txObj => txObj.tx);
      }, 1000000);
    });

    it('should revert if non trusted party tries to resolve a question', () => {
      return expectedExceptionPromise(() => {
        return instance.resolveQuestion(
          1,
          false,
          { from: playerOne, gas: 1000000 }
        )
        .then(txObj => txObj.tx);
      }, 1000000);
    });

    it('should revert if trusted party tries to resolve an already resolved question', done => {
      let instance;

      const questionOne = {
        question: 'Will Conor Mcgregor defeat Floyd Mayweather?',
        id: 1,
        outcome: false,
        numPositiveBets: 0,
        numNegativeBets: 0,
        positiveBetAmount: 0,
        negativeBetAmount: 0,
        resolved: false,
      };

      PredictionMarket.new(
        duration,
        { from: admin }
      )
      .then(thisInstance => {
        instance = thisInstance;
        return;
      })
      .then(() => {
        return instance.addQuestion(
            questionOne.question,
            { from: admin }
        );
      })
      .then(() => {
        return instance.addTrustedSource(
          trustedSource,
          { from: admin, gas: 1000000 }
        );
      })
      .then(() => {
        return instance.trustedSources(trustedSource);
      })
      .then(_isTrusted => {
        assert.equal(_isTrusted, true, "should be a trusted source");
        return
      })
      .then(() => {
        return instance.resolveQuestion(
          questionOne.id,
          true,
          { from: trustedSource, gas: 1000000 }
        )
      })
      .then(() => {
        return expectedExceptionPromise(() => {
          return instance.resolveQuestion(
            questionOne.id,
            false,
            { from: trustedSource, gas: 1000000 }
          )
          .then(txObj => txObj.tx)
        }, 1000000);
      })
      .then(done)
      .catch(done);
    });

    it('trusted source should be able to resolve an unresolved question', done => {
      let instance;

      const questionOne = {
        question: 'Will Conor Mcgregor defeat Floyd Mayweather?',
        id: 1,
        outcome: false,
        numPositiveBets: 0,
        numNegativeBets: 0,
        positiveBetAmount: 0,
        negativeBetAmount: 0,
        resolved: false,
      };

      PredictionMarket.new(
        duration,
        { from: admin }
      )
      .then(thisInstance => {
        instance = thisInstance;
        return;
      })
      .then(() => {
        return instance.addQuestion(
            questionOne.question,
            { from: admin }
        );
      })
      .then(() => {
        return instance.addTrustedSource(
          trustedSource,
          { from: admin, gas: 1000000 }
        );
      })
      .then(() => {
        return instance.trustedSources(trustedSource);
      })
      .then(_isTrusted => {
        assert.equal(_isTrusted, true, "should be a trusted source");
        return
      })
      .then(() => {
        return instance.resolveQuestion(
          questionOne.id,
          false,
          { from: trustedSource, gas: 1000000 }
        );
      })
      .then(() => {
        return instance.getQuestion(questionOne.id);
      })
      .then(_question => {
        assert.equal(_question[7], true, 'should be resolved');
        done();
      })
      .catch(done);
    });

    it('should revert if trusted party tries to resolve an already resolved question', done => {
      let instance;

      const questionOne = {
        question: 'Will Conor Mcgregor defeat Floyd Mayweather?',
        id: 1,
        outcome: false,
        numPositiveBets: 0,
        numNegativeBets: 0,
        positiveBetAmount: 0,
        negativeBetAmount: 0,
        resolved: false,
      };

      PredictionMarket.new(
        duration,
        { from: admin }
      )
      .then(thisInstance => {
        instance = thisInstance;
        return;
      })
      .then(() => {
        return instance.addQuestion(
            questionOne.question,
            { from: admin }
        );
      })
      .then(() => {
        return instance.addTrustedSource(
          trustedSource,
          { from: admin, gas: 1000000 }
        );
      })
      .then(() => {
        return instance.trustedSources(trustedSource);
      })
      .then(_isTrusted => {
        assert.equal(_isTrusted, true, "should be a trusted source");
        return
      })
      .then(() => {
        return instance.resolveQuestion(
          questionOne.id,
          true,
          { from: trustedSource, gas: 1000000 }
        )
      })
      .then(() => {
        return expectedExceptionPromise(() => {
          return instance.resolveQuestion(
            questionOne.id,
            false,
            { from: trustedSource, gas: 1000000 }
          )
          .then(txObj => txObj.tx)
        }, 1000000);
      })
      .then(done)
      .catch(done);
    });

    it('should revert if party claims funds on an unresolved question', done => {
      let instance;

      const questionOne = {
        question: 'Will Conor Mcgregor defeat Floyd Mayweather?',
        id: 1,
        outcome: false,
        numPositiveBets: 0,
        numNegativeBets: 0,
        positiveBetAmount: 0,
        negativeBetAmount: 0,
        resolved: false,
      };

      PredictionMarket.new(
        duration,
        { from: admin }
      )
      .then(thisInstance => {
        instance = thisInstance;
        return;
      })
      .then(() => {
        return instance.addQuestion(
            questionOne.question,
            { from: admin }
        );
      })
      .then(() => {
        return instance.addTrustedSource(
          trustedSource,
          { from: admin, gas: 1000000 }
        );
      })
      .then(() => {
        return instance.trustedSources(trustedSource);
      })
      .then(_isTrusted => {
        assert.equal(_isTrusted, true, "should be a trusted source");
        return
      })
      .then(() => {
        return expectedExceptionPromise(() => {
          return instance.claimFunds(
            questionOne.id,
            { from: playerOne, gas: 1000000 }
          )
          .then(txObj => txObj.tx)
        }, 1000000);
      })
      .then(done)
      .catch(done);
    });

    it('should handle claiming of funds on a resolved question', done => {
      const playerOneBet = {
        questionId: 1,
        bettingAddress: playerOne,
        bet: true,
        amount: web3.toWei(1, 'ether'),
      };
      const playerTwoBet = {
        questionId: 1,
        bettingAddress: playerTwo,
        bet: false,
        amount: web3.toWei(0.5, 'ether'),
      };
      const questionOne = {
        question: 'Will Conor Mcgregor defeat Floyd Mayweather?',
        id: 1,
        outcome: false,
        numPositiveBets: 0,
        numNegativeBets: 0,
        positiveBetAmount: 0,
        negativeBetAmount: 0,
        resolved: false,
      };

      let instance;
      let initialPlayerTwoBalance;

      PredictionMarket.new(
        duration,
        { from: admin }
      )
      .then(thisInstance => {
        instance = thisInstance;
        return;
      })
      .then(() => {
        return instance.addQuestion(
            questionOne.question,
            { from: admin }
        );
      })
      .then(() => {
        return instance.addTrustedSource(
          trustedSource,
          { from: admin, gas: 1000000 }
        );
      })
      .then(() => {
        return instance.trustedSources(trustedSource);
      })
      .then(_isTrusted => {
        assert.equal(_isTrusted, true, "should be a trusted source");
        return
      })
      .then(() => {
        return instance.bet(
            playerOneBet.questionId,
            playerOneBet.bet,
            { from: playerOne, value: playerOneBet.amount }
          );
      })
      .then(() => {
        return instance.bet(
            playerTwoBet.questionId,
            playerTwoBet.bet,
            { from: playerTwo, value: playerTwoBet.amount }
          );
      })
      .then(() => {
        return instance.resolveQuestion(
          questionOne.id,
          false,
          { from: trustedSource, gas: 1000000 }
        )
      })
      .then(() => {
        return expectedExceptionPromise(() => {
          return instance.claimFunds(
            questionOne.id,
            { from: playerOne, gas: 1000000 }
          )
          .then(txObj => txObj.tx)
        }, 1000000);
      })
      .then(() => {
        return promisify((cb) => web3.eth.getBalance(playerTwo, cb))
      })
      .then(balance => {
        initialPlayerTwoBalance = balance;
        return
      })
      .then(() => {
        return instance.claimFunds(
          questionOne.id,
          { from: playerTwo, gas: 1000000 }
        )
      })
      .then(txObj => {
        return promisify((cb) => web3.eth.getBalance(playerTwo, cb));
      })
      .then(balance => {
        assert.isAbove(
          balance.toNumber(),
          initialPlayerTwoBalance.toNumber(),
          "Player two's balance wasn't credited!"
        );
        return;
      })
      .then(done)
      .catch(done);
    });
});
