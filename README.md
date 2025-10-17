Pencils of Promise - Creating a Better World Through Education

AI-powered learning platform that empowers students and educators to build a better future through accessible, quality education.

## Getting Started

1. Clone this repository
2. Install dependencies with `npm install`
3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_FUNCTIONS_URL=your_supabase_functions_url
   ```
4. Run the development server with `npm run dev`

## Supabase Configuration

### Database Setup

1. Click "Connect to Supabase" button in the top right of your StackBlitz editor
2. Create a new project or connect to an existing one
3. Run the migration in `supabase/migrations/create_waitlist_table.sql` to create the waitlist table

### Edge Functions Setup

The project includes several Supabase Edge Functions that require proper environment variable configuration:

#### Required Environment Variables for Edge Functions

Set these in your Supabase Dashboard → Project Settings → Edge Functions → Environment Variables:

```
# Required for llm-proxy function
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
UHURU_API_KEY=your_uhuru_api_key_here

# Optional for web search functionality
WEB_SEARCH_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Optional for WhatsApp integration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Optional for email notifications
ADMIN_EMAIL=your_admin_email@orionx.xyz
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Required for Stripe integration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional for website deployment
NETLIFY_AUTH_TOKEN=your_netlify_personal_access_token
```

#### Deploying Edge Functions

After setting environment variables, Edge Functions are automatically deployed when you connect to Supabase.

#### Legacy Email Notification Setup

The project includes a legacy Supabase Edge Function for sending email notifications when someone joins the waitlist:

1. Deploy the edge function in `supabase/functions/waitlist-notification/`
2. Set up the following environment variables in your Supabase project:
   - `ADMIN_EMAIL`: Email address to receive notifications (defaults to monti@orionx.xyz)
   - `SMTP_USER`: SMTP server username
   - `SMTP_PASS`: SMTP server password

#### Troubleshooting Edge Functions

If you encounter "Failed to fetch" errors:

1. **Check Environment Variables**: Ensure all required environment variables are set in your Supabase project
2. **Verify URLs**: Make sure `SUPABASE_URL` matches your actual project URL
3. **Test Authentication**: Verify that `SUPABASE_SERVICE_ROLE_KEY` is correct
4. **API Access**: Confirm your `UHURU_API_KEY` is valid and has sufficient quota
5. **Function Logs**: Check the Edge Function logs in your Supabase dashboard for detailed error messages

## Features

- Modern, responsive UI built with React and Tailwind CSS
- AI chat interface powered by Uhuru, built on Uhuru LLM
- Waitlist system for managing early access users
- Email notifications for new waitlist signups

## Technology Stack

- React with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Supabase for backend services
- Uhuru AI for intelligent capabilities