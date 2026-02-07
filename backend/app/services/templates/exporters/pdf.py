"""
EduMetrics Templates - PDF Exporter

Generates PDF reports from ReportOutput using weasyprint.

PHASE-2C CONSTRAINT: Export only, no computation.
"""
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Optional
import html

# Lazy import to avoid dependency issues if weasyprint not installed
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False

from app.services.templates.base import (
    ReportOutput,
    ReportSection,
    Table,
    TableRow,
    TableCell,
)


# Default CSS for NBA/NAAC reports
DEFAULT_CSS = """
@page {
    size: A4;
    margin: 2cm;
    @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #666;
    }
}

body {
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #333;
}

.report-header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #333;
    padding-bottom: 15px;
}

.report-header h1 {
    font-size: 16px;
    margin: 5px 0;
    color: #000;
}

.report-header .institution {
    font-size: 18px;
    font-weight: bold;
}

.report-header .metadata {
    font-size: 10px;
    color: #666;
    margin-top: 10px;
}

.section {
    margin: 15px 0;
    page-break-inside: avoid;
}

.section-title {
    font-size: 13px;
    font-weight: bold;
    color: #000;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
    margin-bottom: 10px;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10px;
}

th, td {
    border: 1px solid #999;
    padding: 5px 8px;
    text-align: left;
}

th {
    background-color: #f0f0f0;
    font-weight: bold;
}

tr:nth-child(even) {
    background-color: #fafafa;
}

.level-0 { background-color: #ffcccc; }
.level-1 { background-color: #ffffcc; }
.level-2 { background-color: #ccffcc; }
.level-3 { background-color: #99ff99; }

.target-met { color: #006600; font-weight: bold; }
.target-not-met { color: #cc0000; font-weight: bold; }

.caption {
    font-style: italic;
    font-size: 9px;
    color: #666;
    margin-top: 5px;
}

.notes {
    font-size: 9px;
    color: #666;
    margin-top: 10px;
    padding-left: 15px;
}

.notes li {
    margin: 3px 0;
}

.evidence-section {
    margin-top: 20px;
    padding: 10px;
    background-color: #f5f5f5;
    border: 1px dashed #999;
}

.footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 1px solid #ccc;
    font-size: 9px;
    color: #666;
    text-align: center;
}

.priority-high { background-color: #ffcccc; }
.priority-medium { background-color: #ffffcc; }
.priority-low { background-color: #ccffcc; }
"""


