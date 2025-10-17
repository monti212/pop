# Production Testing Checklist

This document provides a comprehensive checklist for manual testing before production deployment.

## Pre-Testing Setup

- [ ] All environment variables are set correctly in `.env`
- [ ] Database migrations have been applied
- [ ] Edge functions are deployed to Supabase
- [ ] Sentry DSN is configured (optional but recommended)
- [ ] Build completes without errors (`npm run build`)

---

## 1. Authentication Flows

### Email/Password Authentication
- [ ] **Sign Up**
  - [ ] Navigate to sign up page
  - [ ] Enter valid email and password
  - [ ] Verify account is created in Supabase
  - [ ] Check that user_profiles record is created automatically
  - [ ] Verify default team_role is 'member'

- [ ] **Email Login**
  - [ ] Navigate to login page
  - [ ] Enter correct credentials
  - [ ] Verify successful login and redirect to chat interface
  - [ ] Check that session is persisted on page reload

- [ ] **Invalid Login**
  - [ ] Try logging in with incorrect password
  - [ ] Verify appropriate error message is displayed
  - [ ] Try logging in with non-existent email
  - [ ] Verify appropriate error message is displayed

- [ ] **Password Reset**
  - [ ] Navigate to "Forgot Password" page
  - [ ] Enter registered email
  - [ ] Check for password reset email
  - [ ] Click reset link in email
  - [ ] Enter new password
  - [ ] Verify can login with new password

### Phone Authentication
- [ ] **Phone Number Verification**
  - [ ] Navigate to settings > Phone Linking
  - [ ] Enter valid phone number with country code
  - [ ] Verify SMS code is sent (check Twilio logs)
  - [ ] Enter correct verification code
  - [ ] Verify phone number is linked to account

- [ ] **Invalid Phone Verification**
  - [ ] Try entering invalid verification code
  - [ ] Verify appropriate error message
  - [ ] Verify account is not linked with invalid code

### Session Management
- [ ] **Session Persistence**
  - [ ] Login to application
  - [ ] Close and reopen browser
  - [ ] Verify session is still active

- [ ] **Logout**
  - [ ] Click logout button
  - [ ] Verify redirect to home page
  - [ ] Verify cannot access protected routes
  - [ ] Verify session is cleared from localStorage

---

## 2. AI Chat Functionality

### Basic Chat
- [ ] **Simple Text Query** (Model 1.5 - Basic)
  - [ ] Send message: "Hello, how are you?"
  - [ ] Verify streaming response appears
  - [ ] Verify complete message is displayed
  - [ ] Verify message is saved to database
  - [ ] Check conversations table in Supabase

- [ ] **Complex Query** (Model 2.0 - Advanced)
  - [ ] Switch to model 2.0
  - [ ] Send: "Explain quantum computing trade-offs"
  - [ ] Verify structured response with analysis
  - [ ] Verify reasoning approach accordion appears
  - [ ] Click accordion to view approach

- [ ] **Polymath Query** (Model 2.1 - Complex)
  - [ ] Switch to model 2.1
  - [ ] Send: "Design a solar-powered irrigation system for rural Botswana"
  - [ ] Verify multi-perspective analysis
  - [ ] Verify first-principles reasoning
  - [ ] Verify actionable recommendations

### Conversation Management
- [ ] **Create New Conversation**
  - [ ] Click "New Conversation" button
  - [ ] Verify new conversation is created
  - [ ] Verify conversation appears in sidebar
  - [ ] Verify auto-generated title

- [ ] **Switch Conversations**
  - [ ] Click on different conversation in sidebar
  - [ ] Verify messages load correctly
  - [ ] Verify can continue previous conversation

- [ ] **Delete Conversation**
  - [ ] Right-click or long-press on conversation
  - [ ] Click delete option
  - [ ] Confirm deletion
  - [ ] Verify conversation is removed from sidebar
  - [ ] Verify conversation is deleted from database

- [ ] **Rename Conversation**
  - [ ] Click on conversation title
  - [ ] Edit title
  - [ ] Press Enter or click away
  - [ ] Verify title updates in sidebar
  - [ ] Verify title updates in database

