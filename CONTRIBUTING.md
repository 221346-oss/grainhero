# Contributing to GrainHero

We're excited to have you join our mission to reduce post-harvest loss through technology! Whether you're fixing a bug, improving docs, or adding a new feature, your help is appreciated.

## Quick Start (5 Minutes)

1.  **Fork & Clone**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/grainhero.git
    cd grainhero
    ```
2.  **Install Dependencies**:
    ```bash
    bun install
    ```
3.  **Environment Setup**:
    ```bash
    cp .env.example .env.local
    ```
    *Note: You can run the UI without real keys by using the provided mock data.*
4.  **Run Dev Server**:
    ```bash
    bun run dev
    ```

## Finding a Task

Check our [Good First Issues](docs/GOOD_FIRST_ISSUES.md) list. We've curated 20+ independent tasks specifically for new contributors to help us reach our Community Builder milestone.

## Development Workflow

- **Branching**: `feat/description` or `fix/description`.
- **Commits**: We follow [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat: add real-time temperature graph`
  - `fix: correct z-index on mobile nav`
  - `docs: update deployment instructions`
- **Quality**: Ensure `bun run lint` passes before submitting.

## Pull Request Process

1.  Open a PR targeting the `main` branch.
2.  Fill out the PR template (automatically loaded).
3.  Ensure CI checks pass.
4.  A maintainer will review within 24-48 hours.

## Need Help?

Join our community chat or open a "Question" issue. We're here to support you!
