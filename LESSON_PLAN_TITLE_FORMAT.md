# Lesson Plan Title Format Update

## Overview

All lesson plans generated or uploaded in the system now follow a standardized title format:

```
YYYY-MM-DD_Title
```

**Example:**
- Topic: "Osmosis"
- Generated on: January 18, 2026
- Title: `2026-01-18_Osmosis`

## Changes Made

### 1. AI-Generated Lesson Plans (`lessonPlanService.ts`)

**Location:** `src/services/lessonPlanService.ts` - `autoSaveLessonPlan()` function

**Changes:**
- Automatically adds date prefix to lesson plan titles
- Format: `YYYY-MM-DD_Title`
- Checks if title already has date prefix to avoid duplication
- Applied to both `class_documents` and `user_documents` tables

**Example Flow:**
1. User generates lesson plan on "Cell Division"
2. AI creates lesson plan with title "Cell Division"
3. System saves as: `2026-01-18_Cell Division`

### 2. Manual Lesson Plan Upload (`classDocumentService.ts`)

**Location:** `src/services/classDocumentService.ts` - `uploadClassDocuments()` function

**Changes:**
- Detects lesson plan documents during upload
- Automatically adds date prefix if not present
- Works for both:
  - Documents with `document_type: 'lesson_plan'`
  - Documents detected as lesson plans via content analysis

**Example:**
1. User uploads file: "Photosynthesis.pdf"
2. System detects it's a lesson plan
3. Saves with title: `2026-01-18_Photosynthesis`

### 3. Manual Document Creation (`classDocumentService.ts`)

**Location:** `src/services/classDocumentService.ts` - `createDocument()` function

**Changes:**
- When creating documents with `document_type: 'lesson_plan'`
- Automatically adds date prefix
- Checks for existing date prefix to avoid duplication

**Example:**
1. User creates new lesson plan with title "Scientific Method"
2. System saves as: `2026-01-18_Scientific Method`

## Features

### Date Format
- **Format:** YYYY-MM-DD (ISO 8601 standard)
- **Components:**
  - Year: 4 digits (e.g., 2026)
  - Month: 2 digits with leading zero (e.g., 01, 12)
  - Day: 2 digits with leading zero (e.g., 05, 18)
  - Separator: Underscore (`_`)

### Duplicate Prevention
All functions check if the title already has a date prefix using the pattern:
```javascript
/^\d{4}-\d{2}-\d{2}_/
```

This prevents double-prefixing if:
- Title already has date format
- Lesson plan is edited/re-saved
- Import from another system with date prefix

### Automatic Detection
The system automatically applies the date prefix when:
1. **AI generates a lesson plan** via the Lesson Plan Generator
2. **Files are uploaded** and detected as lesson plans
3. **Documents are created** with lesson plan type
4. **Content is detected** as containing lesson plan keywords

## Benefits

### 1. Organization
- Lesson plans are chronologically organized
- Easy to sort by date
- Quick identification of when lesson was created

### 2. Consistency
- Uniform naming across all lesson plans
- Predictable format for searching and filtering
- Professional appearance

### 3. No Duplicates
- Date prevents naming conflicts
- Same topic can be taught on different dates
- Each lesson plan is uniquely identifiable

### 4. Historical Tracking
- See when lessons were created
- Track curriculum development over time
- Identify seasonal or yearly patterns

## Examples

### Before Update
```
Osmosis
Cell Division
Photosynthesis
The Water Cycle
```

### After Update
```
2026-01-18_Osmosis
2026-01-20_Cell Division
2026-01-22_Photosynthesis
2026-01-25_The Water Cycle
```

## Technical Details

### Date Calculation
```javascript
const now = new Date();
const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
```

### Title Formatting
```javascript
// Check if title already has date prefix
if (!title.match(/^\d{4}-\d{2}-\d{2}_/)) {
  title = `${dateStr}_${title}`;
}
```

## Affected Components

### Primary Components
1. **LessonPlanGeneratorModal** - AI lesson plan generation
2. **ClassDocumentsView** - File uploads and document management
3. **UhuruFilesPage** - Document viewing and organization

### Service Functions
1. `autoSaveLessonPlan()` - AI-generated lesson plans
2. `uploadClassDocuments()` - File uploads
3. `createDocument()` - Manual document creation

## Migration Notes

### Existing Lesson Plans
- Existing lesson plans are **NOT** automatically renamed
- New lesson plans will use the new format
- Uploaded lesson plans will get the new format

### Manual Updates (Optional)
If you want to update existing lesson plans to the new format:
1. Go to the classroom documents page
2. Edit the lesson plan title
3. Add the date prefix manually: `YYYY-MM-DD_`

### Database Query
To find lesson plans without date prefix:
```sql
SELECT id, title, created_at
FROM class_documents
WHERE document_type = 'lesson_plan'
AND title NOT SIMILAR TO '\d{4}-\d{2}-\d{2}_%';
```

## User Experience

### What Users See
1. **Generating Lesson Plan:**
   - User enters topic: "Ecosystems"
   - System generates and saves as: "2026-01-18_Ecosystems"
   - Document appears in list with date-prefixed title

2. **Uploading File:**
   - User uploads: "Multiplication Basics.pdf"
   - System detects lesson plan
   - Saves as: "2026-01-18_Multiplication Basics"

3. **Creating Document:**
   - User creates new lesson plan: "Poetry Analysis"
   - System saves as: "2026-01-18_Poetry Analysis"

### Sorting and Filtering
- Lesson plans naturally sort chronologically
- Easy to find lessons from specific dates
- Search by date: `2026-01-18`
- Search by title: `Osmosis`

## Backwards Compatibility

✅ Fully backwards compatible
✅ No breaking changes to existing features
✅ Old lesson plans continue to work
✅ New format applied only to new/uploaded lesson plans

## Testing

### Test Cases
1. ✅ Generate new lesson plan via AI
2. ✅ Upload lesson plan file
3. ✅ Create manual lesson plan document
4. ✅ Verify date prefix is added
5. ✅ Verify no duplicate prefixes
6. ✅ Verify title appears correctly in UI

### Expected Results
- All new lesson plans have date prefix
- Format is consistently `YYYY-MM-DD_Title`
- No double prefixes on re-saves
- Titles display correctly in all views

## Future Enhancements

Potential improvements:
1. **Bulk Rename Tool** - Update existing lesson plans to new format
2. **Date Filter** - Filter lesson plans by date range
3. **Calendar View** - Visual calendar of lesson plans
4. **Custom Date Format** - Allow users to configure date format preference
5. **Lesson Plan Templates** - Pre-formatted templates with date

## Support

If you encounter issues:
1. Check that lesson plan is detected correctly
2. Verify `document_type` is set to `'lesson_plan'`
3. Check console for any errors
4. Ensure date prefix matches format: `YYYY-MM-DD_`

## Summary

All lesson plans now automatically include a date prefix in the format `YYYY-MM-DD_Title`. This provides better organization, prevents naming conflicts, and creates a professional, consistent naming convention across the platform.

**Format:** `2026-01-18_Osmosis`

This applies to:
- ✅ AI-generated lesson plans
- ✅ Uploaded lesson plan files
- ✅ Manually created lesson plan documents
- ✅ All future lesson plans
