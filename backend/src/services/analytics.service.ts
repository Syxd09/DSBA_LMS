import prisma from './db';

/**
 * Analytics Service for Teacher-Student Feedback System
 * All calculations are deterministic - NO AI/ML
 */

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate average marks for a student in a specific subject up to a semester
 * 
 * @param studentId - Student ID
 * @param subjectId - Subject ID
 * @param semester - Semester number (inclusive)
 * @returns Average marks (0-100) or null if no marks exist
 */
export async function calculateAverageMarks(
    studentId: string,
    subjectId: string,
    semester: number
): Promise<number | null> {
    // Get all exam marks for this student in this subject up to the semester
    const marks = await prisma.studentMark.findMany({
        where: {
            studentId,
            exam: {
                subjectId,
                semester: {
                    lte: semester  // Less than or equal to semester
                }
            }
        },
        select: {
            marksObtained: true,
            subQuestion: {
                select: {
                    maxMarks: true
                }
            }
        }
    });

    if (marks.length === 0) {
        return null;  // No marks available yet
    }

    const sumObtained = marks.reduce((acc, mark) => acc + mark.marksObtained, 0);
    const sumMax = marks.reduce((acc, mark) => acc + mark.subQuestion.maxMarks, 0);

    if (sumMax === 0) {
        return 0;
    }

    const average = (sumObtained / sumMax) * 100;

    return Math.round(average * 100) / 100;  // Round to 2 decimal places
}

/**
 * Classify marks into performance bands
 * 
 * @param avgMarks - Average marks (0-100)
 * @returns "HIGH" (≥75) | "MEDIUM" (50-74) | "LOW" (<50)
 */
export function calculateMarksBand(avgMarks: number | null): string | null {
    if (avgMarks === null) {
        return null;
    }

    if (avgMarks >= 75) {
        return 'HIGH';
    } else if (avgMarks >= 50) {
        return 'MEDIUM';
    } else {
        return 'LOW';
    }
}

/**
 * Convert star rating to percentage score
 * 
 * @param starRating - Star rating (1-5)
 * @returns Feedback score as percentage (20-100)
 */
export function calculateFeedbackScore(starRating: number): number {
    return (starRating / 5) * 100;
}

/**
 * Calculate alignment between teacher feedback and student performance
 * 
 * @param feedbackScore - Feedback score (converted from stars)
 * @param avgMarks - Average marks
 * @returns Alignment index (-100 to +100)
 *          Positive = Teacher overrated student
 *          Negative = Teacher underrated student
 *          Near zero (±5) = Well aligned
 */
export function calculateAlignmentIndex(
    feedbackScore: number,
    avgMarks: number | null
): number | null {
    if (avgMarks === null) {
        return null;
    }

    const alignment = feedbackScore - avgMarks;
    return Math.round(alignment * 100) / 100;  // Round to 2 decimal places
}

/**
 * Classify student risk level based on marks and alignment
 * 
 * @param avgMarks - Average marks
 * @param alignmentIndex - Alignment index
 * @returns Risk level: "CRITICAL" | "HIGH" | "MODERATE" | "STABLE"
 */
export function classifyRisk(
    avgMarks: number | null,
    alignmentIndex: number | null
): string {
    if (avgMarks === null) {
        return 'STABLE';  // Cannot assess risk without marks
    }

    // CRITICAL: Failing student (immediate intervention needed)
    if (avgMarks < 40) {
        return 'CRITICAL';
    }

    // HIGH: Large overestimation (teacher-student disconnect)
    if (alignmentIndex !== null && alignmentIndex > 30) {
        return 'HIGH';
    }

    // MODERATE: Borderline performance OR large underestimation
    if (avgMarks < 50 || (alignmentIndex !== null && alignmentIndex < -30)) {
        return 'MODERATE';
    }

    // STABLE: Healthy student
    return 'STABLE';
}

/**
 * Generate category-wise insights from ratings
 * 
 * @param categoryRatings - Array of category ratings
 * @returns Array of category insights with interpretations
 */
export function generateCategoryInsights(categoryRatings: any[]): any[] {
    return categoryRatings.map(rating => ({
        categoryName: rating.category.name,
        rating: rating.rating,
        interpretation: interpretRating(rating.rating)
    }));
}

/**
 * Helper: Interpret a single rating
 */
function interpretRating(rating: number): string {
    if (rating >= 4) {
        return 'Strength';
    } else if (rating >= 3) {
        return 'Satisfactory';
    } else {
        return 'Needs Improvement';
    }
}

// ============================================================================
// ANALYTICS CALCULATION & CACHING
// ============================================================================

/**
 * Calculate complete analytics for a feedback entry
 * Creates or updates the analytics cache
 * 
 * @param feedbackId - Feedback ID
 * @returns Complete analytics object
 */
