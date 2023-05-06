import node from "@distributed/utils/node";
import { PrimeProcess } from "@distributed/types/common";
import { constructUrlToHit, getAllAcceptors } from "../common";
import { isPrime } from "../prime-util";
import axios from "axios";
import { Logger } from "../logger";

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
    const response = isPrime(check, start, end);
    Logger.log(`PROPOSER - ${node.getNodeId()} TRACKED RANGES - ${start} TO ${end} FOR NUMBER - ${check} AND IDENTIFIED AS ${response.action}`);
    await this.pushPrimeCheckToRandomAcceptor(response);
  }

  /**
   * pushes the prime response to a random acceptor
   * @param response the prime response indiciating if the number was prime or not.
   */
  static pushPrimeCheckToRandomAcceptor = async (response: PrimeProcess) => {
    const randomAcceptor = await this.getRandomAcceptor();
    const { Meta, Port } = randomAcceptor;
    const { ip } = Meta;

    const url = constructUrlToHit(ip, Port, '/actions/acceptor/accept-response')
    await axios.post(url, { primeResponse: response, proposedBy: node.getNodeId() })
    Logger.log(`RESPONSE PUSHED TO ACCEPTOR - ${randomAcceptor.ID}`);
  }
}

