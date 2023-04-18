import axios from "axios";
import node from "@distributed/utils/node";
import { EurekaClient } from "@distributed/utils/eureka";
import { ConnectedNode, ElectionCheck, Message } from "@distributed/types/common";

export const constructUrlToHit = (ip: string, port: number, path: string) => `http://${ip}:${port}${path}`;

export const areNodesReadyForElection = async (higherNodeChecks: ConnectedNode[]): Promise<ElectionCheck[]> => {
  const promises = higherNodeChecks.map(async (higherNode) => {
    const resp = await axios.get<ElectionCheck>(constructUrlToHit(higherNode.ip, higherNode.port, '/election/ready'))
    return resp.data;
  })
  const responses = await Promise.all(promises);
  return responses;
};

/**
 * Fetch all connected nodes in service regsitry in custom shape
 * @returns Connected Nodes.
 */
const getAllConnectedNodes = (): ConnectedNode[] => {
  return EurekaClient
    .getSingleton()
    .getInstances()
    .map((higherNode) => ({ port: Number((higherNode.port as any).$), ip: higherNode.ipAddr, instanceId: Number(higherNode.instanceId) }));
};

/**
 * Filter nodes based on a condition
 * @param connectedNodes the connected nodes in the service registry
 * @param currentNodeId the instance id of the current node
 * @returns all nodes that have higher instance id than connected node.
 */
const getHigherNodes = (connectedNodes: ConnectedNode[], currentNodeId: number) => {
  return connectedNodes.filter((connectedNode) => connectedNode.instanceId > currentNodeId);
};

/**
 * Check if the nodes are ready to begin an election.
 * This will be determined by two aspects.
 *    - If there is already a leader, it is not ready.
 *    - If the election is ongoing, it is not ready to start a new election.
 * @param higherNodes The nodes that have a higher instance ID than current node.
 * @returns boolean to check if election can be started.
 */
const areHigherNodesReadyForElection = async (higherNodes: ConnectedNode[]) => {
  const checks = await areNodesReadyForElection(higherNodes);
  return checks.some((check) => check.isElectionReady);
};

export const startElection = async (currentNodeId: number) => {
  node.setElectionOnGoing(true); // began an election.

  const connectedNodes = getAllConnectedNodes();
  const higherNodes = getHigherNodes(connectedNodes, currentNodeId);

  if (higherNodes.length === 0) {
    // no more nodes higher than connected node.
    // make connected node the leader.
    await node.setLeaderId(currentNodeId, true);
    node.setElectionOnGoing(false);
    return;
  }

  const isElectionAllowed = await areHigherNodesReadyForElection(higherNodes);

  if (!isElectionAllowed) {
    node.setElectionOnGoing(false);
    // no election, either there is a leader, or there is an ongoing election, so don't start up a new election.
    return;
  }

  const promises = higherNodes.map(async (electingNode) => {
    const electionUrl = constructUrlToHit(electingNode.ip, electingNode.port, '/election');
    await axios.post(electionUrl, { invokeNodeId: currentNodeId })
  });
  await Promise.all(promises);
}

export const onConnectedToServer = async () => {
  const nodeId = node.getNodeId();
  await startElection(nodeId)
};

/**
 * notifies the leader to all the connected nodes.
 * @param leaderId the leader of the system
 */
const notifyLeaderElected = async (leaderId: number) => {
  const connectedNodes = getAllConnectedNodes();
  const requests = connectedNodes.map(async (connectedNode) => {
    const url = constructUrlToHit(connectedNode.ip, connectedNode.port, '/election/completed')
    const payload = {
      leaderId
    }
    await axios.post(url, payload);
  })
  await Promise.all(requests);
}

/**
 * broadcasts a message to all connected nodes.
 * @param payload message to broadcast
 */
export const broadcastMessage = async ({ action, payload }: Message) => {
  switch (action) {
    case 'leader_elected': {
      await notifyLeaderElected(payload.leaderId);
      break;
    }
  }
}