export interface ConnectedNode {
  instanceId: number;
  ip: string;
  port: number;
}

export interface NodeResponse {
  port: number,
  isElectionReady: boolean
  isLeader: boolean,
  ip: string
  nodeId: number,
  leaderId: number,
  role: Role
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
    message: string
  }
}

type NonPrimeResponse = {
  action: 'non-prime',
  payload: {
    number: number,
    isPrime: boolean,
    start: number,
    end: number,
    divisibleBy?: number
    message: string
  }
}

export type LearnerResponse = {
  checkedNumber: number
  type: 'prime' | 'non-prime'
  checkedBy: number
}

export type PrimeProcess = PrimeResponse | NonPrimeResponse;

export enum Role {
  PROPOSER = 'proposer',
  LEARNER = 'learner',
  ACCEPTOR = 'acceptor'
}

export interface RoleNotification {
  instanceId: number,
  role: Role
  connectingPort: number
  connectingIp: string
}

export interface ConsulInstance {
  ID: string,
  Service: string,
  Tags: string[],
  Meta: { [key: string]: any },
  Port: number,
  Address: string,
  Weights: {
    "Passing": number,
    "Warning": number
  },
  EnableTagOverride: boolean,
  Datacenter: string
}

export type Consensus = { type: 'prime' | 'non-prime', number: number }

export type PrimeCheckRequest = { start: number, end: number, check: number };