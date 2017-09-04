pragma solidity ^ 0.4.10;

import "./Owned.sol";

contract Stoppable is Owned {
    bool    public running;

    event LogRunSwitch ( bool switchSetting);

    function Stoppable () {
        running = true;
    }

    modifier onlyIfRunning {
       require(running);
        _;
    }

    function runSwitch(bool onOff)
        isOwner
        returns(bool success)
    {
        running = onOff;
        LogRunSwitch ( onOff);
        return true;
    }
}
