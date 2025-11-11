# Class Documents Management System

## Overview

A comprehensive document management system that allows teachers to organize lesson plans, notes, reports, and resources in a hierarchical folder structure tied to their classes.

## Migration Reference

- **Migration File**: `20251107163726_create_class_documents_system.sql`
- **Applied**: November 7, 2025
- **Purpose**: Enable organized document storage and retrieval for teacher classes

---

## Problem Solved

Before this implementation, teachers lacked:

1. **Organized Storage**: No structured way to organize class materials
2. **Folder Hierarchy**: Documents were flat with no categorization
3. **Lesson Plan Storage**: Auto-saved lesson plans had no permanent home
4. **Document Versioning**: No way to track document changes over time
5. **Class Association**: Documents weren't explicitly tied to classes
6. **Search & Filter**: No easy way to find documents by type or class

This system provides a complete document organization solution similar to Google Drive or Dropbox, specifically designed for teacher workflows.

---

## Implementation Details

### Database Schema

#### 1. class_folders

**Purpose**: Hierarchical folder structure for organizing documents within classes.

**Columns**:
```sql
CREATE TABLE class_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,

  -- Folder Information
  folder_name text NOT NULL CHECK (length(trim(folder_name)) > 0),
  folder_type text CHECK (folder_type IN ('lesson_plans', 'notes', 'reports', 'resources', 'custom')),
  parent_folder_id uuid REFERENCES class_folders(id) ON DELETE CASCADE,

  -- Hierarchy and Path
  folder_path text NOT NULL DEFAULT '/',
  folder_depth integer DEFAULT 0 CHECK (folder_depth >= 0),

  -- Display Properties
  color text,
  icon text,
  sort_order integer DEFAULT 0,

  -- Document Counts
  document_count integer DEFAULT 0 CHECK (document_count >= 0),

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,

  -- Prevent duplicate folder names within same parent
  UNIQUE(class_id, parent_folder_id, folder_name)
);
```

**Key Features**:
- Self-referencing hierarchy (parent_folder_id)
- Folder path for breadcrumb navigation
- Depth tracking for nested structures
- Customizable display (color, icon)
- Automatic document counting
- Soft delete support

