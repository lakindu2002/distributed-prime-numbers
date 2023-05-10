import node from "@distributed/utils/node";
import { PrimeProcess } from "@distributed/types/common";
import axios from "axios";
import { isPrime, Logger, constructUrlToHit } from "@distributed/utils/helpers";
import { getAllAcceptors } from "@distributed/utils/helpers/common";
import cache from "@distributed/utils/helpers/cache";

export class Proposer {
  /**
   * gets a random acceptor
   */
  static getRandomAcceptor = async () => {
    const acceptors = await getAllAcceptors();
    const randomAcceptor = acceptors[Math.floor(Math.random() * acceptors.length)];
    return randomAcceptor;
  };

  static commencePrimeCheck = async (start: number, end: number, check: number) => {
    const cacheKey = `${check}#${start}#${end}`;
    const cacheResp = await cache.getItemFromCache(cacheKey);
    let response: PrimeProcess;
    if (!!cacheResp && cacheResp !== null) {
      // cache hit
      Logger.log('PRIME PROCESS WAS A CACHE HIT')
      response = JSON.parse(cacheResp) as PrimeProcess;
      await this.pushPrimeCheckToRandomAcceptor(response);
    } else {
      // cache miss
      response = isPrime(check, start, end);
      await cache.saveItemToCache(cacheKey, JSON.stringify(response));
    }
    await this.pushPrimeCheckToRandomAcceptor(response);
    Logger.log(`PROPOSER - ${node.getNodeId()} TRACKED RANGES - ${start} TO ${end} FOR NUMBER - ${check} AND IDENTIFIED AS ${response.action}`);
  }

  /**
   * pushes the prime response to a random acceptor
   * @param response the prime response indiciating if the number was prime or not.
   */
  static pushPrimeCheckToRandomAcceptor = async (response: PrimeProcess) => {
    const randomAcceptor = await this.getRandomAcceptor();
    const { Meta, Port } = randomAcceptor;
    const { ip } = Meta;

    const url = constructUrlToHit('/actions/acceptor/accept-response')
    try {
      await axios.post(url, { primeResponse: response, proposedBy: node.getNodeId() }, {
        headers: {
          destination: `${ip}:${Port}`
        }
      })
      Logger.log(`RESPONSE PUSHED TO ACCEPTOR - ${randomAcceptor.ID}`);
    } catch (err) {
      Logger.log(`ERROR - ${err?.message}`);
    }
  }
}