### File Upload & Analysis
- [ ] **PDF Upload**
  - [ ] Click file attachment icon
  - [ ] Upload a PDF document
  - [ ] Ask question about PDF content
  - [ ] Verify AI responds with relevant information

- [ ] **Image Upload**
  - [ ] Upload an image file
  - [ ] Ask: "What's in this image?"
  - [ ] Verify AI describes image content

- [ ] **Word Document Upload**
  - [ ] Upload a .docx file
  - [ ] Ask about document content
  - [ ] Verify AI can read and analyze content

### Image Generation
- [ ] **Basic Image Generation**
  - [ ] Send: "Generate an image of a sunset over the Okavango Delta"
  - [ ] Verify loading indicator appears
  - [ ] Verify image is generated and displayed
  - [ ] Verify image is stored in Supabase Storage
  - [ ] Verify persistent URL (not base64)

- [ ] **Image Generation with Options**
  - [ ] Open image generation settings
  - [ ] Change size to 1792x1024 (landscape)
  - [ ] Change background to transparent
  - [ ] Generate image
  - [ ] Verify correct dimensions and background

### Error Handling
- [ ] **Network Interruption**
  - [ ] Start a chat query
  - [ ] Disable network mid-response
  - [ ] Verify graceful error message
  - [ ] Re-enable network
  - [ ] Verify can retry

- [ ] **Rate Limiting**
  - [ ] Send multiple messages rapidly
  - [ ] Verify rate limit message if limit reached
  - [ ] Wait for rate limit window to reset
  - [ ] Verify can send messages again

---

## 3. Uhuru Files (Document Editor)

### Document Creation
- [ ] **Create New Document**
  - [ ] Navigate to Uhuru Files
  - [ ] Click "New Document"
  - [ ] Enter document title
  - [ ] Verify document is created
  - [ ] Verify document appears in file list

- [ ] **Rich Text Editing**
  - [ ] Type text content
  - [ ] Apply bold formatting
  - [ ] Apply italic formatting
  - [ ] Create bullet list
  - [ ] Create numbered list
  - [ ] Add headings (H1, H2, H3)
  - [ ] Verify all formatting is applied correctly

### Document Management
- [ ] **Save Document**
  - [ ] Make changes to document
  - [ ] Click save button
  - [ ] Verify "Saved" indicator appears
  - [ ] Refresh page
  - [ ] Verify changes are persisted

- [ ] **Auto-save**
  - [ ] Make changes without clicking save
  - [ ] Wait 3-5 seconds
  - [ ] Verify auto-save indicator
  - [ ] Refresh page
  - [ ] Verify changes are persisted

- [ ] **Export Document**
  - [ ] Click export button
  - [ ] Choose PDF format
  - [ ] Verify PDF downloads correctly
  - [ ] Verify formatting is preserved in PDF
  - [ ] Try exporting as Word (.docx)
  - [ ] Verify .docx downloads and opens correctly

- [ ] **Delete Document**
  - [ ] Click delete icon on document
  - [ ] Confirm deletion
  - [ ] Verify document is removed from list
  - [ ] Verify soft delete (check is_deleted column)

- [ ] **Version History**
  - [ ] Make multiple edits to document
  - [ ] Save document several times
  - [ ] Click "Version History"
  - [ ] Verify previous versions are listed
  - [ ] Click on previous version
  - [ ] Verify can view old content
  - [ ] Verify can restore previous version

### Sharing & Collaboration
- [ ] **Share Document (if implemented)**
  - [ ] Click share button
  - [ ] Generate share link
  - [ ] Verify link works in incognito window
  - [ ] Verify appropriate permissions (view-only vs edit)

---

## 4. Uhuru Sheets (Spreadsheet)

### Basic Operations
- [ ] **Create New Sheet**
  - [ ] Navigate to Uhuru Sheets
  - [ ] Click "New Sheet"
  - [ ] Enter sheet title
  - [ ] Verify sheet is created

- [ ] **Data Entry**
  - [ ] Click on cell A1
  - [ ] Enter text: "Name"
  - [ ] Enter data in cells A2-A5
  - [ ] Tab to next cell
  - [ ] Verify data is entered correctly
  - [ ] Verify cell navigation works

