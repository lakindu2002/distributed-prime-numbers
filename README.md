# Distributed Consensus Based Prime Number Deciding Application

- Uses PAXOS algorithm for consencus
- Uses Bully algorithm for deciding the coordinator

This application utilizes distributed nodes to reach a concensus on a number being prime or not using PAXOS.
A Service Registry has been used to help nodes find each other and communication efficiently. 


Eureka (Spring Eureka) has been used as the service registry. The `service-registry` project contains the Eureka Server.



