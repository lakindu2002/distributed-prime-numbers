import { LearnerResponse } from "@distributed/types/common";

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

  addResponse(response: LearnerResponse) {
    this.finalizedResponses.push(response);
    this.responsesToArrive--;
  }

  setResponsesToArrive(responsesToArrive: number) {
    this.responsesToArrive = responsesToArrive;
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
  processFinalResponse() {
    if (this.proposerCount !== this.finalizedResponses.length) {
      throw new Error('The number of recieved responses and the number of proposers do not tally');
    }

    const anyNonPrimeResponse = this.finalizedResponses.some((response) => !response.isPrime)
    // TODO: inform the master if the number is prime or not.

  }

  clearResponses() {
    this.finalizedResponses = [];
  }
}