### Formulas
- [ ] **Basic Formula: SUM**
  - [ ] Enter numbers in cells B1:B5
  - [ ] In cell B6, enter: `=SUM(B1:B5)`
  - [ ] Press Enter
  - [ ] Verify formula calculates correctly
  - [ ] Verify result shows as number (not formula text)

- [ ] **Formula: AVERAGE**
  - [ ] Enter: `=AVERAGE(B1:B5)` in cell B7
  - [ ] Verify average is calculated correctly

- [ ] **Formula: MAX/MIN**
  - [ ] Enter: `=MAX(B1:B5)` in cell B8
  - [ ] Enter: `=MIN(B1:B5)` in cell B9
  - [ ] Verify correct results

- [ ] **Formula: COUNT**
  - [ ] Enter: `=COUNT(B1:B5)` in cell B10
  - [ ] Verify count is correct

- [ ] **Cell References**
  - [ ] Enter: `=A1*2` in cell C1
  - [ ] Change value in A1
  - [ ] Verify C1 updates automatically

- [ ] **Formula Errors**
  - [ ] Enter invalid formula: `=SUM(Z99:Z100)`
  - [ ] Verify #ERROR! is displayed
  - [ ] Verify error doesn't crash application

### Sheet Operations
- [ ] **Save Sheet**
  - [ ] Make changes to sheet
  - [ ] Click save
  - [ ] Refresh page
  - [ ] Verify all data and formulas are preserved

- [ ] **Export Sheet**
  - [ ] Click export button
  - [ ] Choose Excel format
  - [ ] Verify .xlsx file downloads
  - [ ] Open in Excel/Google Sheets
  - [ ] Verify data and formulas work correctly

- [ ] **Delete Sheet**
  - [ ] Click delete icon
  - [ ] Confirm deletion
  - [ ] Verify sheet is removed

### Advanced Features
- [ ] **Table Detection**
  - [ ] Enter data with headers
  - [ ] Verify table formatting is applied
  - [ ] Verify header row is styled differently

---

## 5. Admin Dashboard

**Note:** Admin access requires team_role = 'admin' in user_profiles table

### Access Control
- [ ] **Admin Access**
  - [ ] Login as admin user (Optimus Prime or Prime)
  - [ ] Verify can access /admin routes
  - [ ] Navigate to Admin Dashboard
  - [ ] Verify dashboard loads correctly

- [ ] **Non-Admin Access**
  - [ ] Login as regular user
  - [ ] Try to navigate to /admin
  - [ ] Verify redirect to unauthorized page
  - [ ] Verify cannot access admin functions

### Dashboard Overview
- [ ] **System Stats**
  - [ ] Verify total users count is accurate
  - [ ] Verify active users count
  - [ ] Verify total conversations count
  - [ ] Verify total messages count
  - [ ] Verify stats update in real-time

### User Analytics
- [ ] **User List**
  - [ ] Navigate to User Analytics
  - [ ] Verify all users are listed
  - [ ] Verify user email, team_role, and created_at are shown
  - [ ] Click on user to view details
  - [ ] Verify user's conversations and messages are shown

### Message Analytics
- [ ] **Message Stats**
  - [ ] Navigate to Message Analytics
  - [ ] Verify messages per day chart
  - [ ] Verify model version distribution
  - [ ] Verify top active users list

### WhatsApp Management
- [ ] **WhatsApp Settings**
  - [ ] Navigate to WhatsApp Settings
  - [ ] Verify Twilio configuration is shown
  - [ ] Update WhatsApp greeting message
  - [ ] Save settings
  - [ ] Verify settings are persisted

- [ ] **WhatsApp Messages**
  - [ ] Navigate to WhatsApp Messages
  - [ ] Verify recent messages are displayed
  - [ ] Filter by date range
  - [ ] Search by phone number
  - [ ] Verify message details (sender, content, timestamp)

