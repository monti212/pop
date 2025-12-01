# Assessment Workflow Implementation Guide

## Overview
This document describes the complete implementation of the assessment workflow system for the GreyEd Teach platform, enabling teachers to upload assessments, have them automatically categorized, and enter grades for students.

## Database Schema Changes

### Migration: `create_assessment_workflow_system.sql`

**New Columns in `class_documents` table:**
- `assessment_type` TEXT - Type of assessment: 'assignment', 'test', 'quiz', or 'exam'
- `assignment_id` UUID - Links to assignments table for grade tracking
- `is_graded` BOOLEAN - Quick flag indicating if grading is complete
- `grading_status` TEXT - Detailed status: 'not_started', 'in_progress', 'completed'

**New Columns in `assignments` table:**
- `document_id` UUID - Links back to the class_documents table
- `assignment_name` TEXT - Alias for title field for consistency

**New Functions:**
1. `generate_assessment_title(type, class_id, topic, date)` - Generates smart titles
   - Format: `Assignment_Mathematics_Term1_2025-12-01`
2. `get_active_assessments_count(class_id)` - Returns count of ungraded assessments
3. `get_assessment_stats(class_id)` - Returns comprehensive assessment statistics

## Title Format

### Pattern
`{Type}_{Subject/Topic}_{Term/Period}_{Date}`

### Examples
- `Assignment_Mathematics_Term1_2025-12-01`
- `Test_Algebra_Term2_2025-03-15`
- `Quiz_Geometry_Term3_2025-10-05`
- `Exam_Final-Mathematics_Term3_2025-12-15`

### Term Calculation
- **Term 1**: January - April
- **Term 2**: May - August
- **Term 3**: September - December

## Workflow

### 1. Upload Assessment Document

**Location:** Documents tab in Classroom page

**Process:**
1. Teacher uploads document (PDF, DOCX, etc.)
2. System detects if document is an assessment (using AI/keywords)
3. Teacher selects assessment type: Assignment, Test, Quiz, or Exam
4. AI suggests title based on document content
5. Title follows format: `Type_Subject_Term_Date`
6. Document is saved with `assessment_type` field populated
7. Auto-creates linked entry in `assignments` table

### 2. View Active Work

**Location:** Feature Access card "Active Work" on Classroom Overview

**Display:**
- Shows count of assessments with `grading_status != 'completed'`
- Clicking opens filtered view of pending assessments
- Categories visible: Assignments, Tests, Quizzes, Exams

### 3. Enter Grades

**From Documents Page:**
1. Teacher clicks on assessment document in "Assessments" section
2. Opens grade entry modal
3. Modal shows:
   - Assessment title and type
   - List of all students in class
   - Input field for each student's grade
   - Points possible (from assignment)
   - Auto-calculates percentage
4. Teacher enters grades
5. Click "Save Grades"
6. System updates `student_grades` table
7. Updates `grading_status` to 'completed'
8. Updates `is_graded` flag to true

### 4. View in Grades Management

**Location:** Grades card in Feature Access

**Display:**
- All graded assessments
- Student performance by assessment type
- Category breakdown
- Grade distribution charts

## UI Components

### 1. Assessment Upload Modal
```typescript
interface AssessmentUploadModal {
  file: File;
  assessmentType: 'assignment' | 'test' | 'quiz' | 'exam';
  suggestedTitle: string;
  class: Class;
  dueDate?: Date;
}
```

### 2. Assessments Section (Documents Page)
- Tab: "Assessments"
- Filter by type: All | Assignments | Tests | Quizzes | Exams
- Filter by status: All | Not Graded | In Progress | Completed
- Cards show:
  - Assessment icon by type
  - Title
  - Upload date
  - Grading status badge
  - Click to enter grades

### 3. Grade Entry Modal
```typescript
interface GradeEntryModal {
  assessment: ClassDocument;
  students: Student[];
  assignment: Assignment;
  onSave: (grades: StudentGrade[]) => void;
}
```

**Features:**
- Student list with photos/initials
- Input fields for scores
- Real-time percentage calculation
- Bulk actions (mark all present/absent)
- Save individual or all grades
- Notes field per student

