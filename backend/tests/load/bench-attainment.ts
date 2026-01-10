/**
 * Load Testing Benchmark for Attainment Calculation
 * 
 * Tests the optimized calculation engine with realistic data volumes
 * Target: < 2 seconds per subject
 * 
 * Run: npx ts-node tests/load/bench-attainment.ts
 */

import { AttainmentService } from '../../src/services/attainment.service';
import prisma from '../../src/services/db';

interface BenchmarkResult {
    subjectId: string;
    studentCount: number;
    coCount: number;
    duration: number;
    queriesExecuted: number;
    success: boolean;
    error?: string;
}

async function benchmarkAttainment() {
    console.log('🚀 Starting Attainment Calculation Benchmark\n');
    console.log('='.repeat(60));

    const results: BenchmarkResult[] = [];
    let totalDuration = 0;
    let successCount = 0;
    let failureCount = 0;
    let studentCount = 0;

    try {
        // Step 1: Find subjects with published exams
        console.log('\n📊 Finding test subjects with data...');

        const subjects = await prisma.subject.findMany({
            where: {
                exams: {
                    some: {
                        status: 'PUBLISHED'
                    }
                }
            },
            take: 5, // Test with 5 subjects
            include: {
                courseOutcomes: true
            }
        });

        if (subjects.length === 0) {
            console.error('❌ No subjects with published exams found');
            console.log('   Please publish some exams or run seed script');
            return;
        }

        // Find a cohort with students
        const cohort = await prisma.cohort.findFirst({
            where: {
                enrollments: {
                    some: {}
                }
            }
        });

        if (!cohort) {
            console.error('❌ No cohort with students found');
            return;
        }

        // Count students in cohort
        studentCount = await prisma.studentEnrollment.count({
            where: { cohortId: cohort.id, semester: 1 }
        });

        const subjectCount = subjects.length;

        console.log(`✅ Found cohort: ${cohort.name}`);
        console.log(`   Students: ${studentCount}`);
        console.log(`   Subjects to test: ${subjectCount}`);
        console.log('='.repeat(60));

        // Step 2: Run calculation for each subject
        for (let i = 0; i < subjects.length; i++) {
            const subject = subjects[i];
            const coCount = subject.courseOutcomes.length;

            console.log(`\n📘 Test ${i + 1}/${subjectCount}: ${subject.name}`);
            console.log(`   COs: ${coCount}`);

            const startTime = performance.now();
            let success = false;
            let error: string | undefined;

            try {
                await AttainmentService.calculateCO(
                    subject.id,
                    cohort.id,
                    1, // semester
                    '2024-25' // academic year
                );

                const endTime = performance.now();
                const duration = endTime - startTime;

                success = true;
                totalDuration += duration;
                successCount++;

                console.log(`   ✅ Success in ${duration.toFixed(2)}ms`);
                if (studentCount > 0) {
                    console.log(`   ⚡ ${(duration / studentCount).toFixed(2)}ms per student`);
                }

                results.push({
                    subjectId: subject.id,
                    studentCount,
                    coCount,
                    duration,
                    queriesExecuted: 3, // Expected with optimization
                    success
                });

                // Check if meets target
                if (duration > 2000) {
                    console.log(`   ⚠️  WARNING: Exceeded 2s target (${(duration / 1000).toFixed(2)}s)`);
                } else {
                    console.log(`   🎯 Within target (<2s)`);
                }

            } catch (err: any) {
                failureCount++;
                error = err.message;
                console.log(`   ❌ Failed: ${error}`);

                results.push({
                    subjectId: subject.id,
                    studentCount,
                    coCount,
                    duration: 0,
                    queriesExecuted: 0,
                    success: false,
                    error
                });
            }
        }

        // Step 3: Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 BENCHMARK SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${results.length}`);
        console.log(`✅ Successes: ${successCount}`);
        console.log(`❌ Failures: ${failureCount}`);

        if (successCount > 0) {
            const avgDuration = totalDuration / successCount;
            console.log(`\n⏱️  Performance Metrics:`);
            console.log(`   Average time: ${avgDuration.toFixed(2)}ms`);
            console.log(`   Fastest: ${Math.min(...results.filter(r => r.success).map(r => r.duration)).toFixed(2)}ms`);
            console.log(`   Slowest: ${Math.max(...results.filter(r => r.success).map(r => r.duration)).toFixed(2)}ms`);

            if (studentCount > 0) {
                console.log(`   Per student avg: ${(avgDuration / studentCount).toFixed(2)}ms`);
            }

            // Check target achievement
            const withinTarget = results.filter(r => r.success && r.duration < 2000).length;
            const targetPercent = (withinTarget / successCount) * 100;

            console.log(`\n🎯 Target Achievement (<2s):`);
            console.log(`   ${withinTarget}/${successCount} (${targetPercent.toFixed(1)}%)`);

            if (targetPercent === 100) {
                console.log('   🎉 All calculations met target!');
            } else if (targetPercent >= 80) {
                console.log('   ✅ Good - most calculations within target');
            } else {
                console.log('   ⚠️  Needs optimization');
            }

            // Success criteria check
            console.log('\n✅ Success Criteria Check:');
            console.log(`   [${successCount > 0 ? '✓' : '✗'}] At least one successful calculation`);
            console.log(`   [${avgDuration < 2000 ? '✓' : '✗'}] Average time < 2s`);
            console.log(`   [${failureCount === 0 ? '✓' : '✗'}] No failures`);
        }

        // Step 4: Memory usage
        const memUsage = process.memoryUsage();
        console.log(`\n💾 Memory Usage:`);
        console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);

        if (memUsage.heapUsed / 1024 / 1024 > 500) {
            console.log('   ⚠️  Warning: High memory usage detected');
        } else {
            console.log('   ✅ Memory usage within limits');
        }

        console.log('\n' + '='.repeat(60));

        // Step 5: Recommendations
        if (failureCount > 0) {
            console.log('\n💡 Recommendations:');
            console.log('   - Check failed calculations for missing data');
            console.log('   - Verify exam data is published');
            console.log('   - Ensure marks are entered for students');
            console.log('   - Ensure course outcomes are mapped to sub-questions');
        }

    } catch (error: any) {
        console.error('\n❌ Benchmark failed:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Run benchmark
benchmarkAttainment()
    .then(() => {
        console.log('\n✨ Benchmark complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
