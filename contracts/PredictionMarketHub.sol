pragma solidity ^0.4.10;

import "./Stoppable.sol";
import "./PredictionMarket.sol";

contract PredictionMarketHub is Stoppable {

    address[] public predictionMarkets;
    mapping (address => bool) public predictionMarketExists;

    modifier onlyIfPredictionMarket (address predictionMarket)
    {
        require(predictionMarketExists[predictionMarket] == true);
        _;
    }

    event LogNewPredictionMarket(address sponsor, address predictionMarket);
    event LogPredictionMarketStoppaed(address sender, address predictionMarket);
    event LogPredictionMarketStarted(address sender, address predictionMarket);
    event LogPredictionMarketNewOwner(address sender, address predictionMarket, address newOwner);

    function getPredictionMarketCount()
        public
        constant
        returns(uint predictionMarketCount)
    {
        return predictionMarkets.length;
    }

    function createPredictionMarket ()
        public
        returns (address predictionMarketContract)
    {
        PredictionMarket trustedPredictionMarket = new PredictionMarket();
        predictionMarkets.push(trustedPredictionMarket);
        predictionMarketExists[trustedPredictionMarket] = true;

        LogNewPredictionMarket(msg.sender, trustedPredictionMarket);
        return trustedPredictionMarket;
    }

    function stopPredictionMarket(address predictionMarket)
        isOwner
        onlyIfPredictionMarket(predictionMarket)
        returns(bool success)
    {
        PredictionMarket trustedPredictionMarket = PredictionMarket (predictionMarket);
        LogPredictionMarketStoppaed(msg.sender, predictionMarket);
        return (trustedPredictionMarket.runSwitch(false));
    }

    function startPredictionMarket(address predictionMarket)
        isOwner
        onlyIfPredictionMarket(predictionMarket)
        returns(bool success)
    {
        PredictionMarket trustedPredictionMarket = PredictionMarket (predictionMarket);
        LogPredictionMarketStarted (msg.sender, predictionMarket);
        return (trustedPredictionMarket.runSwitch(true));
    }

    function changePredictionMarketOwner(address predictionMarket, address newOwner)
        isOwner
        onlyIfPredictionMarket(predictionMarket)
        returns(bool success)
    {
        PredictionMarket trustedPredictionMarket = PredictionMarket (predictionMarket);
        LogPredictionMarketNewOwner(msg.sender, newOwner, predictionMarket);
        return (trustedPredictionMarket.changeOwner(newOwner));
    }

}
