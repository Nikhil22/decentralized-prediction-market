const PredictionMarket = artifacts.require("./PredictionMarket.sol");
const util = require('./util');
const getEventsPromise = util.getEventsPromise;
const expectedExceptionPromise = util.expectedExceptionPromise;
const promisify = util.promisify;
const expectThrow = util.expectThrow;
const async = require('asyncawait/async');
const await = require('asyncawait/await');

contract('PredictionMarket', accounts => {
  const admin = accounts[0];
  const playerOne = accounts[1];
  const playerTwo = accounts[2];
  const trustedSource = accounts[3];
  let instance;

  beforeEach(async (() => {
    instance = await (PredictionMarket.new(
      { from: admin }
    ));
  }));

  it("admin should be set", async(() => {
    const _admin = await (instance.admin());
    assert.equal(admin, _admin, 'admin is not set');
  }));

  it('should revert if a non admin tries to add a trusted source', async (() => {
    await (expectThrow(instance.addTrustedSource(
      trustedSource,
      { from: playerOne, gas: 1000000 }
    )));
  }));

  it('should revert if a non admin tries to add a question', async(() => {
    await (expectThrow(instance.addQuestion(
      'blah',
      { from: playerOne, gas: 1000000 }
    )));
  }));

  it('should revert if a player bets a 0 amount on a question', async (() => {
    await (expectThrow(instance.bet(
      1,
      1,
      { from: playerOne, value: 0, gas: 1000000 }
    )));
  }));

  it("admin should be able to add a trusted source", async (() => {
    await (instance.addTrustedSource(trustedSource,{ from: admin }));
    const _didAddSource = await (instance.trustedSources(trustedSource));
    assert.equal(_didAddSource, true, 'should have added a trusted source');
    const event = await (getEventsPromise(instance.AddedTrustedSource(
        trustedSource
    )));
    const eventArgs = event[0].args;
    assert.equal(eventArgs.source.valueOf(), trustedSource, "should be the newly added trusted source");
  }));

  it("admin should be able to add a question", async (() => {
    const questionOne = {
      question: 'Will Conor Mcgregor defeat Floyd Mayweather?',
      outcome: false,
      numPositiveBets: 0,
      numNegativeBets: 0,
      positiveBetAmount: 0,
      negativeBetAmount: 0,
      resolved: false,
    };

    await (instance.addQuestion(
        questionOne.question,
        { from: admin }
      ));
    const _question = await (instance.getQuestion(1));
    assert.equal(_question[0], questionOne.question, 'question text should be same');
    assert.equal(_question[1], questionOne.resolved, 'question resolution status should be same');
    assert.equal(_question[2], questionOne.outcome, 'question outcome should be same');
    assert.equal(_question[3], questionOne.numPositiveBets, 'question numPositiveBets should be same');
    assert.equal(_question[4], questionOne.numNegativeBets, 'question numNegativeBets should be same');
    assert.equal(_question[5], questionOne.positiveBetAmount, 'question positiveBetAmount should be same');
    assert.equal(_question[6], questionOne.negativeBetAmount, 'question negativeBetAmount should be same');
    const event = await (getEventsPromise(
      instance.QuestionAdded(1)
    ));
    const eventArgs = event[0].args;
    assert.equal(eventArgs._question.valueOf(), questionOne.question, "should be the newly added question");
  }));

  it("playerOne should be able to bet", async (() => {
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

    await (instance.bet(
        playerOneBet.questionId,
        playerOneBet.bet,
        { from: playerOne, value: playerOneBet.amount }
    ));
    const _playerOneBet = await (instance.getBet(playerOneBet.bettingAddress, playerOneBet.questionId));
    assert.equal(_playerOneBet[0], playerOneBet.bettingAddress);
    assert.equal(_playerOneBet[1], playerOneBet.bet);
    assert.equal(_playerOneBet[2], playerOneBet.amount);
    let event = await (getEventsPromise(instance.NewBet(
      _playerOneBet[0],
      _playerOneBet[1],
      _playerOneBet[2],
      playerOneBet.questionId
    )));
    let eventArgs = event[0].args;
    assert.equal(eventArgs._better.valueOf(), playerOne, "should be playerOne address");
    assert.equal(eventArgs._questionId.valueOf(), playerOneBet.questionId, "should be playerOne bet's question id");
    assert.equal(eventArgs._bet.valueOf(), playerOneBet.bet, "should be playerOne's bet");
    assert.equal(eventArgs._amount.valueOf(), playerOneBet.amount, "should be playerOne's bet amount");

    const _question = await (instance.getQuestion(playerOneBet.questionId));
    assert.equal(_question[3], updatedQuestionSubObject.numPositiveBets, 'question numPositiveBets should be updated');
    assert.equal(_question[5], updatedQuestionSubObject.positiveBetAmount, 'question positiveBetAmount should be updated');

    event = await (getEventsPromise(instance.UpdatedQuestionData(
        _question.question,
        playerOneBet.questionId,
        _question.numPositiveBets,
        _question.numNegativeBets
    )));
    eventArgs = event[0].args;
    assert.equal(eventArgs._numPositiveBets.valueOf(), updatedQuestionSubObject.numPositiveBets, "should be 1 positive bet");
    assert.equal(eventArgs._positiveBetAmount.valueOf(), updatedQuestionSubObject.positiveBetAmount, "should be 1 positive bet amount");
  }));

  it("playerTwo should be able to bet", async (() => {
    const playerTwoBet = {
      questionId: 1,
      bettingAddress: playerTwo,
      bet: true,
      amount: web3.toWei(0.5, 'ether'),
    };

    const updatedQuestionSubObject = {
      numPositiveBets: 1,
      positiveBetAmount: playerTwoBet.amount,
    };

    await (instance.bet(
        playerTwoBet.questionId,
        playerTwoBet.bet,
        { from: playerTwo, value: playerTwoBet.amount }
    ));
    const _playerTwoBet = await (instance.getBet(playerTwoBet.bettingAddress, playerTwoBet.questionId));
    assert.equal(_playerTwoBet[0], playerTwoBet.bettingAddress);
    assert.equal(_playerTwoBet[1], playerTwoBet.bet);
    assert.equal(_playerTwoBet[2], playerTwoBet.amount);
    let event = await (getEventsPromise(instance.NewBet(
      _playerTwoBet[0],
      _playerTwoBet[1],
      _playerTwoBet[2],
      playerTwoBet.questionId
    )));
    let eventArgs = event[0].args;
    assert.equal(eventArgs._better.valueOf(), playerTwo, "should be playerTwo address");
    assert.equal(eventArgs._questionId.valueOf(), playerTwoBet.questionId, "should be playerTwo bet's question id");
    assert.equal(eventArgs._bet.valueOf(), playerTwoBet.bet, "should be playerTwo's bet");
    assert.equal(eventArgs._amount.valueOf(), playerTwoBet.amount, "should be playerTwo's bet amount");

    const _question = await (instance.getQuestion(playerTwoBet.questionId));
    assert.equal(_question[3], updatedQuestionSubObject.numPositiveBets, 'question numPositiveBets should be updated');
    assert.equal(_question[5], updatedQuestionSubObject.positiveBetAmount, 'question positiveBetAmount should be updated');

    event = await (getEventsPromise(instance.UpdatedQuestionData(
        _question.question,
        playerTwoBet.questionId,
        _question.numPositiveBets,
        _question.numNegativeBets
    )));
    eventArgs = event[0].args;
    assert.equal(eventArgs._numPositiveBets.valueOf(), updatedQuestionSubObject.numPositiveBets, "should be 1 positive bet");
    assert.equal(eventArgs._positiveBetAmount.valueOf(), updatedQuestionSubObject.positiveBetAmount, "should be 1 positive bet amount");
  }));

  it('should revert if a player tries to claim funds on an unresolved question', async (() => {
    await (expectThrow(instance.claimFunds(
      1,
      { from: playerOne, gas: 1000000 }
    )));
  }));

  it('should revert if non trusted party tries to resolve a question', async (() => {
    await (expectThrow(instance.resolveQuestion(
      1,
      false,
      { from: playerOne, gas: 1000000 }
    )));
  }));

  it('should revert if trusted party tries to resolve an already resolved question', async (() => {
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

    const instance = await (PredictionMarket.new(
      { from: admin }
    ));

    await (instance.addQuestion(
        questionOne.question,
        { from: admin }
    ));

    await (instance.addTrustedSource(
      trustedSource,
      { from: admin, gas: 1000000 }
    ));

    const _isTrusted = await (instance.trustedSources(trustedSource));
    assert.equal(_isTrusted, true, "should be a trusted source");

    await (instance.resolveQuestion(
      questionOne.id,
      true,
      { from: trustedSource, gas: 1000000 }
    ));

    await (expectThrow(instance.resolveQuestion(
      questionOne.id,
      false,
      { from: trustedSource, gas: 1000000 }
    )));
  }));

  it('trusted source should be able to resolve an unresolved question', async (() => {
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

    const instance = await (PredictionMarket.new(
      { from: admin }
    ));

    await (instance.addQuestion(
        questionOne.question,
        { from: admin }
    ));

    await (instance.addTrustedSource(
      trustedSource,
      { from: admin, gas: 1000000 }
    ));

    const _isTrusted = await (instance.trustedSources(trustedSource));
    assert.equal(_isTrusted, true, "should be a trusted source");

    await (instance.resolveQuestion(
      questionOne.id,
      false,
      { from: trustedSource, gas: 1000000 }
    ));

    const _question = await (instance.getQuestion(questionOne.id));
    assert.equal(_question[1], true, 'should be resolved');
  }));

  it('should revert if trusted party tries to resolve an already resolved question', async (() => {
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

    const instance = await (PredictionMarket.new(
      { from: admin }
    ));

    await (instance.addQuestion(
        questionOne.question,
        { from: admin }
    ));

    await (instance.addTrustedSource(
      trustedSource,
      { from: admin, gas: 1000000 }
    ));

    const _isTrusted = await (instance.trustedSources(trustedSource));
    assert.equal(_isTrusted, true, "should be a trusted source");

    await (instance.resolveQuestion(
      questionOne.id,
      true,
      { from: trustedSource, gas: 1000000 }
    ));

    await (expectThrow(instance.resolveQuestion(
      questionOne.id,
      false,
      { from: trustedSource, gas: 1000000 }
    )));
  }));

  it('should revert if party claims funds on an unresolved question', async (() => {
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

    const instance = await (PredictionMarket.new(
      { from: admin }
    ));

    await (instance.addQuestion(
        questionOne.question,
        { from: admin }
    ));

    await (instance.addTrustedSource(
      trustedSource,
      { from: admin, gas: 1000000 }
    ));

    const _isTrusted = await (instance.trustedSources(trustedSource));
    assert.equal(_isTrusted, true, "should be a trusted source");

    await (expectThrow(instance.claimFunds(
      questionOne.id,
      { from: playerOne, gas: 1000000 }
    )));
  }));

  it('should handle claiming of funds on a resolved question', async (() => {
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

    const instance = await (PredictionMarket.new(
      { from: admin }
    ));

    await (instance.addQuestion(
        questionOne.question,
        { from: admin }
    ));

    await (instance.addTrustedSource(
      trustedSource,
      { from: admin, gas: 1000000 }
    ));

    const _isTrusted = await (instance.trustedSources(trustedSource));
    assert.equal(_isTrusted, true, "should be a trusted source");

    await (instance.bet(
        playerOneBet.questionId,
        playerOneBet.bet,
        { from: playerOne, value: playerOneBet.amount }
    ));
    await (instance.bet(
        playerTwoBet.questionId,
        playerTwoBet.bet,
        { from: playerTwo, value: playerTwoBet.amount }
    ));

    await (instance.resolveQuestion(
      questionOne.id,
      false,
      { from: trustedSource, gas: 1000000 }
    ));

    await (expectThrow(instance.claimFunds(
      questionOne.id,
      { from: playerOne, gas: 1000000 }
    )));

    const initialPlayerTwoBalance = await (
      promisify((cb) => web3.eth.getBalance(playerTwo, cb))
    );

    await (instance.claimFunds(
      questionOne.id,
      { from: playerTwo, gas: 1000000 }
    ));

    const balance = await (
      promisify((cb) => web3.eth.getBalance(playerTwo, cb))
    );

    assert.isAbove(
      balance.toNumber(),
      initialPlayerTwoBalance.toNumber(),
      "Player two's balance wasn't credited!"
    );
  }));
});
