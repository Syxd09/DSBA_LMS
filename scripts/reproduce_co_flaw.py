import asyncio
from typing import List, Dict, Any, Tuple
from decimal import Decimal
from uuid import uuid4, UUID
from dataclasses import dataclass

# Simulate backend types
@dataclass
class SubQuestionMock:
    id: UUID
    max_marks: Decimal
    section_id: UUID
    question_id: UUID

@dataclass
class SectionMock:
    id: UUID
    selection_mode: str
    required_questions: int

# --- THE BUGGED LOGIC (From co_service.py) ---
def simulate_buggy_co_attainment(
    qs: List[SubQuestionMock], 
    marks: Dict[Tuple[str, UUID], Decimal], 
    usn: str
) -> Decimal:
    """
    Simulates the current flawed logic in co_service.py:
    It iterates over ALL questions mapped to the CO and SUMS the marks.
    It ignores section rules (Best N).
    """
    total = Decimal("0")
    for sq in qs:
        # Get mark for (student, sub_question)
        mark = marks.get((usn, sq.id), Decimal("0"))
        total += mark
    return total

# --- THE CORRECT LOGIC (We want this) ---
def simulate_correct_co_attainment(
    qs: List[SubQuestionMock], 
    marks: Dict[Tuple[str, UUID], Decimal], 
    usn: str,
    sections: Dict[UUID, SectionMock]
) -> Decimal:
    """
    Simulates the CORRECT logic:
    It groups questions by section, applies "Best N" to the marks,
    and THEN sums the totals.
    """
    # Group by section
    by_section: Dict[UUID, List[SubQuestionMock]] = {}
    for sq in qs:
        if sq.section_id not in by_section:
            by_section[sq.section_id] = []
        by_section[sq.section_id].append(sq)
    
    total_obtained = Decimal("0")
    
    for sec_id, sec_qs in by_section.items():
        # Get section config
        section = sections.get(sec_id)
        if not section: continue
        
        # Get marks for questions in this section
        # Optimization: Score is based on QUESTION, but marks are on SUB-QUESTION.
        # We must SUM sub-question marks to get QUESTION marks first.
        
        # 1. Map QuestionID -> Total Mark
        q_marks: Dict[UUID, Decimal] = {}
        for sq in sec_qs:
            sq_mark = marks.get((usn, sq.id), Decimal("0"))
            q_id = sq.question_id
            q_marks[q_id] = q_marks.get(q_id, Decimal("0")) + sq_mark
            
        obtained_list = list(q_marks.values())
        
        # 2. Apply Best N Logic
        if section.selection_mode == "BEST_N":
            # Sort descending
            obtained_list.sort(reverse=True)
            # Take top N
            top_n = obtained_list[:section.required_questions]
            section_total = sum(top_n)
        elif section.selection_mode == "ALL":
             section_total = sum(obtained_list)
        else:
             section_total = sum(obtained_list) # Default fallback
             
        total_obtained += section_total
        
    return total_obtained

async def main():
    print("--- 🔴 REPRODUCING CO ATTAINMENT FLAW ---")
    
    # 1. Setup
    usn = "TEST_STUDENT"
    sec_id = uuid4()
    
    # Section: Answer 1 out of 2 (Best 1)
    section = SectionMock(id=sec_id, selection_mode="BEST_N", required_questions=1)
    sections = {sec_id: section}
    
    # Questions
    q1_id = uuid4()
    q2_id = uuid4()
    
    # Sub-questions (1 per question for simplicity)
    # Both mapped to SAME CO
    sq1 = SubQuestionMock(id=uuid4(), max_marks=Decimal("10"), section_id=sec_id, question_id=q1_id)
    sq2 = SubQuestionMock(id=uuid4(), max_marks=Decimal("10"), section_id=sec_id, question_id=q2_id)
    
    co_qs = [sq1, sq2]
    
    # 2. Student Answers BOTH (Extra Attempt)
    # Q1 = 8, Q2 = 9
    marks = {
        (usn, sq1.id): Decimal("8"),
        (usn, sq2.id): Decimal("9")
    }
    
    # 3. Denominator (Max Marks)
    # Logic in codebase is correct for Max Marks (Best 1 of 10, 10) -> 10
    max_for_co = Decimal("10") 
    
    # 4. Numerator (Buggy)
    numerator_buggy = simulate_buggy_co_attainment(co_qs, marks, usn)
    print(f"\n[Scneario]: Student answers 2 questions (8/10, 9/10). Required: 1.")
    print(f"[Expected]: Numerator should be 9 (Best of 8, 9). Denom: 10.")
    print(f"[Actual Bug]: Numerator is {numerator_buggy} (Sum of 8+9).")
    
    pct_buggy = (numerator_buggy / max_for_co) * 100
    print(f"[Result]: Attainment = {pct_buggy}%")
    
    if pct_buggy > 100:
        print("\n>>> 🔴 FAIL: BUG REPRODUCED (Attainment > 100%)")
    else:
        print("\n>>> 🟢 PASS: Logic seems fine (Unexpected)")

    # 5. Numerator (Correct)
    numerator_correct = simulate_correct_co_attainment(co_qs, marks, usn, sections)
    print(f"\n[Correct Logic Check]: Numerator is {numerator_correct}")
    
    pct_correct = (numerator_correct / max_for_co) * 100
    print(f"[Result]: Attainment = {pct_correct}%")
    
    if pct_correct <= 100 and numerator_correct == Decimal("9"):
         print(">>> ✅ FIX VERIFIED: Logic handles extra attempts correctly.")

if __name__ == "__main__":
    asyncio.run(main())
