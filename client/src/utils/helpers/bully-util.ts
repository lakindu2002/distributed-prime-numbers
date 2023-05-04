import axios from "axios";
import node from "@distributed/utils/node";
import { ConnectedNode, NodeResponse } from "@distributed/types/common";
import { constructUrlToHit, getAllConnectedNodesFromRegistry, getRandomTimeout } from "./common-util";
import { Leader } from "./leader-util";
import { Agent } from "../agent";

export const getNodesInformation = async (nodes: ConnectedNode[]): Promise<NodeResponse[]> => {
  const promises = nodes.map(async (eachNode) => {
    const resp = await axios.get<Partial<NodeResponse>>(constructUrlToHit('localhost', eachNode.port, '/information'))
    return { ...resp.data, ip: eachNode.ip } as NodeResponse;
  })
  const responses = await Promise.all(promises);
  return responses;
};

/**
 * Filter nodes based on a condition
 * @param connectedNodes the connected nodes information from APIs.
 * @param currentNodeId the instance id of the current node
 * @returns all nodes that have higher instance id than connected node.
 */
const filterOutHigherNodes = (connectedNodes: NodeResponse[], currentNodeId: number) => {
  return connectedNodes.filter((connectedNode) => {
    return connectedNode.nodeId > currentNodeId;
  });
};

/**
 * Check if the nodes are ready to begin an election.
 * This will be determined by two aspects.
 *    - If there is already a leader, it is not ready.
 *    - If the election is ongoing, it is not ready to start a new election.
 * @param nodes The nodes that have a higher instance ID than current node.
 * @returns boolean to check if election can be started.
 */
const isReadyForElection = (nodes: NodeResponse[]): boolean => {
  return nodes.some((eachNode) => eachNode.isElectionReady);
};

const getNodes = async (): Promise<NodeResponse[]> => {
  const connectedNodes = await getAllConnectedNodesFromRegistry();
  const nodeInformationWithoutCurrentNode = connectedNodes.filter((connectedNode) => connectedNode.instanceId !== node.getNodeId())
  const connectedNodesInformation = await getNodesInformation(nodeInformationWithoutCurrentNode);
  return [
    ...connectedNodesInformation,
    {
      ip: Agent.getSingleton().getIp(),
      isElectionReady: node.isElectionReady(),
      isLeader: node.isLeader(),
      leaderId: node.getLeaderId(),
      nodeId: node.getNodeId(),
      port: Agent.getSingleton().getPort(),
      role: node.getRole(),
    }
  ];
}


export const startElection = async (nodeId: number) => {
  const nodes = await getNodes();
  const leader = nodes.find((connectedNode) => connectedNode.isLeader);

  if (leader) {
    // existing leader, don't start any election
    console.log(`*********** EXISTING LEADER PRESENT - ${leader.nodeId} ***********`)
    node.setLeaderId(leader.nodeId);
    return;
  }

  const electionReady = isReadyForElection(nodes);

  if (!electionReady) {
    console.log('*********** NOT READY FOR ELECTION ***********')
    return;
  }
  console.log('*********** STARTING A NEW ELECTION ***********')
  node.setElectionOnGoing(true); // begin an election.
  const higherNodes = filterOutHigherNodes(nodes, nodeId);

  if (higherNodes.length === 0) {
    console.log(`*********** NO NODES HIGHER THAN NODE - ${nodeId}. MAKING - ${nodeId} THE LEADER ***********`)
    // no more nodes higher than connected node.
    // make the passed node ID as the leader.
    await node.setLeaderId(nodeId, true);
    await Leader.prepareRolesForNodes();
  } else {
    // there are higher nodes, let them take over.
    console.log(`*********** HAVE ${higherNodes.length} NODES WITH HIGHER ID THAN ${nodeId} ***********`)
    const promises = higherNodes.map(async (electingNode) => {
      const electionUrl = constructUrlToHit('localhost', electingNode.port, '/election');
      await axios.post(electionUrl, { invokeNodeId: nodeId })
      console.log(`*********** HANDING ELECTION OVER TO: ${nodeId} ***********`)
    });
    await Promise.all(promises);
  }
}

export const onConnectedToServer = async () => {
  const nodeId = node.getNodeId();
  const nodes = await getNodes();
  const leader = nodes.find((eachNode) => eachNode.isLeader);

  if (leader) {
    // leader is existing
    node.setLeaderId(leader.nodeId);
  } else {
    // no leader, wait for a few and then start election
    setTimeout(async () => {
      await startElection(nodeId);
    }, getRandomTimeout())
  }
};

/**
 * notifies the leader to all the connected nodes.
 * @param leaderId the leader of the system
 */
export const notifyLeaderElected = async (leaderId: number) => {
  const connectedNodes = await getAllConnectedNodesFromRegistry();
  const requests = connectedNodes.map(async (connectedNode) => {
    const url = constructUrlToHit('localhost', connectedNode.port, '/election/completed')
    const payload = {
      leaderId
    }
    await axios.post(url, payload);
  })
  await Promise.all(requests);
  console.log(`*********** ELECTED - ${leaderId} AS THE LEADER IN THIS SYSTEM. ***********`)
}
