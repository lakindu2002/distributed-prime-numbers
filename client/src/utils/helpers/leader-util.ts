import axios from "axios";
import { Role, RoleNotification } from "@distributed/types/common";
import { EurekaClient } from "@distributed/utils/eureka";
import node from "@distributed/utils/node";
import { constructUrlToHit } from "./common-util";

export class Leader {
  private static MAX_ACCEPTORS: number = 2;
  private static MAX_LEARNERS: number = 1;

  /**
   * Always have 2 acceptors and 1 learner. The rest can be proposers solving the ranges.
   */
  static async prepareRolesForNodes() {
    const activeAppsInRegistry = EurekaClient.getSingleton().getActiveInstances();
    const acceptors = activeAppsInRegistry.filter((app) => app.metadata?.role === Role.ACCEPTOR);
    const learners = activeAppsInRegistry.filter((app) => app.metadata?.role === Role.LEARNER);
    const unknownNodes = activeAppsInRegistry.filter((app) => !node.isLeader() && app.metadata?.role !== Role.ACCEPTOR && app.metadata?.role !== Role.LEARNER && app.metadata?.role !== Role.PROPOSER);

    const numAcceptors = acceptors.length;
    const numLearners = learners.length;

    let acceptorsToAdd = this.MAX_ACCEPTORS - numAcceptors;
    let learnersToAdd = this.MAX_LEARNERS - numLearners;

    // fill roles
    const definedRoles: RoleNotification[] = [];

    unknownNodes.forEach((unknownNode) => {
      let role: Role = Role.PROPOSER;

      if (acceptorsToAdd > 0) {
        role = Role.ACCEPTOR;
        acceptorsToAdd--;
      } else if (learnersToAdd > 0) {
        role = Role.LEARNER
        learnersToAdd--;
      }
      definedRoles.push({
        instanceId: Number(unknownNode.instanceId),
        role,
        connectingPort: Number((unknownNode.port as any).$),
        connectingIp: unknownNode.ipAddr
      });
    });
    await this.notifyRoles(definedRoles);
  }

  /**
   * Update service registry where all node informations are updated with new roles
   * All nodes are informed about their role.
   * @param nodesWithRoles the nodes with the newly defined roles
   */
  private static async notifyRoles(nodesWithRoles: RoleNotification[]) {
    const promises = nodesWithRoles.map(async (nodeWithRole) => {
      EurekaClient.getSingleton().updateInstance(nodeWithRole.instanceId, { role: nodeWithRole.role })
      await axios.post(constructUrlToHit(nodeWithRole.connectingIp, nodeWithRole.connectingPort, '/alerts/role'), { role: nodeWithRole.role })
    });
    await Promise.all(promises);
  }
}