class PDFExporter:
    """
    PDF Exporter for ReportOutput.
    
    Uses weasyprint for HTML → PDF conversion.
    """
    
    def __init__(self, custom_css: Optional[str] = None):
        """
        Initialize PDF exporter.
        
        Args:
            custom_css: Optional custom CSS to override defaults
        """
        if not WEASYPRINT_AVAILABLE:
            raise ImportError(
                "weasyprint is required for PDF export. "
                "Install with: pip install weasyprint"
            )
        
        self.css = custom_css or DEFAULT_CSS
    
    def export(self, report: ReportOutput) -> bytes:
        """
        Export ReportOutput to PDF bytes.
        
        Args:
            report: ReportOutput object to export
            
        Returns:
            PDF file as bytes
        """
        html_content = self._render_html(report)
        
        # Generate PDF
        pdf_file = BytesIO()
        HTML(string=html_content).write_pdf(
            pdf_file,
            stylesheets=[CSS(string=self.css)]
        )
        
        return pdf_file.getvalue()
    
    def export_to_file(self, report: ReportOutput, path: Path) -> None:
        """Export ReportOutput to PDF file."""
        pdf_bytes = self.export(report)
        path.write_bytes(pdf_bytes)
    
    def _render_html(self, report: ReportOutput) -> str:
        """Render ReportOutput as HTML."""
        lines = [
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            "<meta charset='UTF-8'>",
            f"<title>{html.escape(report.title)}</title>",
            "</head>",
            "<body>",
        ]
        
        # Header
        lines.append(self._render_header(report))
        
        # Sections
        for section in report.sections:
            lines.append(self._render_section(section))
        
        # Warnings
        if report.warnings:
            lines.append(self._render_warnings(report.warnings))
        
        # Footer
        lines.append(self._render_footer(report))
        
        lines.extend(["</body>", "</html>"])
        
        return "\n".join(lines)
    
    def _render_header(self, report: ReportOutput) -> str:
        """Render report header."""
        m = report.metadata
        return f"""
        <div class="report-header">
            <div class="institution">{html.escape(m.institution_name or 'Institution')}</div>
            <div>{html.escape(m.department_name)}</div>
            <h1>{html.escape(report.title)}</h1>
            <div class="metadata">
                Program: {html.escape(m.program_name)} | 
                Batch: {html.escape(m.batch)} | 
                Academic Year: {html.escape(m.academic_year)}
                {f'| Semester: {m.semester}' if m.semester else ''}
            </div>
        </div>
        """
    
    def _render_section(self, section: ReportSection, level: int = 2) -> str:
        """Render a report section."""
        lines = [f"<div class='section'>"]
        lines.append(f"<h{level} class='section-title'>{html.escape(section.title)}</h{level}>")
        
        # Render content based on type
        if isinstance(section.content, Table):
            lines.append(self._render_table(section.content))
        elif isinstance(section.content, dict):
            lines.append(self._render_dict(section.content))
        else:
            lines.append(f"<p>{html.escape(str(section.content))}</p>")
        
        # Notes
        if section.notes:
            lines.append("<ul class='notes'>")
            for note in section.notes:
                lines.append(f"<li>{html.escape(note)}</li>")
            lines.append("</ul>")
        
        # Evidence link
        if section.evidence:
            lines.append(
                f"<div class='evidence-link'>Evidence: {html.escape(section.evidence.label)}</div>"
            )
        
        # Subsections
        for subsection in section.subsections:
            lines.append(self._render_section(subsection, level + 1))
        
        lines.append("</div>")
        return "\n".join(lines)
    
    def _render_table(self, table: Table) -> str:
        """Render a table."""
        lines = [f"<table class='{table.css_class}'>"]
        
        # Headers
        lines.append("<thead><tr>")
        for header in table.headers:
            lines.append(f"<th>{html.escape(header)}</th>")
        lines.append("</tr></thead>")
        
        # Body
        lines.append("<tbody>")
        for row in table.rows:
            row_class = f" class='{row.css_class}'" if row.css_class else ""
            lines.append(f"<tr{row_class}>")
            
            for cell in row.cells:
                cell_class = f" class='{cell.css_class}'" if cell.css_class else ""
                colspan = f" colspan='{cell.colspan}'" if cell.colspan > 1 else ""
                rowspan = f" rowspan='{cell.rowspan}'" if cell.rowspan > 1 else ""
                
                lines.append(
                    f"<td{cell_class}{colspan}{rowspan}>"
                    f"{html.escape(cell.formatted)}"
                    f"</td>"
                )
            
            lines.append("</tr>")
        lines.append("</tbody>")
        
        lines.append("</table>")
        
        # Caption
        if table.caption:
            lines.append(f"<div class='caption'>{html.escape(table.caption)}</div>")
        
        return "\n".join(lines)
    
    def _render_dict(self, data: dict) -> str:
        """Render a dictionary as key-value pairs."""
        lines = ["<table class='key-value'>"]
        for key, value in data.items():
            if key.startswith("_"):
                continue
            formatted_key = key.replace("_", " ").title()
            lines.append(
                f"<tr><th>{html.escape(formatted_key)}</th>"
                f"<td>{html.escape(str(value))}</td></tr>"
            )
        lines.append("</table>")
        return "\n".join(lines)
    
    def _render_warnings(self, warnings: list) -> str:
        """Render warnings section."""
        if not warnings:
            return ""
        
        lines = [
            "<div class='section warnings'>",
            "<h2 class='section-title'>Data Warnings</h2>",
            "<ul>",
        ]
        for w in warnings:
            msg = w.get("message", str(w))
            lines.append(f"<li>{html.escape(msg)}</li>")
        lines.extend(["</ul>", "</div>"])
        
        return "\n".join(lines)
    
    def _render_footer(self, report: ReportOutput) -> str:
        """Render report footer."""
        m = report.metadata
        return f"""
        <div class="footer">
            Generated: {m.generated_at.strftime('%Y-%m-%d %H:%M:%S')} UTC | 
            By: {html.escape(m.generated_by)} | 
            Source: {html.escape(m.source_version)}
            <br>
            <em>This report is generated from live data and is reproducible at any time.</em>
        </div>
        """
