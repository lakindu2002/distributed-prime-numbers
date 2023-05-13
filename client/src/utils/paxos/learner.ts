import node from "@distributed/utils/node";
import { Consensus, LearnerResponse } from "@distributed/types/common";
import { Agent } from "@distributed/utils/agent";
import axios from "axios";
import { Logger, constructUrlToHit } from "@distributed/utils/helpers";

export class Learner {
  private finalizedResponses: LearnerResponse[];

  /**
   * The number of responses that the Learner must recieve from the acceptors that were computed by the proposers.
   */
  private responsesToArrive: number;

  /**
   * the number of proposers registered in the system
   */
  private proposerCount: number;

  private static singleton: Learner = new Learner();

  private constructor() {
    this.finalizedResponses = [];
  }

  static getInstance() {
    return this.singleton;
  }

  private async getLeader() {
    const leader = await Agent.getSingleton().getInstance(node.getLeaderId().toString());
    return leader;
  }

  addResponse(response: LearnerResponse) {
    this.finalizedResponses.push(response);
    this.responsesToArrive--;
  }

  setResponsesToArrive(responsesToArrive: number) {
    this.responsesToArrive = responsesToArrive;
    Logger.log(`LEARNER WILL EXPECT ${this.responsesToArrive} RESPONSES`);
  }

  getResponsesToArrive() {
    return this.responsesToArrive;
  }

  /**
   * When the proposer count is set, previous responses handled will be cleared.
   * @param proposerCount The number of proposers in the system
   */
  setProposerCount(proposerCount: number) {
    this.proposerCount = proposerCount;
    this.finalizedResponses = [];
    this.setResponsesToArrive(proposerCount);
  }

  /**
   * Count the number of messages sent by acceptors
   * If there is even one message saying its not a prime the learner will decide the number is not prime.
   * If all the nodes say its prime then acceptor will decide its prime.
   */
  proposeFinalAnswer(): Consensus {
    if (this.proposerCount !== this.finalizedResponses.length) {
      throw new Error('The number of recieved responses and the number of proposers do not tally');
    }
    const anyNonPrimeResponse = this.finalizedResponses.some((response) => response.type === 'non-prime')
    return { type: anyNonPrimeResponse ? 'non-prime' : 'prime', number: this.finalizedResponses[0].checkedNumber };
  }

  async informLeaderOnConsensus(consensus: Consensus) {
    const leader = await this.getLeader();
    const url = constructUrlToHit('/alerts/leader/consensus');
    try {
      await axios.post(url, { consensus }, {
        headers: {
          destination: `${leader.Meta.ip}:${leader.Port}`
        }
      });
      Logger.log(`INFORMED LEADER - ${leader.ID} ON CONSENSUS REACHED`);
      this.clearResponses();
    } catch (err) {
      Logger.log(`ERROR - ${err?.message}`);
    }
  }

  clearResponses() {
    this.finalizedResponses = [];
    this.proposerCount = undefined;
    this.responsesToArrive = 0;
  }
}
