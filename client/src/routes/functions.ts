import { Request, Response } from "express";
import node from "@distributed/utils/node";
import { Agent } from "@distributed/utils/agent";
import { Logger, startElection } from "@distributed/utils/helpers";
import { Consensus, LearnerResponse, PrimeCheckRequest, PrimeProcess, Role } from "@distributed/types/common";
import { Proposer } from "@distributed/utils/helpers/paxos/proposer";
import { Acceptor } from "@distributed/utils/helpers/paxos/acceptor";
import { Learner } from "@distributed/utils/helpers/paxos/learner";
import { Leader } from "@distributed/utils/leader-election/leader";

export const getHome = (_req: Request, resp: Response) => {
  return resp.json({ message: 'hello world!' })
}

export const health = (_req: Request, res: Response) => {
  res.json({ status: 'HEALTHY' });
};

export const getNodeInformation = (_req: Request, res: Response) => {
  res.json({
    nodeId: node.getNodeId(),
    leaderId: node.getLeaderId(),
    isElectionOnGoing: node.isElectionOnGoing(),
    isLeader: node.isLeader(),
    role: node.getRole(),
    isElectionReady: node.isElectionReady(),
    port: Agent.getSingleton().getPort()
  })
}

export const processElectionRequest = async (req: Request, res: Response) => {
  const { invokeNodeId } = req.body;
  if (!invokeNodeId) {
    res.status(400);
    res.json({ message: 'INVALID_NODE_ID' });
  }
  await startElection(node.getNodeId());
  res.json({ message: 'ACCEPTED' });
}

export const electNewLeader = (req: Request, res: Response) => {
  const { leaderId } = req.body;
  node.setLeaderId(leaderId);
  Logger.log(`LEADER CONFIGURED IN NODE - ${node.getLeaderId()}`)
  res.json({ message: 'LEADER_ELECTED' })
}

export const obtainNewRole = (req: Request, res: Response) => {
  const { role } = req.body as { role: Role };
  if (!role) {
    res.status(400);
    res.json({ message: 'INVALID_ROLE' })
  }
  node.setRole(role);
  Logger.log(`ROLE DETERMINED, I AM A ${node.getRole()}`)
  res.json({ role: node.getRole(), id: node.getNodeId() })
}

export const checkPrimeInProposer = async (req: Request, res: Response) => {
  const { check, end, start } = req.body as PrimeCheckRequest;
  await Proposer.commencePrimeCheck(start, end, check);
  res.json({ message: 'ACCEPTED' })
}

export const acceptResponseToLearnerFromAcceptor = async (req: Request, res: Response) => {
  const { result } = req.body as { result: LearnerResponse }
  const learner = Learner.getInstance();
  learner.addResponse(result);

  if (learner.getResponsesToArrive() === 0) {
    // all responses have arrived, can compute final score
    Logger.log('ALL RESPONSES RECIEVED. READY TO REACH CONSENSUS');

    const finalizedAnswer = learner.proposeFinalAnswer();

    Logger.log(`FINAL CONSENSUS REACHED - NUMBER ${finalizedAnswer.number} IS ${finalizedAnswer.isPrime ? 'PRIME' : 'NON-PRIME'}`);
    await learner.informLeaderOnConsensus(finalizedAnswer);
    res.json({ message: 'CONSENSUS_DELIVERED_TO_LEADER' })
    return;
  }
  res.json({ message: 'ACCEPTED' })
}

export const acceptResponseInAcceptor = async (req: Request, res: Response) => {
  const { primeResponse, proposedBy } = req.body as { primeResponse: PrimeProcess, proposedBy: number }
  await Acceptor.verifyProposerResult(primeResponse, proposedBy);
  res.json({ message: 'ACCEPTED' })
}

export const registerProposerCount = async (req: Request, res: Response) => {
  const { proposerCount } = req.body as { proposerCount: number };
  Learner.getInstance().setProposerCount(proposerCount);
  res.json({ message: 'ACCEPTED' })
}

export const deduceConsensus = async (req: Request, res: Response) => {
  const { consensus } = req.body as { consensus: Consensus };
  Logger.log(`CONSENSUS RECIEVED BY LEADER - NUMBER: ${consensus.number} IS ${consensus.isPrime ? 'PRIME' : 'NON-PRIME'}`);
  await Leader.storeConsensus(consensus);
  await Leader.prepareRolesForNodes();
  await Leader.sendNumberWithSchedulingToProposers();
  res.json({ message: 'ACCEPTED' })
}