### 4. Active Work Card Update
**Before:** Shows static count
**After:**
- Dynamic count from `get_active_assessments_count()`
- Click opens assessments tab filtered by `grading_status != 'completed'`
- Badge shows number of pending

## Service Functions

### `assessmentService.ts`

```typescript
// Upload assessment document
async function uploadAssessment(
  file: File,
  classId: string,
  assessmentType: 'assignment' | 'test' | 'quiz' | 'exam',
  dueDate?: Date
): Promise<ServiceResponse<ClassDocument>>

// Get assessments for a class
async function getClassAssessments(
  classId: string,
  filters?: {
    assessmentType?: string;
    gradingStatus?: string;
  }
): Promise<ServiceResponse<ClassDocument[]>>

// Create linked assignment
async function createLinkedAssessment(
  document: ClassDocument,
  pointsPossible: number,
  dueDate?: Date
): Promise<ServiceResponse<Assignment>>

// Get active assessments count
async function getActiveAssessmentsCount(
  classId: string
): Promise<ServiceResponse<number>>

// Get assessment statistics
async function getAssessmentStats(
  classId: string
): Promise<ServiceResponse<AssessmentStats>>
```

### `gradeService.ts` (Enhanced)

```typescript
// Enter grades for an assessment
async function enterAssessmentGrades(
  assignmentId: string,
  grades: Array<{
    studentId: string;
    score: number;
    notes?: string;
  }>
): Promise<ServiceResponse<StudentGrade[]>>

// Update grading status
async function updateGradingStatus(
  documentId: string,
  status: 'not_started' | 'in_progress' | 'completed'
): Promise<ServiceResponse<void>>

// Get grades for an assessment
async function getAssessmentGrades(
  assignmentId: string
): Promise<ServiceResponse<StudentGrade[]>>
```

## Implementation Steps

### Phase 1: Database (Apply Migration)
1. Run the migration SQL provided above
2. Verify new columns exist in tables
3. Test the utility functions

### Phase 2: Services
1. Create `assessmentService.ts` with all functions
2. Enhance `gradeService.ts` with assessment-specific functions
3. Update `classDocumentService.ts` to handle assessment uploads

### Phase 3: UI Components
1. Create `AssessmentUploadModal.tsx`
2. Create `AssessmentsSection.tsx` for documents page
3. Create `GradeEntryModal.tsx`
4. Update `ClassDocumentsView.tsx` to include assessments tab
5. Update `ClassroomHomePage.tsx` active work card

### Phase 4: Integration
1. Connect upload flow to assessment detection
2. Link assessment clicks to grade entry
3. Update active work count display
4. Connect to grades management modal

### Phase 5: Testing
1. Upload various document types
2. Verify AI title generation
3. Test grade entry workflow
4. Verify count updates
5. Test grading status transitions

## AI Integration

### Assessment Detection
When a document is uploaded, analyze content for keywords:
- **Assignment indicators**: "homework", "assignment", "complete", "submit"
- **Test indicators**: "test", "exam", "assessment", "evaluation"
- **Quiz indicators**: "quiz", "pop quiz", "quick check"
- **Exam indicators**: "final exam", "midterm", "examination"

### Title Generation
Extract from document:
1. Subject/topic from headings or filename
2. Use class subject as fallback
3. Determine term from current date
4. Format as specified

## Benefits

1. **Automated Organization**: Documents automatically categorized
2. **Smart Naming**: Consistent, informative titles
3. **Streamlined Grading**: Direct path from assessment to grade entry
4. **Progress Tracking**: Clear visibility of grading status
5. **Student Performance**: Linked to existing grades system
6. **Active Work Dashboard**: Teachers see pending work at a glance

## Future Enhancements

1. **Rubric Support**: Attach grading rubrics to assessments
2. **Auto-Grading**: For multiple choice/objective questions
3. **Grade Analytics**: Performance trends over time
4. **Student Portal**: Students view their assessment grades
5. **Calendar Integration**: Due dates appear in class calendar
6. **Notifications**: Remind teachers of ungraded assessments
7. **Grade Export**: Export grades to CSV/Excel
8. **Standards Alignment**: Link assessments to learning standards
