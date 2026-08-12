# Scaling Without Overspending: Access-Pattern-Aware Architecture for a Multi-Actor POS Platform

**Case Study — Software Engineering Academy, COMPFEST 18 x PT Skalar Solusi Digital**

## 1. Case Context

Application K is a POS and business intelligence (BI) platform for Indonesian SMEs. Beyond processing sales, it provides AI-driven business insights by analyzing transaction history and presenting recommendations to merchant owners. The platform serves four primary actors with distinct usage patterns: Cashiers, who process latency-sensitive checkout transactions; the AI analytics service, which periodically analyzes transaction history and generates business insights; Administrators, who manage product catalogs and pricing; and Merchant Owners, who access dashboards and operational reports to monitor business performance.

## 2. Constraints

As merchant adoption grows, all four workloads compete for the same backend resources despite having different priorities and access patterns. Checkout transactions require consistently low latency, while analytics, reporting, and administrative operations can generate bursts of read activity that compete with transactional workloads. The solution must maintain responsive checkout performance while supporting increasing analytical and reporting demand as Application K scales to 500+ merchants.

**Key Takeaways:**

- POS + BI platform for Indonesian SMEs.
- AI-generated business insights based on transaction history.
- Four primary actors: Cashier, AI analytics service, Administrator, and Merchant Owner.
- Each actor has different access patterns and performance requirements.
- Increasing merchant adoption results in growing concurrent demand on shared backend resources.

## 3. Background

Application K currently operates on a modest infrastructure that supports its early-stage merchant base. The platform serves four primary workloads: checkout transactions, administrative operations, AI-driven business insights, and merchant reporting. All of these workloads rely on the same operational data and are handled by a shared backend infrastructure.

Workload intensity varies significantly throughout the day. Most periods experience relatively low activity, while peak business hours generate sharp increases in concurrent requests. As Application K continues expanding toward 500+ merchants, the platform must support growing demand without compromising the reliability of day-to-day business operations.

## 4. Problem Statement

As Application K continues to grow, its current architecture must support increasing demand from transactional, analytical, administrative, and reporting workloads without compromising checkout performance or significantly increasing infrastructure costs.

Design a scalable system architecture that addresses the platform's performance bottlenecks while remaining practical for a cost-sensitive business. Your proposal should clearly justify the architectural decisions made, explain how different workload characteristics are handled, and demonstrate how the solution maintains responsive transaction processing as merchant adoption grows.

**Key Requirements:**

- Different access patterns between transactional and analytical workloads.
- Data with different update frequencies.
- The asynchronous nature of AI insight generation.
- Cost-effective scalability without relying solely on larger infrastructure.

Participants are free to choose any appropriate architecture, technology, or design pattern. Solutions will be evaluated on how well they identify the underlying problem and justify their proposed approach.

## 5. Data & Constraints

### Business

- Application K is an early-stage, cost-sensitive SaaS platform expected to scale to 500+ merchants.
- System demand is highly bursty, with peak usage concentrated during business hours.
- Infrastructure growth should remain cost-effective and avoid relying solely on continuously increasing compute capacity.

### System Constraints

- Multiple workloads share the same operational data while having different performance and consistency requirements.
- Checkout transactions require consistently low latency, even when analytical, reporting, or administrative workloads are running concurrently.
- AI-generated business insights are processed asynchronously and do not require real-time consistency with every transaction.
- The proposed architecture should improve scalability and workload isolation without assuming unlimited infrastructure resources.

### Payment Validation

- The solution should prioritize architectural improvements over simply increasing infrastructure capacity.
- The different consistency and performance requirements of transactional and analytical workloads should be reflected in the design.
- Checkout performance must remain isolated from analytical and administrative workloads under concurrent usage.

## 6. Deliverables

Participants should design and justify:

- A scaling strategy that explains whether the current architecture should be optimized, expanded, or redesigned.
- A system architecture that supports the different workload characteristics of checkout transactions, administration, reporting, and AI-generated insights.
- A strategy for handling data with different update frequencies and consistency requirements.
- An approach that keeps checkout performance responsive while analytical and administrative workloads run concurrently.
- A scalability strategy that supports merchant growth while remaining cost-effective.
- A discussion of the key trade-offs introduced by the proposed architecture, including their impact on performance, consistency, operational complexity, and maintainability.

## 7. Definition of Success

A successful solution enables Application K to scale its merchant base while maintaining consistently responsive checkout operations, even during periods of high analytical or administrative activity. The architecture should isolate different workload characteristics, support sustainable long-term growth, and improve scalability without requiring infrastructure costs to increase proportionally with demand.