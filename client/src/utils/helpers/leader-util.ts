import axios from "axios";
import { Role, RoleNotification } from "@distributed/types/common";
import { constructUrlToHit } from "./common-util";
import { Logger } from "./logger";
import { Agent } from "../agent";

export class Leader {
  private static MAX_ACCEPTORS: number = 2;
  private static MAX_LEARNERS: number = 1;

  /**
   * Always have 2 acceptors and 1 learner. The rest can be proposers solving the ranges.
   */
  static async prepareRolesForNodes() {
    Logger.log(`PREPARING ROLES`)

    const nodes = await Agent.getSingleton().getActiveInstances();
    const acceptors = nodes.filter((app) => app.Meta.role === Role.ACCEPTOR);
    const learners = nodes.filter((app) => app.Meta.role === Role.LEARNER);
    const unknownNodes = nodes.filter((app) => !app.Meta.role);
    const numAcceptors = acceptors.length;
    const numLearners = learners.length;

    Logger.log(`THERE ARE ${unknownNodes.length} NODES WITH NO ROLE`)
    Logger.log(`THERE ARE ${acceptors.length} ACCEPTOR NODES`)
    Logger.log(`THERE ARE ${learners.length} LEARNER NODES`)

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
      Logger.log(`DEFINING ROLE FOR ${unknownNode.ID}: ${role}`)

      definedRoles.push({
        instanceId: Number(unknownNode.ID),
        role,
        connectingPort: unknownNode.Port,
        connectingIp: unknownNode.Meta.ip
      });

    });
    Logger.log(`ROLES PREPARED`)
    await this.notifyRoles(definedRoles);
  }

  /**
   * Update service registry where all node informations are updated with new roles
   * All nodes are informed about their role.
   * @param nodesWithRoles the nodes with the newly defined roles
   */
  private static async notifyRoles(nodesWithRoles: RoleNotification[]) {
    const promises = nodesWithRoles.map(async (nodeWithRole) => {
      await Agent.getSingleton().updateInstanceMeta(nodeWithRole.instanceId.toString(), { role: nodeWithRole.role });
      await axios.post(constructUrlToHit('localhost', nodeWithRole.connectingPort, '/alerts/role'), { role: nodeWithRole.role })
    });
    await Promise.all(promises);
    Logger.log(`ROLES NOTIFIED TO ALL NODES`)
  }
}
