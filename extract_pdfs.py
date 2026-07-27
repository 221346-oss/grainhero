import os
from pypdf import PdfReader
import glob

pdf_dir = r"c:\Users\Nexgen\Downloads\FYP\Research Papers"
pdfs = glob.glob(os.path.join(pdf_dir, "*.pdf"))
# sort by last modified
pdfs.sort(key=lambda x: os.path.getmtime(x), reverse=True)

with open(r"c:\Users\Nexgen\.gemini\antigravity-ide\scratch\grainhero\pdf_summaries.txt", "w", encoding="utf-8") as f:
    for pdf_path in pdfs[:10]:
        f.write(f"--- File: {os.path.basename(pdf_path)} ---\n")
        try:
            reader = PdfReader(pdf_path)
            text = ""
            for i in range(min(2, len(reader.pages))):
                text += reader.pages[i].extract_text() + "\n"
            f.write(text[:2000] + "\n")
        except Exception as e:
            f.write(f"Error reading {os.path.basename(pdf_path)}: {e}\n")
        f.write("\n" + "="*50 + "\n\n")
