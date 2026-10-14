// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Voting
/// @notice Educational on-chain voting for a single, public, non-private election.
/// @dev Not suitable for real elections: no identity, eligibility, privacy, or Sybil resistance.
contract Voting {
    error NotOwner();
    error ElectionClosed();
    error ElectionStillOpen();
    error AlreadyVoted(address voter);
    error InvalidCandidate(uint256 candidateId);
    error InvalidDeadline();
    error EmptyTitle();
    error NoCandidates();
    error TooManyCandidates();

    struct Candidate {
        string name;
        uint256 voteCount;
    }
    address public immutable owner;
    string public title;
    uint256 public immutable deadline;
    Candidate[] private candidates;
    mapping(address voter => bool) public hasVoted;

    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event CandidateAdded(uint256 indexed candidateId, string name);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        string memory electionTitle,
        string[] memory candidateNames,
        uint256 votingDeadline
    ) {
        if (bytes(electionTitle).length == 0) revert EmptyTitle();
        if (candidateNames.length == 0) revert NoCandidates();
        if (candidateNames.length > 100) revert TooManyCandidates();
        if (votingDeadline <= block.timestamp) revert InvalidDeadline();

        owner = msg.sender;
        title = electionTitle;
        deadline = votingDeadline;

        for (uint256 i; i < candidateNames.length; ++i) {
            if (bytes(candidateNames[i]).length == 0) revert EmptyTitle();
            candidates.push(Candidate({name: candidateNames[i], voteCount: 0}));
            emit CandidateAdded(i, candidateNames[i]);
        }
    }


}