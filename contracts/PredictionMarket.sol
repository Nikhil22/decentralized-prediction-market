pragma solidity ^0.4.10;

import "./Stoppable.sol";

contract PredictionMarket is Stoppable {

    mapping (address => bool) public trustedSources;
    mapping (uint64 => Question) public questions;
    uint64 public numQuestions;

    /* Declare arrays for data that we'd mostly likely need to loop through on the front end */
    uint64[] public questionsList;
    address[] public trustSourcesList;

    struct Question {
        string question;
        bool resolved;
        bool outcome;
        uint256 numPositiveBets;
        uint256 numNegativeBets;
        uint256 positiveBetAmount;
        uint256 negativeBetAmount;
        uint256 deadline;
        mapping(address => Bet) bets;
    }

    struct Bet {
        address bettingAddress;
        bool bet;
        uint256 amount;
    }

    event AddedTrustedSource(address source);
    event NewBet(address _better, bool _bet, uint _amount, uint64 _questionId);
    event QuestionResolved(address source, uint64 _questionId, bool _outcome);
    event QuestionAdded(string _question, uint256 _deadline);
    event UpdatedQuestionData(
      string _question,
      uint64 _questionId,
      uint256 _numPositiveBets,
      uint256 _numNegativeBets,
      uint256 _positiveBetAmount,
      uint256 _negativeBetAmount,
      uint256 _deadline
    );
    event Claimed(address claimant, uint256 amount);

    function PredictionMarket() public {}

    function addTrustedSource(address source)
        public
        isOwner
        onlyIfRunning
        returns (bool success)
    {
        trustedSources[source] = true;
        trustSourcesList.push(source);
        AddedTrustedSource(source);
        return true;
    }

    function bet(uint64 _questionId, bool _bet)
        payable
        public
        positiveBet
        isUnresolvedQuestion(_questionId)
        //isWithinQuestionDeadline(_questionId)
        onlyIfRunning
        returns (bool success)
    {
        NewBet(msg.sender, _bet, msg.value, _questionId);
        updateQuestion(_bet, _questionId);
        return true;
    }

    function updateQuestion(bool _bet, uint64 _questionId)
      private
      returns (bool success)
    {
      Bet memory bet = Bet(msg.sender, _bet, msg.value);
      Question storage question = questions[_questionId];

      if (bet.bet == true) {
        question.numPositiveBets++;
        question.positiveBetAmount += msg.value;
      } else if (bet.bet == false) {
        question.numNegativeBets++;
        question.negativeBetAmount += msg.value;
      }

      question.bets[msg.sender] = bet;
      questions[_questionId] = question;

      UpdatedQuestionData(
        question.question,
        _questionId,
        question.numPositiveBets,
        question.numNegativeBets,
        question.positiveBetAmount,
        question.negativeBetAmount,
        question.deadline
      );
      return true;
    }

    function resolveQuestion(uint64 _questionId, bool _outcome)
        public
        isTrustedSource
        isUnresolvedQuestion(_questionId)
        isWithinQuestionDeadline(_questionId)
        onlyIfRunning
        returns (bool success)
    {
        Question storage question = questions[_questionId];
        question.outcome = _outcome;
        question.resolved = true;
        questions[_questionId] = question;
        QuestionResolved(msg.sender, _questionId, _outcome);
        return true;
    }

    function addQuestion(string _question, uint256 duration)
        public
        isOwner
        onlyIfRunning
        returns (bool success)
    {
        numQuestions++;
        Question memory question = Question(
          _question,
          false,
          false,
          0,
          0,
          0,
          0,
          block.number + duration
        );
        questions[numQuestions] = question;
        questionsList.push(numQuestions);
        QuestionAdded(_question, block.number + duration);
        return true;
    }

    function claimFunds(uint64 _questionId)
        public
        isQuestionResolved(_questionId)
        isWithinQuestionDeadline(_questionId)
        onlyIfRunning
        returns (bool success)
    {
        /* get question */
        Question storage question = questions[_questionId];

        /* get bet from sender address */
        Bet memory bet = question.bets[msg.sender];

        require(question.outcome == bet.bet);
        uint256 numPositiveBets = question.numPositiveBets;
        uint256 numNegativeBets = question.numNegativeBets;
        uint256 proportion;

        uint256 amountToTransfer;
        if (bet.bet == true) {
          proportion = bet.amount / question.positiveBetAmount;

          amountToTransfer = (
            question.negativeBetAmount / numPositiveBets
          ) + bet.amount;

          amountToTransfer *= proportion;
        } else {
          proportion = bet.amount / question.negativeBetAmount;

          amountToTransfer = (
            question.positiveBetAmount/ numNegativeBets
          ) + bet.amount;

          amountToTransfer *= proportion;
        }

        require(amountToTransfer > 0);
        msg.sender.transfer(amountToTransfer);
        Claimed(msg.sender, amountToTransfer);
        return true;
    }

    function killMe() public isOwner {
      selfdestruct(msg.sender);
    }

    modifier isTrustedSource() {
        require(trustedSources[msg.sender]);
        _;
    }

    modifier positiveBet() {
        require(msg.value > 0);
        _;
    }

    modifier isUnresolvedQuestion(uint64 _questionId) {
        require(!questions[_questionId].resolved);
        _;
    }

    modifier isQuestionResolved(uint64 _questionId) {
        require(questions[_questionId].resolved);
        _;
    }

    modifier isWithinQuestionDeadline(uint64 _questionId) {
      /* get question */
      Question storage question = questions[_questionId];
      require(block.number < question.deadline);
      _;
    }

    function getBet(address bettingAddress, uint64 _questionId)
      constant
      public
      returns (
        address _bettingAddress,
        bool _bet,
        uint256 _amount
      )
    {
      Bet memory bet = questions[_questionId].bets[bettingAddress];
      return (
        bet.bettingAddress,
        bet.bet,
        bet.amount
      );
    }

    function getQuestion(uint64 questionId)
      constant
      public
      returns (
        string _question,
        bool _resolved,
        bool _outcome,
        uint256 _numPositiveBets,
        uint256 _numNegativeBets,
        uint256 _positiveBetAmount,
        uint256 _negativeBetAmount
      )
    {
      Question storage question = questions[questionId];
      return (
        question.question,
        question.resolved,
        question.outcome,
        question.numPositiveBets,
        question.numNegativeBets,
        question.positiveBetAmount,
        question.negativeBetAmount
      );
    }
}
