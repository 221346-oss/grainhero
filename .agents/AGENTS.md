# Global Rules for GrainHero Workspace

## Automated PDF Indexing

Whenever the user uploads new research papers to the "Research Papers" folder, or whenever a prompt mentions new papers, you MUST automatically:

1. Run the `python scripts/index_research_papers.py` script.
2. Ensure the resulting `_ANALYSIS/RESEARCH_KNOWLEDGE_BASE.md` file is generated.
3. Review the newly updated knowledge base.
4. Update any relevant `.md` context files (like architecture or roadmap documents) based on the new findings.

## Project Context

Whenever you start a new task or conversation in this project, you MUST read the `projcontext.md` file located at the root of the project to understand the context, keywords, and history of previous work. If you make significant structural changes or introduce new core concepts, you should update `projcontext.md` accordingly.
