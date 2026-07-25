import os
from pypdf import PdfReader
import glob
import time

pdf_dir = r"c:\Users\Nexgen\Downloads\FYP\Research Papers"
output_file = r"c:\Users\Nexgen\.gemini\antigravity-ide\scratch\grainhero\_ANALYSIS\RESEARCH_KNOWLEDGE_BASE.md"

pdfs = glob.glob(os.path.join(pdf_dir, "**/*.pdf"), recursive=True)
pdfs.sort(key=lambda x: os.path.getmtime(x), reverse=True)

print(f"Found {len(pdfs)} PDFs. Starting extraction...")

with open(output_file, "w", encoding="utf-8") as f:
    f.write("# GrainHero Research Knowledge Base\n")
    f.write("> **Auto-generated Catalog of All Research Papers**\n\n")
    
    for pdf_path in pdfs:
        filename = os.path.basename(pdf_path)
        f.write(f"## {filename}\n")
        f.write(f"**Path:** `{pdf_path}`\n\n")
        f.write("**Abstract / First Page Extract:**\n\n```text\n")
        
        try:
            reader = PdfReader(pdf_path)
            text = ""
            # Extract only the first 2 pages for speed and relevance (Abstract/Intro)
            for i in range(min(2, len(reader.pages))):
                extracted = reader.pages[i].extract_text()
                if extracted:
                    text += extracted + "\n"
            
            # Keep it concise to avoid giant files
            f.write(text[:1500].strip() + "\n...\n")
        except Exception as e:
            f.write(f"[Error extracting text: {e}]\n")
            
        f.write("```\n\n---\n\n")

print(f"Knowledge base successfully built at {output_file}")