### Security Monitoring
- [ ] **Audit Logs**
  - [ ] Navigate to Security Monitoring
  - [ ] Verify admin actions are logged
  - [ ] Verify timestamps are correct
  - [ ] Filter logs by action type
  - [ ] Search logs by user

### System Health
- [ ] **Health Metrics**
  - [ ] Navigate to System Health
  - [ ] Verify database connection status
  - [ ] Verify Edge Functions status
  - [ ] Verify error rate metrics
  - [ ] Check response time charts

---

## 6. Stripe Payment Integration

### Checkout Flow
- [ ] **View Pricing**
  - [ ] Navigate to pricing page
  - [ ] Verify all subscription tiers are displayed
  - [ ] Verify pricing and features for each tier

- [ ] **Start Checkout (Test Mode)**
  - [ ] Click "Subscribe" on a paid plan
  - [ ] Verify redirect to Stripe Checkout
  - [ ] Enter test card: 4242 4242 4242 4242
  - [ ] Enter future expiry date (e.g., 12/25)
  - [ ] Enter any 3-digit CVC
  - [ ] Enter zip code
  - [ ] Complete payment
  - [ ] Verify redirect back to application
  - [ ] Verify subscription is active in account settings

### Subscription Management
- [ ] **View Subscription**
  - [ ] Navigate to Settings > Subscription
  - [ ] Verify current plan is displayed
  - [ ] Verify billing cycle and next payment date

- [ ] **Update Payment Method**
  - [ ] Click "Update Payment Method"
  - [ ] Enter new test card details
  - [ ] Verify payment method is updated
  - [ ] Verify confirmation message

- [ ] **Cancel Subscription**
  - [ ] Click "Cancel Subscription"
  - [ ] Confirm cancellation
  - [ ] Verify subscription remains active until end of period
  - [ ] Verify "Cancels on [date]" is displayed

### Webhooks
- [ ] **Payment Success Webhook**
  - [ ] Complete a test payment
  - [ ] Check Supabase logs for webhook receipt
  - [ ] Verify subscription record is created/updated

- [ ] **Payment Failed Webhook**
  - [ ] Use test card that declines: 4000 0000 0000 0002
  - [ ] Verify webhook handles failure
  - [ ] Verify appropriate user notification (if implemented)

---

## 7. WhatsApp Integration

**Note:** Requires Twilio account and WhatsApp number configuration

### Message Sending
- [ ] **Send WhatsApp Message**
  - [ ] Send WhatsApp message to configured number
  - [ ] Message format: Any text query
  - [ ] Verify message is received by Uhuru
  - [ ] Verify response is sent back
  - [ ] Verify conversation is logged in database

- [ ] **AI Response via WhatsApp**
  - [ ] Send: "What is the capital of Botswana?"
  - [ ] Verify AI responds with correct answer
  - [ ] Verify response appears in WhatsApp

### Image Generation via WhatsApp
- [ ] **Request Image**
  - [ ] Send: "Generate an image of a giraffe in the savanna"
  - [ ] Verify loading message
  - [ ] Verify image is generated and sent via WhatsApp
  - [ ] Verify image is saved to database

### Session Management
- [ ] **Session Persistence**
  - [ ] Send multiple messages
  - [ ] Verify conversation context is maintained
  - [ ] Verify user session is tracked by phone number

### Admin View
- [ ] **View WhatsApp Logs**
  - [ ] Login as admin
  - [ ] Navigate to WhatsApp Messages
  - [ ] Verify recent WhatsApp messages are listed
  - [ ] Verify can filter and search messages

---

## 8. Settings & User Profile

### Profile Settings
- [ ] **Update Display Name**
  - [ ] Navigate to Settings > Personalization
  - [ ] Change display name
  - [ ] Save changes
  - [ ] Verify name updates throughout app
  - [ ] Verify name updates in database

- [ ] **Change Language**
  - [ ] Navigate to Settings > Personalization
  - [ ] Change language (e.g., Setswana)
  - [ ] Verify AI responses are in selected language

- [ ] **Change Region**
  - [ ] Change region to "Botswana" or "Southern Africa"
  - [ ] Send a query: "Tell me about local agriculture"
  - [ ] Verify response includes regional context

