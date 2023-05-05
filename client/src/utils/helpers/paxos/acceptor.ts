import { LearnerResponse, PrimeProcess } from "@distributed/types/common";
import { constructUrlToHit, getLearner as getLearnerUtil, isPrime } from "@distributed/utils/helpers";
import axios from "axios";

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
      // proposer said it was a prime;
      return { checkedNumber: primeResult.payload.number, isPrime: true, checkedBy };
    } else if (action === 'non-prime') {
      // proposer said it was not a prime, verify if that is the case.
      const { divisibleBy, number, start } = payload;
      const isIsReallyNonPrime = !isPrime(number, start, divisibleBy);
      if (isIsReallyNonPrime) {
        return { checkedNumber: primeResult.payload.number, isPrime: false, checkedBy };
      }
      // TODO: proposer made a mistake
    }
  }

  private static async informLearnerOnResponse(result: LearnerResponse) {
    const learner = await this.getLearner();
    const url = constructUrlToHit(learner.Meta.ip, learner.Port, '/actions/learner/accept-response')
    await axios.post(url, { result })
  }

  static async verifyProposerResult(primeResponse: PrimeProcess, checkedBy: number) {
    const verifiedResponse = this.analyzeResult(primeResponse, checkedBy);
    await this.informLearnerOnResponse(verifiedResponse);
  }
}
