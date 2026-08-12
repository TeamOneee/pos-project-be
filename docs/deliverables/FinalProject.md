# Final Project — COMPFEST SEA 18

## Description

Following the highly successful delivery of the SEAPEDIA application, SEAPEDIA's CEO, Aca, has enthusiastically showcased your work to his network. This endorsement has led to a surge in new project inquiries. However, as a small team that is committed to quality, you have the capacity to accept only one of these new challenges.

Choose your next case carefully. Your objective is to conceptualize, justify, and build a high-quality application prototype for your selected project. Success will require seamless team collaboration, a strict focus on core functionalities, and a commitment to delivering a robust, user-centric solution.

## General Rules

1. Each group chooses one case. Each case can only be chosen by a maximum of 2 groups. You can book your case here: *Case Booking SEA18*
2. Each group creates a final project GitHub repository.
3. Every application developed by the group must have the following features:
   - **User management** — The application must be able to perform account management, consisting of login, logout, new account registration, and permission settings.
   - **Business/Government Transactions** — The application must have features related to the transaction process of the application idea. For example, in an e-commerce application, there are processes for creating/changing items and making item purchases.
4. On the last day of the academy, each team must present and justify their applications. Each team may prepare a slideshow and do a live feature demo of the prototype.

## Project Case

1. **Scaling Without Overspending: Access-Pattern-Aware Architecture for a Multi-Actor POS Platform**
   Link: *Case Study COMPFEST 18 Scaling Without Overspending.pdf*
2. **Sync Without Signal: Offline-First Transaction Consistency for a Multi-App POS Platform**
   Link: *Case Study COMPFEST 18 Sync Without Signal.pdf*
3. **Sell Without Overselling: High-Concurrency Ticket Reservation Platform**
   Link: *Case Study COMPFEST 18 Sell Without Overselling.pdf*

## Deliverables (developed in parallel with your code)

1. **Functional Requirements Document (FRD)**
   - User stories & use cases for each feature
   - Role-based access definitions (Admin vs. Kasir flows)
   - Workflow descriptions (e.g., "what happens when a sale is processed")

2. **Non-Functional Requirements (NFR)**
   - Performance targets (e.g., "transaction submission < 500 ms")
   - Availability goals (e.g., "99.9% uptime")
   - Scalability considerations (e.g., "support 10× more users")
   - Security measures (e.g., password hashing, RBAC)
   - Maintainability principles (e.g., modular architecture, logging)

3. **Out-of-Scope**
   - Explicitly state what you will not build in this iteration.
     E.g., "No mobile app or automated supplier restocking in this release."

4. **Low-Level System Architecture (LLA)**
   - Diagram showing frontend, backend, database, APIs
   - Rationale for your technology choices (e.g., Express + PostgreSQL; REST vs. GraphQL)
   - Breakdown of modules/services and how they interact

5. **Database Design (ERD)**
   - Entity-Relationship Diagram
   - Table descriptions & purposes
   - Key indexes or constraints (e.g., unique email, foreign keys)
   - Notes on normalization (if applied)

6. **Testing Strategy & Coverage Plan**
   - Unit tests for core functions/services
   - Integration tests for API endpoints and data flows
   - (Optional) Manual test cases or acceptance criteria

7. **DevOps & Deployment Plan**
   - Environment setup (Docker, Vercel, Railway, Supabase, etc.)
   - .env template and configuration guidelines
   - CI/CD pipeline overview (e.g., GitHub Actions config)

8. **Final Presentation**
   - Slide deck outlining problem, architecture, and process
   - Live demo of your deployed prototype
   - Reflections on challenges, teamwork, and lessons learned

## Scoring Criteria

| Criteria | Points |
|---|---|
| Knowledge Implementation |  |
| Diagrams (use case diagram, entity relationship diagram, system design diagram) | 10% |
| Architectural Justification & Trade-offs | 25% |
| Clean Code Implementation | 10% |
| Security Implementation | 10% |
| CI/CD Implementation | 5% |
| Test Coverage & Deployment | 5% |
| Application UI/UX & Functionality | 25% |
| Presentation & Prototype Demonstration | 10% |
| Usability/Usefulness | 10% |
| **Total** | **110%** |

## Author Notes

Your team will not only write code, but you'll also operate like a real tech company. Alongside development, you'll plan, document, and communicate every step of your process. These artifacts aren't "homework before coding," but rather your living project playbook: fill them in as you go and use them to tell your story in the final presentation.

**GitHub Repository Deadline:** 23.59 WIB, 21 Agustus 2025
**Presentation File Deadline:** 06.00 WIB, 22 Agustus 2025