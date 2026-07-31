# Global Rules for GrainHero Workspace

## Automated PDF Indexing
Whenever the user uploads new research papers to the "Research Papers" folder, or whenever a prompt mentions new papers, you MUST automatically:
1. Run the `python scripts/index_research_papers.py` script.
2. Ensure the resulting `_ANALYSIS/RESEARCH_KNOWLEDGE_BASE.md` file is generated.
3. Review the newly updated knowledge base.
4. Update any relevant `.md` context files (like architecture or roadmap documents) based on the new findings.

## Context Persistence Rule
Whenever a new chat starts in this workspace, you MUST immediately use the `view_file` tool to read the `AI_CHAT_LOG.md` file in the root directory to restore the user's context and progress.

Whenever you finish a task, make a significant decision, or end a conversation, you MUST update the `AI_CHAT_LOG.md` file with a detailed summary of the recent discussion so that future sessions (regardless of the logged-in account) can resume perfectly.
