# Math Problem Generator - Developer Assessment Starter Kit

## Overview

This is a starter kit for building an AI-powered math problem generator application. The goal is to create a standalone prototype that uses AI to generate math word problems suitable for Primary 5 students, saves the problems and user submissions to a database, and provides personalized feedback.

## Tech Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **AI Integration**: Google Generative AI (Gemini)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd math-problem-generator
```

### 2. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → API to find your:
   - Project URL (starts with `https://`)
   - Anon/Public Key

### 3. Set Up Database Tables

1. In your Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `database.sql`
3. Click "Run" to create the tables and policies

### 4. Get Google API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key for Gemini

### 5. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Edit `.env.local` and add your actual keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
   GOOGLE_API_KEY=your_actual_google_api_key
   ```

### 6. Install Dependencies

```bash
npm install
```

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Your Task

### 1. Implement Frontend Logic (`app/page.tsx`)

Complete the TODO sections in the main page component:

- **generateProblem**: Call your API route to generate a new math problem
- **submitAnswer**: Submit the user's answer and get feedback

### 2. Create Backend API Route (`app/api/math-problem/route.ts`)

Create a new API route that handles:

#### POST /api/math-problem (Generate Problem)
- Use Google's Gemini AI to generate a math word problem
- The AI should return JSON with:
  ```json
  {
    "problem_text": "A bakery sold 45 cupcakes...",
    "final_answer": 15
  }
  ```
- Save the problem to `math_problem_sessions` table
- Return the problem and session ID to the frontend

#### POST /api/math-problem/submit (Submit Answer)
- Receive the session ID and user's answer
- Check if the answer is correct
- Use AI to generate personalized feedback based on:
  - The original problem
  - The correct answer
  - The user's answer
  - Whether they got it right or wrong
- Save the submission to `math_problem_submissions` table
- Return the feedback and correctness to the frontend

### 3. Requirements Checklist

- [x] AI generates appropriate Primary 5 level math problems
- [x] Problems and answers are saved to Supabase
- [x] User submissions are saved with feedback
- [x] AI generates helpful, personalized feedback
- [x] UI is clean and mobile-responsive
- [x] Error handling for API failures
- [x] Loading states during API calls

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Add your environment variables in Vercel's project settings
4. Deploy!

## Assessment Submission

When submitting your assessment, provide:

1. **GitHub Repository URL**: Make sure it's public
2. **Live Demo URL**: Your Vercel deployment
3. **Supabase Credentials**: Add these to your README for testing:
   ```
   SUPABASE_URL: https://wigcizcnhgbtgaqsyjai.supabase.co
   SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpZ2NpemNuaGdidGdhcXN5amFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODU0NTAsImV4cCI6MjA3NTE2MTQ1MH0.k5klNQyX_pgnQKHnT5odq7nrboZfQmParMdAPm8BYjQ
   ```

## Implementation Notes

### My Implementation:

**Core Features Implemented:**
- **AI Integration**: Google Gemini 2.0 Flash model for problem generation and personalized feedback
- **Database**: Supabase PostgreSQL with two tables (math_problem_sessions, math_problem_submissions)
- **API Routes**: Separate endpoints for problem generation and answer submission
- **TypeScript**: Full type safety across frontend, backend, and database operations

**Key Design Decisions:**
- **Separated API Routes**: `/api/math-problem` for generation and `/api/math-problem/submit` for submissions (Next.js App Router best practices)
- **Enhanced AI Prompts**: Detailed instructions for problem variety, difficulty levels, and hint generation to prevent repetitive problems
- **JSON Parsing**: Robust parsing to handle AI responses with markdown code blocks and mixed content
- **Error Handling**: User-friendly error messages with comprehensive try-catch blocks and logging

**Gamification & Engagement:**
- **Timer System**: Real-time timer with difficulty-based star ratings (3-star system)
- **Achievement Badges**: 5 unlockable badges stored in localStorage (First Steps, Speed Star, Problem Solver, Perfection, Helper Seeker)
- **Sound Effects**: Web Audio API synthesized sounds with toggle (whoosh, success, bling, click)
- **Animated Loading States**: Spinning math symbols for problem generation, calculator animation for answer checking
- **Confetti Animation**: Celebration effect for correct answers using canvas-confetti library

**UX Enhancements:**
- **Settings Modal**: Clean UI for difficulty (Easy/Medium/Hard) and topic (Addition/Subtraction/Multiplication/Division/Random) selection
- **Hint System**: AI-generated hints with yellow/gold themed display, no penalty for usage
- **Feedback Modal**: Scrollable modal with animated stars, time display, and confetti for correct answers
- **Background Image**: Classroom-themed background with blur and overlay for visual appeal
- **Responsive Design**: Mobile-first approach with responsive buttons, badges, and layouts

**Challenges Overcome:**
- Fixed deprecated Gemini model (gemini-pro → gemini-2.0-flash)
- Resolved AI JSON parsing issues with markdown code blocks
- Fixed Next.js styled-jsx compiler panic error
- Implemented difficulty-based time thresholds for star ratings
- Created modal-based settings for cleaner kid-friendly interface

**Performance Optimizations:**
- localStorage for achievements and preferences (no backend needed)
- CSS-only animations for lightweight performance
- Disabled form interactions during loading states
- Efficient state management with React hooks 

## Additional Features (Implemented)

Beyond the core requirements, the following optional features were implemented:

- [x] **Difficulty levels** (Easy/Medium/Hard) - Modal-based selection with difficulty-specific AI prompts and time thresholds
- [x] **Score tracking** - Star rating system (1-3 stars) based on speed and difficulty, stored in database
- [x] **Different problem types** - Topic selection: Addition, Subtraction, Multiplication, Division, Random
- [x] **Hints system** - AI-generated contextual hints with yellow/gold themed UI, no penalty for usage
- [x] **Timer system** - Real-time timer with format switching (seconds → M:SS)
- [x] **Achievement badges** - 5 unlockable badges with progress tracking and animated notifications
- [x] **Sound effects** - Web Audio API sounds with toggle for classroom environments
- [x] **Animated loading states** - Spinning math symbols and calculator animations
- [x] **Confetti celebration** - Canvas-confetti animation for correct answers
- [x] **Settings modal** - Kid-friendly UI for difficulty and topic selection
- [x] **Background theming** - Classroom-themed background with blur and overlay
- [x] **Responsive badges** - Color-coded difficulty and topic indicators
- [x] **Scrollable feedback** - Long AI feedback optimized for mobile with scroll indicators

**Not Yet Implemented:**
- [ ] Problem history view (would require user authentication)
- [ ] Step-by-step solution explanations (could be added to AI feedback prompt)

---

Good luck with your assessment! 🎯