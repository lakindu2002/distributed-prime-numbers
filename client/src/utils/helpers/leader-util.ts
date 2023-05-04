import axios from "axios";
import { Role, RoleNotification } from "@distributed/types/common";
import { Agent } from "@distributed/utils/agent";
import node from "@distributed/utils/node";
import { constructUrlToHit } from "./common-util";

export class Leader {
  private static MAX_ACCEPTORS: number = 2;
  private static MAX_LEARNERS: number = 1;

  /**
   * Always have 2 acceptors and 1 learner. The rest can be proposers solving the ranges.
   */
  static async prepareRolesForNodes() {
    console.log(`*********** PREPARING ROLES ***********`)

    const activeAppsInRegistry = await Agent.getSingleton().getActiveInstances();
    const acceptors = activeAppsInRegistry.filter((app) => app.Meta.role === Role.ACCEPTOR);
    const learners = activeAppsInRegistry.filter((app) => app.Meta.role === Role.LEARNER);
    const unknownNodes = activeAppsInRegistry.filter((app) => {
      if (app.ID === node.getNodeId().toString()) {
        // current app
        if (node.isLeader()) {
          // node is leader, dont add to scheduling
          return false;
        } else if (!app.Meta.role) {
          // no role, add to scheduling
          return true;
        } else {
          // dont add
          return false
        }
      }
      // if not current app, check if they have a role, return True for not having role.
      return !app.Meta.role;
    }
    );
    const numAcceptors = acceptors.length;
    const numLearners = learners.length;

    console.log(`*********** THERE ARE ${unknownNodes.length} NODES WITH NO ROLE ***********`)
    console.log(`*********** THERE ARE ${acceptors.length} ACCEPTOR NODES ***********`)
    console.log(`*********** THERE ARE ${learners.length} LEARNER NODES ***********`)

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
      console.log(`*********** DEFINING ROLE - ${role} ***********`)
      definedRoles.push({
        instanceId: Number(unknownNode.ID),
        role,
        connectingPort: unknownNode.Port,
        connectingIp: unknownNode.Meta.ip
      });
    });
    console.log(`*********** ROLES PREPARED ***********`)
    await this.notifyRoles(definedRoles);
  }

  /**
   * Update service registry where all node informations are updated with new roles
   * All nodes are informed about their role.
   * @param nodesWithRoles the nodes with the newly defined roles
   */
  private static async notifyRoles(nodesWithRoles: RoleNotification[]) {
    const promises = nodesWithRoles.map(async (nodeWithRole) => {
      await axios.post(constructUrlToHit('localhost', nodeWithRole.connectingPort, '/alerts/role'), { role: nodeWithRole.role })
    });
    await Promise.all(promises);
    console.log(`*********** ROLES NOTIFIED TO ALL NODES ***********`)
  }
}
