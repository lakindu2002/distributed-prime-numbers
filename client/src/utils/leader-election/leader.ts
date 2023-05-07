import axios from "axios";
import { Consensus, ConsulInstance, PrimeCheckRequest, Role, RoleNotification } from "@distributed/types/common";
import { constructUrlToHit, getLearner, getProposers } from "@distributed/utils/helpers/common";
import { Logger } from "@distributed/utils/helpers/logger";
import { Agent } from "@distributed/utils/agent";
import { appendToFile, readTextFile } from "@distributed/utils/helpers/file-util";

export class Leader {
  private static MAX_ACCEPTORS: number = 2;
  private static MAX_LEARNERS: number = 1;

  private static numbersToCheck: number[] = [];

  /**
   * the current number position that is being processed in the system
   */
  private static currentCheckingNumberIndex = 0;

  static clearFileInformation() {
    this.numbersToCheck = [];
    this.currentCheckingNumberIndex = 0;
  }

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
    await Leader.informLearner(); // inform learners how many proposers are in the schedule.
  }

  /**
   * Update service registry where all node informations are updated with new roles
   * All nodes are informed about their role.
   * @param nodesWithRoles the nodes with the newly defined roles
   */
  private static async notifyRoles(nodesWithRoles: RoleNotification[]) {
    const promises = nodesWithRoles.map(async (nodeWithRole) => {
      await Agent.getSingleton().updateInstanceMeta(nodeWithRole.instanceId.toString(), { role: nodeWithRole.role });
      await axios.post(constructUrlToHit(nodeWithRole.connectingIp, nodeWithRole.connectingPort, '/alerts/role'), { role: nodeWithRole.role })
    });
    await Promise.all(promises);
    Logger.log(`ROLES NOTIFIED TO ALL NODES`)
  }

  /**
   * Leader will inform the learner the number of proposers there are, so that the learner can terminate the algorithm.
   */
  static async informLearner() {
    const [learner, proposers] = await Promise.all([getLearner(), getProposers()])
    const url = constructUrlToHit(learner.Meta.ip, learner.Port, '/alerts/learner/proposer-count');
    await axios.post(url, { proposerCount: proposers.length })
    Logger.log('INFORMED LEARNER ON PROPOSERS COUNT')
  }

  /**
   * Method will get the number from the list to check if its prime or not.
   * @returns number - if there is a number | undefined is there is no next number.
   */
  private static getNextNumber(): number | undefined {
    if (this.numbersToCheck.length === 0) {
      // no data, load from file
      const fileInfo = readTextFile(`${require.main.filename.split('src')[0]}/files/numbers.txt`);
      this.numbersToCheck = fileInfo.split('\n').map(Number);
    }
    const nextNumber = this.numbersToCheck[this.currentCheckingNumberIndex];
    this.currentCheckingNumberIndex++;
    return nextNumber;
  }

  /**
   * Method will get the proposers to get the count to schedule work.
   */
  private static async getProposers() {
    const instances = await Agent.getSingleton().getInstances();
    const proposers = instances.filter((instance) => instance.Meta.role === Role.PROPOSER);
    return proposers;
  }

  /**
   * Method will give work to the proposer to check number for prime
   * @param checkWork The range to check if a number is a prime
   * @param proposerId The proposer to delegate work to.
   */
  private static async deletegateWorkToProposer(checkWork: PrimeCheckRequest, proposer: ConsulInstance) {
    const url = constructUrlToHit(proposer.Meta.ip, proposer.Port, '/actions/proposer/checks/prime');
    await axios.post(url, checkWork);
    Logger.log(`WORK HAS BEEN SCHEDULED TO PROPOSER - ${proposer.ID} | NUMBER - ${checkWork.check} | START - ${checkWork.start} | RANGE - ${checkWork.end}`);
  }

  static async storeConsensus(consensus: Consensus) {
    appendToFile(`${require.main.filename.split('src')[0]}/files/results.txt`, `${consensus.number} - ${consensus.isPrime ? 'PRIME' : 'NON-PRIME'}`);
  }


  static async sendNumberWithSchedulingToProposers() {
    const numberToCheck = this.getNextNumber();
    if (!numberToCheck) {
      Logger.log('NO NEW NUMBER TO CHECK. ALL NUMBERS WERE CHECKED');
      return;
    }
    const proposers = await this.getProposers();
    const scheduledWork = this.scheduleWorkForProposers(numberToCheck, proposers.map((proposer) => proposer.ID));

    const promises = Object.entries(scheduledWork).map(async ([proposerId, work]) => {
      const proposer = proposers.find((eachProposer) => eachProposer.ID === proposerId);
      await this.deletegateWorkToProposer(work, proposer);
    });

    await Promise.all(promises);
  }

  /**
   * Schedules work for proposer nodes by dividing a given number into n equal parts,
   * where n is the number of proposer nodes.
   * @param numberToCheck the number that needs to be checked for primality.
   * @param proposerIds array of strings containing the IDs of the proposer nodes
   * @returns An object containing the range of values assigned to each proposer node.
   */
  private static scheduleWorkForProposers(numberToCheck: number, proposerIds: string[]) {
    // calculate the size of the range that each proposer node should be assigned
    const rangeSize = Math.floor(numberToCheck / proposerIds.length);

    // store the ranges that will be assigned to each proposer node.
    const ranges: {
      [proposerId: string]: PrimeCheckRequest
    } = {}

    // Assign each range to a proposer node
    for (let i = 0; i < proposerIds.length; i++) {
      const start = i * rangeSize;
      // if 1 proposer, until then will be checked.
      const end = (i === proposerIds.length - 1) ? numberToCheck : (i + 1) * rangeSize - 1;
      ranges[proposerIds[i]] = {
        end,
        start,
        check: numberToCheck
      }
    }

    return ranges;
  }
}
