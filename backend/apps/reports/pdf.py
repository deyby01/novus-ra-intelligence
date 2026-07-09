"""Render an AI report's Markdown content to a branded PDF document."""

from html import escape

import markdown as markdown_lib
import weasyprint

from apps.reports.models import Report

_MARKDOWN_EXTENSIONS = ["tables", "fenced_code", "sane_lists"]

_STYLESHEET = """
@page {
  margin: 2cm;
  @bottom-center {
    content: "Novus RA Intelligence · page " counter(page);
    font-family: Helvetica, Arial, sans-serif;
    font-size: 9px;
    color: #777;
  }
}
* { box-sizing: border-box; }
body {
  font-family: Georgia, "Times New Roman", serif;
  color: #1a1a1a;
  line-height: 1.6;
  font-size: 13px;
}
header { border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 24px; }
header h1 { font-size: 22px; margin: 0 0 4px; font-family: Helvetica, Arial, sans-serif; }
header p { margin: 0; font-size: 12px; color: #555; }
h1, h2, h3, h4 { font-family: Helvetica, Arial, sans-serif; line-height: 1.3; }
h1 { font-size: 20px; margin: 24px 0 10px; }
h2 { font-size: 17px; margin: 22px 0 8px; }
h3 { font-size: 14px; margin: 18px 0 6px; }
p, li { font-size: 13px; }
ul, ol { padding-left: 20px; }
strong { font-weight: 700; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
th { background: #f2f2f2; }
code { font-family: "DejaVu Sans Mono", "Courier New", monospace; font-size: 12px; }
pre { background: #f6f6f6; border: 1px solid #e0e0e0; padding: 10px; overflow-x: auto; }
"""


def _blocked_url_fetcher(url: str) -> dict:
    """Refuse every external or local resource fetch.

    Report content is Markdown produced by the AI over untrusted tenant data and
    passes raw HTML through, so a crafted ``<img src="http://...">`` or
    ``file://`` reference could make WeasyPrint issue a server-side request
    (SSRF) or read a local file. Our own document embeds no external resources,
    so blocking every fetch is safe and closes the vector entirely.
    """
    raise ValueError(f"External resources are not allowed in report PDFs: {url}")


def render_report_pdf(report: Report) -> bytes:
    """Render a completed report's Markdown content to branded PDF bytes."""
    content = report.content.strip() or "_This report has no content._"
    body_html = markdown_lib.markdown(content, extensions=_MARKDOWN_EXTENSIONS)
    title = escape(f"{report.dataset.name} — AI Analysis Report")
    generated_on = escape(report.created_at.strftime("%b %d, %Y %H:%M"))
    document = (
        "<!doctype html>"
        '<html lang="en"><head><meta charset="utf-8" />'
        f"<title>{title}</title>"
        f"<style>{_STYLESHEET}</style></head>"
        "<body>"
        f"<header><h1>{title}</h1><p>Generated on {generated_on}</p></header>"
        f"<main>{body_html}</main>"
        "</body></html>"
    )
    return weasyprint.HTML(string=document).write_pdf(url_fetcher=_blocked_url_fetcher)
