// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Voting
/// @notice Educational on-chain voting for a single, public, non-private election.
/// @dev Not suitable for real elections: no identity, eligibility, privacy, or Sybil resistance.
contract Voting {
    error ElectionClosed();
    error ElectionStillOpen();
    error AlreadyVoted(address voter);
    error InvalidCandidate(uint256 candidateId);
    error InvalidDeadline();
    error EmptyTitle();
    error EmptyCandidateName(uint256 candidateId);
    error NoCandidates();
    error TooManyCandidates();

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    address public immutable owner;
    string public title;
    uint256 public immutable deadline;
    uint256 public totalVotes;

    Candidate[] private candidates;
    mapping(address voter => bool) public hasVoted;

    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event CandidateAdded(uint256 indexed candidateId, string name);

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
            if (bytes(candidateNames[i]).length == 0) {
                revert EmptyCandidateName(i);
            }

            candidates.push(Candidate({name: candidateNames[i], voteCount: 0}));
            emit CandidateAdded(i, candidateNames[i]);
        }
    }

    /// @notice Cast one vote for a candidate before the deadline.
    /// @param candidateId Zero-based index of the candidate.
    function vote(uint256 candidateId) external {
        if (block.timestamp >= deadline) revert ElectionClosed();
        if (hasVoted[msg.sender]) revert AlreadyVoted(msg.sender);
        if (candidateId >= candidates.length) revert InvalidCandidate(candidateId);

        // Effects happen only after every validation passes; a revert rolls all changes back.
        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;
        totalVotes += 1;

        emit VoteCast(msg.sender, candidateId);
    }

    function getCandidate(uint256 candidateId)
        external
        view
        returns (string memory name, uint256 voteCount)
    {
        if (candidateId >= candidates.length) revert InvalidCandidate(candidateId);

        Candidate storage candidate = candidates[candidateId];
        return (candidate.name, candidate.voteCount);
    }

    function candidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice Returns live, public results. Ballots are not private.
    function results() external view returns (Candidate[] memory) {
        return candidates;
    }

    function isOpen() external view returns (bool) {
        return block.timestamp < deadline;
    }

    /// @notice Returns results only after the deadline; does not persist a finalized state.
    function finalize() external view returns (Candidate[] memory) {
        if (block.timestamp < deadline) revert ElectionStillOpen();
        return candidates;
    }
}
