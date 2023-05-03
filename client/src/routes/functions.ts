import { Request, Response } from "express";
import node from "@distributed/utils/node";
import { EurekaClient } from "@distributed/utils/eureka";
import { startElection } from "@distributed/utils/helpers";
import { Role } from "@distributed/types/common";

export const getHome = (_req: Request, resp: Response) => {
  return resp.json({ message: 'hello world!' })
}

export const getAllInstances = (_req: Request, res: Response) => {
  const apps = EurekaClient.getSingleton().getInstances();
  res.json({ apps });
};

export const health = (_req: Request, res: Response) => {
  res.json({ status: 'HEALTHY' });
};

export const isReadyForElection = (_req: Request, res: Response) => {
  const isElectionReady = !node.isElectionOnGoing() && !node.isLeader();
  res.json({ isElectionReady, instanceId: node.getNodeId(), isLeader: node.isLeader() })
}

export const getNodeInformation = (_req: Request, res: Response) => {
  res.json({
    nodeId: node.getNodeId(),
    leaderId: node.getLeaderId(),
    isElectionOnGoing: node.isElectionOnGoing(),
    isLeader: node.isLeader(),
    role: node.getRole()
  })
}

export const processElectionRequest = async (req: Request, res: Response) => {
  const { invokeNodeId } = req.body;
  if (!invokeNodeId) {
    res.status(400);
    res.json({ message: 'INVALID_NODE_ID' });
  }
  await startElection(node.getNodeId());
}

export const electNewLeader = (req: Request, res: Response) => {
  const { leaderId } = req.body;
  node.setLeaderId(leaderId);
  node.setElectionOnGoing(false);
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