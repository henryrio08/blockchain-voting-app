// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Voting} from "../src/Voting.sol";

contract DeployVoting is Script {
    function run() external returns (Voting voting) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        string[] memory names = new string[](3);
        names[0] = "Candidate A";
        names[1] = "Candidate B";
        names[2] = "Candidate C";

        vm.startBroadcast(deployerPrivateKey);
        voting = new Voting("Demo Election", names, block.timestamp + 7 days);
        vm.stopBroadcast();

        console2.log("Voting deployed at:", address(voting));
        console2.log("Election deadline:", voting.deadline());
    }
}
