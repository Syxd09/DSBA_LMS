"""
EduMetrics - Insights Service Module
B-02: Rule-based insights generation for students
"""
from app.services.insights.rule_engine import (
    InsightRuleEngine,
    InsightCategory,
    InsightSeverity,
    Insight,
    get_student_insights
)

__all__ = [
    'InsightRuleEngine',
    'InsightCategory', 
    'InsightSeverity',
    'Insight',
    'get_student_insights'
]
