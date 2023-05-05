import { Request, Response } from "express";
import node from "@distributed/utils/node";
import { Agent } from "@distributed/utils/agent";
import { startElection } from "@distributed/utils/helpers";
import { LearnerResponse, PrimeProcess, Role } from "@distributed/types/common";
import { Proposer } from "@distributed/utils/helpers/paxos/proposer";
import { Acceptor } from "@distributed/utils/helpers/paxos/acceptor";
import { Learner } from "@distributed/utils/helpers/paxos/learner";

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
  res.json({ message: 'LEADER_ELECTED' })
}

export const obtainNewRole = (req: Request, res: Response) => {
  const { role } = req.body as { role: Role };
  if (!role) {
    res.status(400);
    res.json({ message: 'INVALID_ROLE' })
  }
  node.setRole(role);
  res.json({ role: node.getRole(), id: node.getNodeId() })
}

export const checkPrimeInProposer = async (req: Request, res: Response) => {
  const { check, end, start } = req.body as { start: number, end: number, check: number };
  await Proposer.commencePrimeCheck(start, end, check);
  res.json({ message: 'ACCEPTED' })
}

export const acceptResponseToLearnerFromAcceptor = async (req: Request, res: Response) => {
  const { result } = req.body as { result: LearnerResponse }
  const learner = Learner.getInstance();
  learner.addResponse(result);

  if (learner.getResponsesToArrive() === 0) {
    // all responses have arrived, can compute final score
    learner.processFinalResponse();
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