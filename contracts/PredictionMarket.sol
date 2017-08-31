pragma solidity ^0.4.10;

contract PredictionMarket {

    address public admin; // okay being public?
    mapping (address => bool) public trustedSources;
    mapping (address => Bet) public bets;
    mapping (uint64 => Question) public questions;
    uint public deadline;
    uint32 public numQuestions;

    struct Question {
        string question;
        bool resolved;
        bool outcome;
        uint256 numPositiveBets;
        uint256 numNegativeBets;
        uint256 positiveBetAmount;
        uint256 negativeBetAmount;
        uint64 id;
    }

    struct Bet {
        uint64 questionId;
        address bettingAddress;
        bool bet;
        uint256 amount;
    }

    event AddedTrustedSource(address source);
    event NewBet(address _better, uint64 _questionId, bool _bet, uint _amount);
    event QuestionResolved(address source, uint64 _questionId, bool _outcome);
    event QuestionAdded(string _question);
    event UpdatedQuestionData(
      string _question,
      uint64 _questionId,
      uint256 _numPositiveBets,
      uint256 _numNegativeBets,
      uint256 _positiveBetAmount,
      uint256 _negativeBetAmount
    );
    event Claimed(address claimant, uint256 amount);

    function PredictionMarket(uint duration)
        public
    {
        admin = msg.sender;
        deadline = block.number + duration;
    }

    function addTrustedSource(address source)
        public
        isAdmin
        returns (bool success)
    {
        trustedSources[source] = true;
        AddedTrustedSource(source);
        return true;
    }

    function bet(uint64 _questionId, bool _bet)
        payable
        public
        positiveBet
        returns (bool success)
    {
        bets[msg.sender] = Bet(_questionId, msg.sender, _bet, msg.value);
        NewBet(msg.sender, _questionId, _bet, msg.value);
        updateQuestion(_questionId, _bet);
        return true;
    }

    function updateQuestion(uint64 _questionId, bool _bet)
      private
      returns (bool success)
    {
      Question storage question = questions[_questionId];
      if (_bet == true) {
        question.numPositiveBets++;
        question.positiveBetAmount += msg.value;
      } else {
        question.numNegativeBets++;
        question.negativeBetAmount += msg.value;
      }
      questions[_questionId] = question;
      UpdatedQuestionData(
        question.question,
        _questionId,
        question.numPositiveBets,
        question.numNegativeBets,
        question.positiveBetAmount,
        question.negativeBetAmount
      );
      return true;
    }

    function resolveQuestion(uint64 _questionId, bool _outcome)
        public
        isTrustedSource
        isUnresolvedQuestion(_questionId)
        returns (bool success)
    {
        Question storage question = questions[_questionId];
        question.outcome = _outcome;
        question.resolved = true;
        questions[_questionId] = question;
        QuestionResolved(msg.sender, _questionId, _outcome);
        return true;
    }

    function addQuestion(string _question)
        public
        isAdmin
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
          numQuestions
        );
        questions[question.id] = question;
        QuestionAdded(_question);
        return true;
    }

    function claimFunds(uint8 _questionId)
        public
        isDeadlinePassed
        isQuestionResolved(_questionId)
        returns (bool success)
    {
        /* get bet from sender address */
        Bet storage bet = bets[msg.sender];

        /* get question from questionId */
        Question storage question = questions[bet.questionId];
        require(question.outcome == bet.bet);
        uint256 numPositiveBets = question.numPositiveBets;
        uint256 numNegativeBets = question.numNegativeBets;

        uint256 amountToTransfer;
        if (bet.bet == true) {
          amountToTransfer = (
            question.negativeBetAmount / numPositiveBets
          ) + bet.amount;
        } else {
          amountToTransfer = (
            question.positiveBetAmount/ numNegativeBets
          ) + bet.amount;
        }

        require(amountToTransfer > 0);
        msg.sender.transfer(amountToTransfer);
        Claimed(msg.sender, amountToTransfer);
        return true;
    }

    modifier isAdmin() {
        require(msg.sender == admin);
        _;
    }

    modifier isTrustedSource() {
        require(trustedSources[msg.sender]);
        _;
    }

    modifier positiveBet() {
        require(msg.value > 0);
        _;
    }

    modifier isDeadlinePassed() {
        require(block.number >= deadline);
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

    function getBet(address bettingAddress)
      constant
      public
      returns (
        uint64 _questionId,
        address _bettingAddress,
        bool _bet,
        uint256 _amount
      )
    {
      Bet storage bet = bets[bettingAddress];
      return (
        bet.questionId,
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
        uint256 _negativeBetAmount,
        uint64 _id
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
        question.negativeBetAmount,
        question.id
      );
    }
}
