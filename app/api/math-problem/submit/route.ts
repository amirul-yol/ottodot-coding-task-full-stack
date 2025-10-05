/**
 * API Route: /api/math-problem/submit
 *
 * This file handles answer submission and AI feedback generation.
 *
 * WHY SEPARATE ROUTE FILE?
 * - Next.js App Router requires separate route files for different endpoints
 * - /api/math-problem handles generation, /api/math-problem/submit handles submission
 * - Follows REST API conventions with clear endpoint separation
 *
 * DEPENDENCIES EXPLAINED:
 * - @google/generative-ai: For AI-powered feedback generation
 * - @supabase/supabase-js: For database operations
 * - Database types from our custom types file for type safety
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../../../lib/supabaseClient';

// Initialize Google Gemini AI with API key from environment variables
// WHY? Environment variables keep sensitive API keys secure and allow easy deployment
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Type definitions for better code clarity and TypeScript support
// WHY? TypeScript helps catch errors at compile time, not runtime
interface SubmitAnswerRequest {
  sessionId: string;
  userAnswer: number;
  timeTakenSeconds?: number;
}

interface SubmitAnswerResponse {
  isCorrect: boolean;
  feedback: string;
}

/**
 * POST /api/math-problem/submit - Submit an answer and get AI feedback
 *
 * HOW IT WORKS:
 * 1. Receives session ID and user's answer from frontend
 * 2. Fetches the original problem from database using session ID
 * 3. Compares user's answer with correct answer
 * 4. Uses AI to generate personalized feedback based on correctness
 * 5. Saves the submission to math_problem_submissions table
 * 6. Returns feedback and correctness status to frontend
 *
 * WHY THIS APPROACH?
 * - Separates submission logic from generation for better organization
 * - AI provides contextual, educational feedback for learning
 * - Database persistence tracks user progress and stores feedback
 * - Session ID ensures submissions are linked to correct problems
 */
export async function POST(request: Request) {
  try {
    // Parse the request body to get session ID and user answer
    // WHY async text()? Request body is a readable stream that needs to be consumed
    const body: SubmitAnswerRequest = await request.json();

    // Validate required fields
    // WHY? Prevents processing incomplete or malformed requests
    if (!body.sessionId || typeof body.userAnswer !== 'number') {
      return Response.json(
        { error: 'Missing required fields: sessionId and userAnswer' },
        { status: 400 }
      );
    }

    // Fetch the original problem from database using session ID
    // WHY? Need the correct answer and original problem text for comparison and feedback
    const { data: session, error: fetchError } = await supabase
      .from('math_problem_sessions')
      .select('*')
      .eq('id', body.sessionId)
      .single();

    // Handle case where session ID doesn't exist
    if (fetchError || !session) {
      console.error('Session not found:', fetchError);
      return Response.json(
        { error: 'Problem session not found' },
        { status: 404 }
      );
    }

    // Check if the user's answer is correct
    // WHY? Simple numeric comparison for accuracy
    const isCorrect = body.userAnswer === session.correct_answer;

    // Calculate stars if answer is correct and time is provided
    // WHY? Rewards both speed and accuracy for better engagement
    let starsEarned = 0;
    if (isCorrect && body.timeTakenSeconds !== undefined) {
      const difficulty = session.difficulty as 'easy' | 'medium' | 'hard' || 'medium';
      const thresholds = {
        easy: { three: 30, two: 60 },
        medium: { three: 60, two: 120 },
        hard: { three: 120, two: 180 }
      };
      const threshold = thresholds[difficulty];
      
      if (body.timeTakenSeconds < threshold.three) starsEarned = 3;
      else if (body.timeTakenSeconds < threshold.two) starsEarned = 2;
      else starsEarned = 1;
    }

    // Create a prompt for AI feedback generation
    // WHY THIS PROMPT? Provides context for personalized, educational feedback
    const feedbackPrompt = `
      Original problem: ${session.problem_text}
      Correct answer: ${session.correct_answer}
      User's answer: ${body.userAnswer}
      Was the user correct? ${isCorrect ? 'Yes' : 'No'}

      Generate personalized feedback that:
      - ${isCorrect ? 'Praises the user and reinforces the correct method' : 'Explains the correct solution step by step'}
      - Helps the user understand the math concept
      - Encourages continued learning
      - Keeps a friendly, supportive tone suitable for Primary 5 students

      Keep the feedback concise but helpful (2-3 sentences).
    `;

    // Generate AI feedback using the updated Gemini 2.0 Flash model
    // WHY 'gemini-2.0-flash'? It's the current available model that works with our API key
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const feedbackResult = await model.generateContent(feedbackPrompt);
    const feedbackResponse = await feedbackResult.response;
    const feedbackText = feedbackResponse.text().trim();

    // Save the submission to database with time and stars
    // WHY? Tracks user progress, performance metrics, and stores feedback
    const { error: submitError } = await supabase
      .from('math_problem_submissions')
      .insert({
        session_id: body.sessionId,
        user_answer: body.userAnswer,
        is_correct: isCorrect,
        feedback_text: feedbackText,
        time_taken_seconds: body.timeTakenSeconds || null,
        stars_earned: starsEarned,
      });

    // Handle database errors during submission but don't fail the request
    // WHY? Feedback generation is the main purpose - saving is secondary
    if (submitError) {
      console.error('Error saving submission:', submitError);
      // Don't fail the request if feedback generation worked but saving failed
    }

    // Return successful response with feedback and correctness
    // WHY 201 status? Indicates a new resource (submission) was created successfully
    const response: SubmitAnswerResponse = {
      isCorrect,
      feedback: feedbackText,
    };

    return Response.json(response, { status: 201 });

  } catch (error) {
    // Handle any errors during submission processing
    // WHY comprehensive error handling? Ensures graceful failure and debugging info
    console.error('Error submitting answer:', error);
    return Response.json(
      {
        error: 'Failed to submit answer',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