### Privacy Settings
- [ ] **Data Collection Preferences**
  - [ ] Navigate to Settings > Privacy
  - [ ] Toggle analytics collection
  - [ ] Verify preference is saved

- [ ] **Export User Data**
  - [ ] Click "Export My Data"
  - [ ] Verify export process starts
  - [ ] Verify data export includes conversations, documents, sheets

- [ ] **Delete Account**
  - [ ] Click "Delete Account"
  - [ ] Verify warning message
  - [ ] Confirm deletion
  - [ ] Verify account is soft-deleted
  - [ ] Verify cannot login anymore
  - [ ] Verify data is retained (soft delete) for recovery period

### API Keys
- [ ] **View API Key**
  - [ ] Navigate to Settings > API Keys
  - [ ] Verify API key is displayed (or can be generated)

- [ ] **Regenerate API Key**
  - [ ] Click "Regenerate"
  - [ ] Verify new key is generated
  - [ ] Verify old key is invalidated
  - [ ] Copy new key

---

## 9. Error Handling & Edge Cases

### Sentry Integration
- [ ] **Error Tracking**
  - [ ] Intentionally trigger an error (if in dev mode)
  - [ ] Verify error is captured by Sentry
  - [ ] Check Sentry dashboard for error report
  - [ ] Verify error includes stack trace and context

### Network Issues
- [ ] **Offline Mode**
  - [ ] Disable network connection
  - [ ] Try to send a message
  - [ ] Verify graceful error message
  - [ ] Re-enable network
  - [ ] Verify can retry action

- [ ] **Slow Network**
  - [ ] Throttle network to "Slow 3G" in DevTools
  - [ ] Send a message
  - [ ] Verify loading indicators appear
  - [ ] Verify eventual success or timeout handling

### Large Data Handling
- [ ] **Long Messages**
  - [ ] Send a very long message (2000+ words)
  - [ ] Verify message is handled correctly
  - [ ] Verify UI doesn't break
  - [ ] Verify message is saved completely

- [ ] **Large File Upload**
  - [ ] Try uploading a large PDF (20+ MB)
  - [ ] Verify file size limit is enforced
  - [ ] Verify appropriate error message if too large

- [ ] **Many Conversations**
  - [ ] Create 50+ conversations
  - [ ] Verify sidebar loads correctly
  - [ ] Verify scrolling works
  - [ ] Verify performance is acceptable

### Form Validation
- [ ] **Invalid Inputs**
  - [ ] Try submitting forms with empty required fields
  - [ ] Verify validation messages appear
  - [ ] Try invalid email formats
  - [ ] Verify email validation works
  - [ ] Try weak passwords
  - [ ] Verify password strength requirements

---

## 10. Performance & Browser Compatibility

### Performance
- [ ] **Page Load Time**
  - [ ] Clear cache
  - [ ] Load home page
  - [ ] Verify loads in <3 seconds on good connection
  - [ ] Check Lighthouse score (target >90)

- [ ] **Chat Response Time**
  - [ ] Send a message
  - [ ] Measure time to first token (<2 seconds ideal)
  - [ ] Verify streaming starts quickly

- [ ] **Large Sheet Performance**
  - [ ] Create sheet with 1000+ rows
  - [ ] Enter formulas
  - [ ] Verify calculations complete in reasonable time
  - [ ] Verify UI remains responsive

### Browser Compatibility
- [ ] **Chrome/Edge**
  - [ ] Test all core features
  - [ ] Verify no console errors

- [ ] **Firefox**
  - [ ] Test all core features
  - [ ] Verify no console errors

- [ ] **Safari**
  - [ ] Test all core features
  - [ ] Verify no console errors

- [ ] **Mobile Safari (iOS)**
  - [ ] Test on iPhone
  - [ ] Verify responsive design
  - [ ] Verify touch interactions work

- [ ] **Mobile Chrome (Android)**
  - [ ] Test on Android device
  - [ ] Verify responsive design
  - [ ] Verify all features work

### Responsive Design
- [ ] **Desktop (1920x1080)**
  - [ ] Verify layout looks good
  - [ ] Verify no horizontal scrolling

