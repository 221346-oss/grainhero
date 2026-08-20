# Contributing to GrainHero

First off, thank you for considering contributing to GrainHero! It's people like you that make GrainHero such a great tool for fighting food loss.

## Quick Start (5 Minutes)

1. **Fork and Clone**: Fork the repo and clone it locally.
2. **Install Dependencies**: 
   ```bash
   bun install
   ```
3. **Setup Environment**:
   ```bash
   cp .env.example .env.local
   ```
   (You don't need real keys for UI work! The app will boot with defaults.)
4. **Run Dev**:
   ```bash
   bun run dev
   ```
   Open [http://localhost:8080](http://localhost:8080).

## How to Contribute

1. **Pick an Issue**: Look for issues labeled `good first issue` or `help wanted`.
2. **Create a Branch**: `git checkout -b feat/your-feature-name`.
3. **Commit Changes**: Follow [Conventional Commits](https://www.conventionalcommits.org/).
4. **Open a PR**: Describe your changes clearly. We review all PRs within 48 hours.

## Local Development Tips

- **Supabase**: If you aren't changing the database, you don't need a local Supabase setup.
- **ML**: ONNX models run in `ml-deploy/`. Check the README there for setup.
- **UI**: We use Tailwind v4 and shadcn/ui.

## Community

Join our [Discussions](https://github.com/221346-oss/grainhero/discussions) to ask questions or propose new features!
