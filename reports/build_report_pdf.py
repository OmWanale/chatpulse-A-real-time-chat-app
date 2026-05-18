from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "ChatPulse_Project_Report.md"
OUTPUT = ROOT / "ChatPulse_Project_Report.pdf"


def parse_markdown_lines(lines):
    blocks = []
    current_list = []

    def flush_list():
        nonlocal current_list
        if current_list:
            blocks.append(("list", current_list))
            current_list = []

    for raw in lines:
        line = raw.rstrip("\n")
        if not line.strip():
            flush_list()
            blocks.append(("spacer", None))
            continue

        if line.startswith("# "):
            flush_list()
            blocks.append(("h1", line[2:].strip()))
        elif line.startswith("## "):
            flush_list()
            blocks.append(("h2", line[3:].strip()))
        elif line.startswith("- "):
            current_list.append(line[2:].strip())
        else:
            flush_list()
            blocks.append(("p", line.strip()))

    flush_list()
    return blocks


def build_pdf():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source file: {SOURCE}")

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="H1", parent=styles["Heading1"], fontSize=18, spaceAfter=8))
    styles.add(ParagraphStyle(name="H2", parent=styles["Heading2"], fontSize=12.5, spaceBefore=6, spaceAfter=4))
    styles.add(ParagraphStyle(name="Body", parent=styles["BodyText"], fontSize=10.5, leading=14))
    styles.add(
        ParagraphStyle(
            name="BulletBody",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=14,
            leftIndent=12,
        )
    )

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.9 * inch,
        title="ChatPulse Project Report",
        author="ChatPulse Team",
    )

    story = []
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    blocks = parse_markdown_lines(lines)

    for block_type, content in blocks:
        if block_type == "h1":
            story.append(Paragraph(content, styles["H1"]))
        elif block_type == "h2":
            story.append(Paragraph(content, styles["H2"]))
        elif block_type == "p":
            story.append(Paragraph(content, styles["Body"]))
        elif block_type == "list":
            items = [ListItem(Paragraph(item, styles["BulletBody"])) for item in content]
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=18))
        elif block_type == "spacer":
            story.append(Spacer(1, 6))

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
