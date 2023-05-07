import axios from "axios";
import node from "@distributed/utils/node";
import { LearnerResponse, PrimeProcess } from "@distributed/types/common";
import { Logger, constructUrlToHit, getLearner as getLearnerUtil } from "@distributed/utils/helpers";

export class Acceptor {
  private static async getLearner() {
    const learner = await getLearnerUtil();
    return learner;
  }

  /**
   * Will analyze the prime response given by proposer.
   * @param primeResult The result given by the proposer
   * @returns A verified object that can be forwarded to the learner.
   */
  private static analyzeResult(primeResult: PrimeProcess, checkedBy: number): LearnerResponse {
    const { action, payload, } = primeResult;
    if (action === 'prime') {
      Logger.log('PROPOSER SAID IT WAS A PRIME. NOT VERIFYING');
      // proposer said it was a prime;
      return { checkedNumber: primeResult.payload.number, type: 'prime', checkedBy };
    } else if (action === 'non-prime') {
      Logger.log('PROPOSER SAID IT WAS NOT PRIME. VERIFYING');
      // proposer said it was not a prime, verify if that is the case.
      const { divisibleBy, number: checkedNumber } = payload;
      const isReallyNonPrime = checkedNumber % divisibleBy === 0;
      if (isReallyNonPrime) {
        Logger.log(`VERIFIED. ${checkedNumber} IS NOT PRIME`);
        return { checkedNumber: primeResult.payload.number, type: 'non-prime', checkedBy };
      }
      Logger.log(`PROPOSER MADE AN ERROR. IT IS ACTUALLY PRIME`);
      return { checkedNumber: primeResult.payload.number, type: 'prime', checkedBy };
    }
  }

  private static async informLearnerOnResponse(result: LearnerResponse) {
    const learner = await this.getLearner();
    const url = constructUrlToHit(learner.Meta.ip, learner.Port, '/actions/learner/accept-response')
    await axios.post(url, { result })
    Logger.log(`INFORMED LEARNER - ${learner.ID} ABOUT THE ACCEPTED RESPONSE BY THIS ACCEPTOR`);
  }

  static async verifyProposerResult(primeResponse: PrimeProcess, checkedBy: number) {
    const verifiedResponse = this.analyzeResult(primeResponse, checkedBy);
    Logger.log(`VERIFIED RESPONSE IN ACCEPTOR - ${node.getNodeId()} FOR NUMBER - ${primeResponse.payload.number}`);
    Logger.log(`${checkedBy} INITIALLY SAID IT WAS - ${primeResponse.action}. ACCEPTOR SAYS IT IS ${verifiedResponse.type}`);
    await this.informLearnerOnResponse(verifiedResponse);
  }
}