export async function calculateFullAnalytics(feedbackId: string) {
    // Get feedback with all related data
    const feedback = await prisma.teacherStudentFeedback.findUnique({
        where: { id: feedbackId },
        include: {
            categoryRatings: {
                include: {
                    category: {
                        select: { name: true, displayOrder: true }
                    }
                },
                orderBy: {
                    category: { displayOrder: 'asc' }
                }
            }
        }
    });

    if (!feedback) {
        throw new Error('Feedback not found');
    }

    // Step 1: Calculate average marks
    const avgMarks = await calculateAverageMarks(
        feedback.studentId,
        feedback.subjectId,
        feedback.semester
    );

    // Step 2: Calculate marks band
    const marksBand = calculateMarksBand(avgMarks);

    // Step 3: Calculate feedback score
    const feedbackScore = calculateFeedbackScore(feedback.starRating);

    // Step 4: Calculate alignment index
    const alignmentIndex = calculateAlignmentIndex(feedbackScore, avgMarks);

    // Step 5: Classify risk
    const riskLevel = classifyRisk(avgMarks, alignmentIndex);

    // Step 6: Generate category insights
    const categoryInsights = generateCategoryInsights(feedback.categoryRatings);

    // Create or update analytics cache
    const analytics = await prisma.feedbackAnalyticsCache.upsert({
        where: { feedbackId },
        create: {
            feedbackId,
            avgMarks,
            marksBand,
            feedbackScore,
            alignmentIndex,
            riskLevel,
            categoryInsights: JSON.stringify(categoryInsights),
            calculatedAt: new Date(),
            marksUpdatedAt: new Date(),
            isStale: false
        },
        update: {
            avgMarks,
            marksBand,
            feedbackScore,
            alignmentIndex,
            riskLevel,
            categoryInsights: JSON.stringify(categoryInsights),
            calculatedAt: new Date(),
            isStale: false
        }
    });

    return {
        ...analytics,
        categoryInsights: categoryInsights  // Return parsed array
    };
}

/**
 * Get analytics for a feedback entry (with automatic recalculation if stale)
 * 
 * @param feedbackId - Feedback ID
 * @returns Analytics object (fresh or recalculated)
 */
export async function getAnalytics(feedbackId: string) {
    // Check if cache exists
    const cached = await prisma.feedbackAnalyticsCache.findUnique({
        where: { feedbackId }
    });

    // No cache or stale cache → recalculate
    if (!cached || cached.isStale) {
        return await calculateFullAnalytics(feedbackId);
    }

    // Return fresh cache
    return {
        ...cached,
        categoryInsights: JSON.parse(cached.categoryInsights as string)
    };
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidate analytics cache for a student/subject/semester
 * Called when marks are updated
 * 
 * @param studentId - Student ID
 * @param subjectId - Subject ID  
 * @param semester - Semester number
 */
export async function invalidateCacheForStudent(
    studentId: string,
    subjectId: string,
    semester: number
): Promise<void> {
    await prisma.feedbackAnalyticsCache.updateMany({
        where: {
            feedback: {
                studentId,
                subjectId,
                semester
            }
        },
        data: {
            isStale: true,
            marksUpdatedAt: new Date()
        }
    });
}

// ============================================================================
// BATCH RECALCULATION
// ============================================================================

/**
 * Recalculate all stale analytics
 * Used for manual recalculation or scheduled jobs
 * 
 * @param filters - Optional filters (studentId, subjectId, semester, departmentId)
 * @returns Number of analytics recalculated
 */
export async function recalculateStaleAnalytics(filters?: {
    studentId?: string;
    subjectId?: string;
    semester?: number;
    departmentId?: string;
}): Promise<number> {
    // Build where clause
    const whereClause: any = {
        isStale: true
    };

    if (filters?.studentId) {
        whereClause.feedback = { ...whereClause.feedback, studentId: filters.studentId };
    }
    if (filters?.subjectId) {
        whereClause.feedback = { ...whereClause.feedback, subjectId: filters.subjectId };
    }
    if (filters?.semester) {
        whereClause.feedback = { ...whereClause.feedback, semester: filters.semester };
    }
    if (filters?.departmentId) {
        whereClause.feedback = {
            ...whereClause.feedback,
            student: { departmentId: filters.departmentId }
        };
    }

    // Get all stale analytics
    const staleAnalytics = await prisma.feedbackAnalyticsCache.findMany({
        where: whereClause,
        select: { feedbackId: true }
    });

    // Recalculate in batches of 50 to avoid timeout
    let recalculated = 0;
    const batchSize = 50;

    for (let i = 0; i < staleAnalytics.length; i += batchSize) {
        const batch = staleAnalytics.slice(i, i + batchSize);
        await Promise.all(
            batch.map(async (analytics) => {
                try {
                    await calculateFullAnalytics(analytics.feedbackId);
                    recalculated++;
                } catch (error) {
                    console.error(`Failed to recalculate analytics for ${analytics.feedbackId}:`, error);
                }
            })
        );
    }

    return recalculated;
}

/**
 * Force recalculate analytics regardless of stale flag
 * Used for manual recalculation by admin
 * 
 * @param filters - Optional filters
 * @returns Number of analytics recalculated
 */
export async function forceRecalculateAll(filters?: {
    studentId?: string;
    subjectId?: string;
    semester?: number;
    departmentId?: string;
}): Promise<number> {
    // Build where clause for feedback
    const whereClause: any = {
        status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED'] }  // Only calculate for non-DRAFT
    };

    if (filters?.studentId) {
        whereClause.studentId = filters.studentId;
    }
    if (filters?.subjectId) {
        whereClause.subjectId = filters.subjectId;
    }
    if (filters?.semester) {
        whereClause.semester = filters.semester;
    }
    if (filters?.departmentId) {
        whereClause.student = { departmentId: filters.departmentId };
    }

    // Get all matching feedback
    const feedbacks = await prisma.teacherStudentFeedback.findMany({
        where: whereClause,
        select: { id: true }
    });

    // Recalculate in batches
    let recalculated = 0;
    const batchSize = 50;

    for (let i = 0; i < feedbacks.length; i += batchSize) {
        const batch = feedbacks.slice(i, i + batchSize);
        await Promise.all(
            batch.map(async (feedback) => {
                try {
                    await calculateFullAnalytics(feedback.id);
                    recalculated++;
                } catch (error) {
                    console.error(`Failed to recalculate analytics for ${feedback.id}:`, error);
                }
            })
        );
    }

    return recalculated;
}
