import axios from "axios";
import node from "@distributed/utils/node";
import { ERROR, LearnerResponse, PrimeCheckRequest, PrimeProcess } from "@distributed/types/common";
import { Logger, constructUrlToHit, getLearner as getLearnerUtil, isPrime } from "@distributed/utils/helpers";
import { Agent } from "../agent";

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
  private static analyzeResult(primeResult: PrimeProcess, checkedBy: number): LearnerResponse | undefined {
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
      Logger.log(`PROPOSER MADE AN ERROR.`);
      return undefined;
    }
  }

  private static async informLearnerOnResponse(result: LearnerResponse) {
    const learner = await this.getLearner();
    const url = constructUrlToHit('/actions/learner/accept-response')
    try {
      await axios.post(url, { result }, {
        headers: {
          destination: `${learner.Meta.ip}:${learner.Port}`
        }
      })
      Logger.log(`INFORMED LEARNER - ${learner.ID} ABOUT THE ACCEPTED RESPONSE BY THIS ACCEPTOR`);
    } catch (err) {
      Logger.log(`ERROR - ${err?.message}`);
    }
  }

  static async verifyProposerResult(primeResponse: PrimeProcess, checkedBy: number) {
    const verifiedResponse = this.analyzeResult(primeResponse, checkedBy);
    if (!verifiedResponse) {
      Logger.log('INFORM LEADER ABOUT INVALID OUTPUT');
      const checkRequest: PrimeCheckRequest = { check: primeResponse.payload.number, start: primeResponse.payload.start, end: primeResponse.payload.end };
      const leaderId = node.getLeaderId();
      const leader = await Agent.getSingleton().getInstance(leaderId.toString());
      const url = constructUrlToHit('/actions/leader/error');
      await axios.post(url, { request: checkRequest, type: ERROR.PRIME_CHECK, madeBy: checkedBy }, {
        headers: {
          destination: `${leader.Meta.ip}:${leader.Port}`
        }
      })
    }
    Logger.log(`VERIFIED RESPONSE IN ACCEPTOR - ${node.getNodeId()} FOR NUMBER - ${primeResponse.payload.number}`);
    Logger.log(`${checkedBy} INITIALLY SAID IT WAS - ${primeResponse.action}. ACCEPTOR SAYS IT IS ${verifiedResponse.type}`);
    await this.informLearnerOnResponse(verifiedResponse);
  }
}
