# GrainHero Project Context

This file maintains the ongoing context, core keywords, and history of work in the GrainHero project. Agents should read and update this file to understand the architecture and previous work.

## Keywords & Core Concepts
- **AgriHero**: Core product identity, landing page components.
- **Team Management**: Administrative capabilities for users and teams.
- **Field Incidents**: Tracking and managing issues in the fields (e.g., incoming, dismissed).
- **Roles**: Access control based on user roles such as `manager` and `platform`.
- **Operations**: Core logic, utilities, and API wrappers handled in functions like `operations.functions.ts`.
- **Tech Stack**: React, TypeScript, and file-based routing (e.g., TanStack Router).

## Work History
- Established authenticated routes structure (`_authenticated`).
- Developed role-based views for field incidents (manager incoming, platform dismissed).
- Implemented team management interfaces.
- Built AgriHero landing page components.

## Agent Instructions
Whenever you start a new conversation, refer to this context to understand existing workflows. Feel free to update this file as new core concepts or significant features are added to the codebase.
