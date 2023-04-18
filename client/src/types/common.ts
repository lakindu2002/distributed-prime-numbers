export interface ConnectedNode {
  instanceId: number;
  ip: string;
  port: number;
}

export interface NodeCheck {
  instanceId: number,
  isElectionReady: boolean
  isLeader: boolean,
}

type LeaderElectedMessage = {
  action: 'leader_elected',
  payload: {
    leaderId: number
  }
}

export type Message = LeaderElectedMessage;

type PrimeResponse = {
  action: 'prime',
  payload: {
    number: number,
    isPrime: boolean,
    start: number,
    end: number
  }
}

type NonPrimeResponse = {
  action: 'non-prime',
  payload: {
    number: number,
    isPrime: boolean,
    start: number,
    end: number,
    divisibleBy: number
  }
}

export type PrimeProcess = PrimeResponse | NonPrimeResponse;