- [ ] **Laptop (1366x768)**
  - [ ] Verify layout adapts correctly
  - [ ] Verify all content is accessible

- [ ] **Tablet (768x1024)**
  - [ ] Verify mobile menu appears
  - [ ] Verify touch-friendly UI
  - [ ] Verify chat interface works

- [ ] **Mobile (375x667)**
  - [ ] Verify all features are accessible
  - [ ] Verify text is readable
  - [ ] Verify buttons are tap-friendly

---

## 11. Security Testing

### Authentication Security
- [ ] **Session Security**
  - [ ] Verify JWT tokens expire correctly
  - [ ] Verify refresh tokens work
  - [ ] Verify cannot access protected routes without auth

- [ ] **Password Security**
  - [ ] Verify passwords are hashed (not stored in plain text)
  - [ ] Verify password reset tokens expire
  - [ ] Verify old passwords cannot be reused (if implemented)

### Data Privacy
- [ ] **User Data Isolation**
  - [ ] Login as User A
  - [ ] Create conversation
  - [ ] Logout, login as User B
  - [ ] Verify cannot access User A's conversations
  - [ ] Try to directly access User A's data via URL
  - [ ] Verify access is denied

### SQL Injection & XSS
- [ ] **SQL Injection Attempts**
  - [ ] Try entering: `'; DROP TABLE users;--` in search fields
  - [ ] Verify input is sanitized
  - [ ] Verify no SQL errors

- [ ] **XSS Attempts**
  - [ ] Try entering: `<script>alert('XSS')</script>` in input fields
  - [ ] Verify script doesn't execute
  - [ ] Verify HTML is escaped

### Rate Limiting
- [ ] **Rate Limit Enforcement**
  - [ ] Send many rapid requests to chat API
  - [ ] Verify rate limit kicks in
  - [ ] Verify 429 status code returned
  - [ ] Verify appropriate error message
  - [ ] Wait for rate limit window to reset
  - [ ] Verify can make requests again

---

## 12. Final Production Checks

### Pre-Deployment
- [ ] All critical bugs from testing are fixed
- [ ] Code is committed to version control
- [ ] Environment variables are set in production environment
- [ ] Database migrations are applied to production database
- [ ] Edge Functions are deployed to production
- [ ] Sentry is configured with production DSN
- [ ] Stripe webhooks are configured for production
- [ ] SSL certificate is valid and configured
- [ ] Domain DNS is configured correctly
- [ ] CDN is configured (if applicable)

### Post-Deployment
- [ ] Verify production URL loads correctly
- [ ] Test login with a real account
- [ ] Send a test message to AI
- [ ] Check Sentry for any errors
- [ ] Monitor server logs for issues
- [ ] Test Stripe payment with real card (small amount)
- [ ] Verify WhatsApp integration works in production
- [ ] Set up monitoring alerts
- [ ] Create backup of production database
- [ ] Document any issues found

---

## Severity Levels

When logging issues found during testing, use these severity levels:

- **P0 (Blocker)**: Prevents deployment, requires immediate fix
  - Examples: Auth completely broken, data loss, security vulnerability

- **P1 (Critical)**: Major functionality broken, should fix before launch
  - Examples: Chat not working, payments failing, major UI break

- **P2 (High)**: Important feature broken or degraded
  - Examples: Export doesn't work, admin dashboard errors

- **P3 (Medium)**: Minor feature issues or cosmetic bugs
  - Examples: UI alignment issues, non-critical feature bugs

- **P4 (Low)**: Nice-to-have improvements
  - Examples: UI polish, minor UX improvements

---

## Notes

- Mark each checkbox as you complete the test
- Document any failures with severity level and steps to reproduce
- Take screenshots of any UI issues
- Record error messages exactly as they appear
- Note browser and OS versions for any browser-specific issues
- Add additional test cases as new features are developed

---

**Testing completed by:** _________________

**Date:** _________________

**Environment:** Production / Staging / Development

**Build Version:** _________________

**Overall Status:** Pass / Fail / Needs Work

**Critical Issues Found:** _________________

**Next Steps:** _________________