**Default Folders**:
Automatically created for each new class:
1. **Lesson Plans** 📚 (Green #10B981)
2. **Notes** 📝 (Blue #3B82F6)
3. **Reports** 📊 (Purple #8B5CF6)
4. **Resources** 🗂️ (Orange #F59E0B)

**Example Data**:
```json
{
  "id": "folder-uuid",
  "class_id": "class-123",
  "folder_name": "Unit 1: Introduction to Algebra",
  "folder_type": "lesson_plans",
  "parent_folder_id": "lesson-plans-root-uuid",
  "folder_path": "/Lesson Plans/Unit 1: Introduction to Algebra",
  "folder_depth": 1,
  "color": "#10B981",
  "icon": "📚",
  "sort_order": 1,
  "document_count": 5
}
```

#### 2. class_documents

**Purpose**: Store all class-related documents with metadata and versioning.

**Columns**:
```sql
CREATE TABLE class_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES class_folders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Document Information
  title text NOT NULL CHECK (length(trim(title)) > 0),
  document_type text NOT NULL CHECK (document_type IN ('lesson_plan', 'note', 'report', 'resource', 'other')),

  -- Content Storage
  content text,
  file_url text,
  storage_path text,
  file_extension text,
  file_size integer,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  tags text[] DEFAULT ARRAY[]::text[],

  -- Lesson Plan Specific
  is_lesson_plan boolean DEFAULT false,
  lesson_plan_confidence decimal(3,2) DEFAULT 0.0,
  lesson_plan_metadata jsonb DEFAULT '{}',
  conversation_id uuid,
  message_id uuid,
  auto_saved boolean DEFAULT false,

  -- Version Control
  version integer DEFAULT 1,
  parent_version_id uuid REFERENCES class_documents(id) ON DELETE SET NULL,

  -- Access Tracking
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  last_accessed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);
```

**Key Features**:
- Links to both class and folder for organization
- Multiple content storage options (text, file URL, storage path)
- Rich metadata and tagging system
- Lesson plan detection and auto-save
- Version control with parent reference
- Access analytics (views, downloads)
- Soft delete support

**Document Types**:
- `lesson_plan` - Structured lesson plans
- `note` - Quick notes and observations
- `report` - Student reports and assessments
- `resource` - Educational resources and materials
- `other` - Miscellaneous documents

**Example Data**:
```json
{
  "id": "doc-uuid",
  "class_id": "class-123",
  "folder_id": "folder-uuid",
  "user_id": "teacher-uuid",
  "title": "Week 1: Introduction to Variables",
  "document_type": "lesson_plan",
  "content": "# Lesson Plan: Introduction to Variables...",
  "file_url": null,
  "storage_path": null,
  "file_extension": null,
  "file_size": null,
  "metadata": {
    "duration": "45 minutes",
    "grade_level": "8th Grade",
    "subject": "Algebra"
  },
  "tags": ["algebra", "variables", "introduction"],
  "is_lesson_plan": true,
  "lesson_plan_confidence": 0.95,
  "lesson_plan_metadata": {
    "objectives": ["Understand variable concept", "Solve simple equations"],
    "materials": ["Whiteboard", "Worksheets"]
  },
  "conversation_id": "conv-uuid",
  "message_id": "msg-uuid",
  "auto_saved": true,
  "version": 1,
  "parent_version_id": null,
  "view_count": 12,
  "download_count": 3,
  "last_accessed_at": "2025-11-11T10:30:00Z"
}
```

---

### Triggers and Automation

#### 1. Auto-Create Default Folders

When a teacher creates a new class, four default folders are automatically created:

**Trigger Function**:
```sql
CREATE OR REPLACE FUNCTION create_default_class_folders()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO class_folders (class_id, folder_name, folder_type, folder_path, icon, color, sort_order)
  VALUES
    (NEW.id, 'Lesson Plans', 'lesson_plans', '/Lesson Plans', '📚', '#10B981', 1),
    (NEW.id, 'Notes', 'notes', '/Notes', '📝', '#3B82F6', 2),
    (NEW.id, 'Reports', 'reports', '/Reports', '📊', '#8B5CF6', 3),
    (NEW.id, 'Resources', 'resources', '/Resources', '🗂️', '#F59E0B', 4);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger**:
```sql
CREATE TRIGGER create_class_folders_trigger
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_default_class_folders();
```

#### 2. Maintain Folder Document Count

Automatically updates the document count when documents are added, moved, or deleted:

**Trigger Function**:
```sql
CREATE OR REPLACE FUNCTION update_folder_document_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.folder_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE class_folders
      SET document_count = document_count + 1
      WHERE id = NEW.folder_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Document moved to different folder
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      IF OLD.folder_id IS NOT NULL THEN
        UPDATE class_folders
        SET document_count = document_count - 1
        WHERE id = OLD.folder_id AND document_count > 0;
      END IF;
      IF NEW.folder_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE class_folders
        SET document_count = document_count + 1
        WHERE id = NEW.folder_id;
      END IF;
    END IF;
    -- Document soft deleted or restored
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      IF NEW.deleted_at IS NOT NULL AND NEW.folder_id IS NOT NULL THEN
        UPDATE class_folders
        SET document_count = document_count - 1
        WHERE id = NEW.folder_id AND document_count > 0;
      ELSIF NEW.deleted_at IS NULL AND NEW.folder_id IS NOT NULL THEN
        UPDATE class_folders
        SET document_count = document_count + 1
        WHERE id = NEW.folder_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.folder_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE class_folders
      SET document_count = document_count - 1
      WHERE id = OLD.folder_id AND document_count > 0;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### 3. Set Document Metadata

Automatically sets user_id and timestamps:

```sql
CREATE OR REPLACE FUNCTION set_document_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.user_id = auth.uid();
    NEW.created_at = now();
    NEW.updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Helper Functions

#### 1. get_class_documents_with_folders(class_id)

Returns all documents for a class organized by folders.

**Returns**:
- document_id, document_title, document_type
- folder_id, folder_name
- created_at, file_size, is_lesson_plan

**SQL**:
```sql
CREATE OR REPLACE FUNCTION get_class_documents_with_folders(
  p_class_id uuid
)
RETURNS TABLE (
  document_id uuid,
  document_title text,
  document_type text,
  folder_id uuid,
  folder_name text,
  created_at timestamptz,
  file_size integer,
  is_lesson_plan boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.id,
    cd.title,
    cd.document_type,
    cf.id,
    cf.folder_name,
    cd.created_at,
    cd.file_size,
    cd.is_lesson_plan
  FROM class_documents cd
  LEFT JOIN class_folders cf ON cd.folder_id = cf.id
  WHERE cd.class_id = p_class_id
    AND cd.deleted_at IS NULL
  ORDER BY cf.sort_order, cd.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage**:
```typescript
const { data: documents } = await supabase.rpc('get_class_documents_with_folders', {
  p_class_id: classId
});
```

#### 2. get_class_document_stats(class_id)

Returns document statistics for a class.

**Returns**:
- total_documents, lesson_plans_count, notes_count, reports_count, resources_count
- recent_document_title, recent_document_date

**SQL**:
```sql
CREATE OR REPLACE FUNCTION get_class_document_stats(
  p_class_id uuid
)
RETURNS TABLE (
  total_documents integer,
  lesson_plans_count integer,
  notes_count integer,
  reports_count integer,
  resources_count integer,
  recent_document_title text,
  recent_document_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_documents,
    COUNT(*) FILTER (WHERE document_type = 'lesson_plan')::integer as lesson_plans_count,
    COUNT(*) FILTER (WHERE document_type = 'note')::integer as notes_count,
    COUNT(*) FILTER (WHERE document_type = 'report')::integer as reports_count,
    COUNT(*) FILTER (WHERE document_type = 'resource')::integer as resources_count,
    (SELECT title FROM class_documents WHERE class_id = p_class_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as recent_document_title,
    (SELECT created_at FROM class_documents WHERE class_id = p_class_id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as recent_document_date
  FROM class_documents
  WHERE class_id = p_class_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage**:
```typescript
const { data: stats } = await supabase.rpc('get_class_document_stats', {
  p_class_id: classId
});

console.log(`Total Documents: ${stats.total_documents}`);
console.log(`Lesson Plans: ${stats.lesson_plans_count}`);
console.log(`Notes: ${stats.notes_count}`);
console.log(`Most Recent: ${stats.recent_document_title}`);
```

---

### Security

#### Row Level Security (RLS)

**class_folders**:
```sql
-- Teachers can manage folders for their classes
CREATE POLICY "Teachers can manage folders for their classes"
  ON class_folders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_folders.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Admins can view all class folders
CREATE POLICY "Admins can view all class folders"
  ON class_folders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );
```

**class_documents**:
```sql
-- Teachers can manage documents for their classes
CREATE POLICY "Teachers can manage documents for their classes"
  ON class_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_documents.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Admins can view all class documents
CREATE POLICY "Admins can view all class documents"
  ON class_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.team_role IN ('optimus_prime', 'prime', 'admin', 'supa_admin')
    )
  );
```

---

## Usage Examples

### For Teachers

#### Create a New Folder
```typescript
async function createCustomFolder(classId: string, folderName: string, parentFolderId?: string) {
  const { data: folder, error } = await supabase
    .from('class_folders')
    .insert({
      class_id: classId,
      folder_name: folderName,
      folder_type: 'custom',
      parent_folder_id: parentFolderId,
      folder_path: parentFolderId
        ? `${parentFolder.folder_path}/${folderName}`
        : `/${folderName}`,
      folder_depth: parentFolderId ? parentFolder.folder_depth + 1 : 0,
      icon: '📁',
      color: '#6B7280'
    })
    .select()
    .single();

  return folder;
}
```

#### Save a Lesson Plan to Class
```typescript
async function saveLessonPlanToClass(
  classId: string,
  title: string,
  content: string,
  conversationId?: string,
  messageId?: string
) {
  // Get the Lesson Plans folder
  const { data: lessonPlansFolder } = await supabase
    .from('class_folders')
    .select('id')
    .eq('class_id', classId)
    .eq('folder_type', 'lesson_plans')
    .single();

  // Create the document
  const { data: document, error } = await supabase
    .from('class_documents')
    .insert({
      class_id: classId,
      folder_id: lessonPlansFolder.id,
      title: title,
      document_type: 'lesson_plan',
      content: content,
      is_lesson_plan: true,
      lesson_plan_confidence: 0.95,
      conversation_id: conversationId,
      message_id: messageId,
      auto_saved: !!conversationId,
      metadata: {
        source: conversationId ? 'chat' : 'manual',
        created_from: 'uhuru_ai'
      }
    })
    .select()
    .single();

  return document;
}
```

#### Move Document to Different Folder
```typescript
async function moveDocument(documentId: string, newFolderId: string) {
  const { data, error } = await supabase
    .from('class_documents')
    .update({ folder_id: newFolderId })
    .eq('id', documentId)
    .select()
    .single();

  // Document counts are automatically updated by trigger
  return data;
}
```

#### Search Documents by Tag
```typescript
async function searchDocumentsByTag(classId: string, tag: string) {
  const { data: documents } = await supabase
    .from('class_documents')
    .select('*')
    .eq('class_id', classId)
    .contains('tags', [tag])
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return documents;
}
```

#### Get Folder Hierarchy
```typescript
async function getFolderHierarchy(classId: string) {
  const { data: folders } = await supabase
    .from('class_folders')
    .select('*')
    .eq('class_id', classId)
    .is('deleted_at', null)
    .order('folder_depth')
    .order('sort_order');

  // Build tree structure
  const folderMap = new Map();
  const rootFolders = [];

  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  folders.forEach(folder => {
    if (folder.parent_folder_id) {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        parent.children.push(folderMap.get(folder.id));
      }
    } else {
      rootFolders.push(folderMap.get(folder.id));
    }
  });

  return rootFolders;
}
```

#### Track Document Access
```typescript
async function trackDocumentAccess(documentId: string, accessType: 'view' | 'download') {
  const updateField = accessType === 'view' ? 'view_count' : 'download_count';

  await supabase.rpc('increment_document_access', {
    p_document_id: documentId,
    p_access_type: accessType
  });

  // Or manually:
  await supabase
    .from('class_documents')
    .update({
      [updateField]: supabase.sql`${updateField} + 1`,
      last_accessed_at: new Date().toISOString()
    })
    .eq('id', documentId);
}
```

### For Admins

#### View All Class Documents (Admin)
```typescript
async function getAllClassDocuments(limit: number = 100) {
  const { data: documents } = await supabase
    .from('class_documents')
    .select(`
      *,
      class:classes(name, grade_level),
      user:auth.users(email),
      folder:class_folders(folder_name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return documents;
}
```

#### Document Usage Analytics
```typescript
async function getDocumentUsageStats() {
  const { data: stats } = await supabase
    .from('class_documents')
    .select('document_type, view_count, download_count')
    .is('deleted_at', null);

  const analytics = stats.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = {
        count: 0,
        total_views: 0,
        total_downloads: 0
      };
    }
    acc[doc.document_type].count++;
    acc[doc.document_type].total_views += doc.view_count;
    acc[doc.document_type].total_downloads += doc.download_count;
    return acc;
  }, {});

  return analytics;
}
```

---

## Integration Points

### With Chat System
- Auto-saves lesson plans from conversations
- Links documents to conversation context
- Enables document referencing in chat

### With Lesson Plan Detection
- Uses `is_lesson_plan` flag and confidence score
- Stores structured lesson plan metadata
- Enables automatic categorization

### With File Upload System
- Stores file paths and URLs
- Tracks file size and extension
- Supports multiple storage backends

### With Teacher Dashboard
- Powers document browser UI
- Provides quick stats and counts
- Enables search and filtering

---

## Performance Considerations

### Indexes
All key indexes are created for optimal performance:
```sql
CREATE INDEX class_documents_class_id_idx ON class_documents(class_id);
CREATE INDEX class_documents_folder_id_idx ON class_documents(folder_id);
CREATE INDEX class_documents_user_id_idx ON class_documents(user_id);
CREATE INDEX class_documents_type_idx ON class_documents(document_type);
CREATE INDEX class_documents_lesson_plan_idx ON class_documents(is_lesson_plan) WHERE is_lesson_plan = true;
CREATE INDEX class_documents_created_at_idx ON class_documents(created_at DESC);
CREATE INDEX class_documents_tags_idx ON class_documents USING gin(tags);
```

### Query Optimization
- Use `get_class_documents_with_folders()` for organized views
- Filter by `deleted_at IS NULL` for active documents
- Limit result sets for large classes
- Use pagination for document lists

---

## Future Enhancements

1. **Document Sharing**
   - Share documents between teachers
   - Public/private document settings
   - Collaborative editing

2. **Document Templates**
   - Pre-built lesson plan templates
   - Custom template creation
   - Template library

3. **Full-Text Search**
   - Search document content
   - Advanced filtering
   - Search suggestions

4. **Document Comments**
   - Inline comments
   - Feedback and reviews
   - Collaborative annotations

5. **Export Options**
   - Export to PDF
   - Bulk export by folder
   - Print-friendly formatting

---

## Related Documentation

- [LESSON_PLAN_DETECTION.md](./LESSON_PLAN_DETECTION.md) - Lesson plan auto-detection
- [FILE_UPLOAD_FIX_SUMMARY.md](./FILE_UPLOAD_FIX_SUMMARY.md) - File upload system
- [TEACHER_ASSISTANT_BASE_SCHEMA.md](./TEACHER_ASSISTANT_BASE_SCHEMA.md) - Teacher features

---

**Last Updated**: November 11, 2025
**Document Version**: 1.0
**Migration**: `20251107163726_create_class_documents_system.sql`
