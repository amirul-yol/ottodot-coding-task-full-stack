/**
 * API Route: /api/math-problem
 *
 * This file handles math problem generation using Google Gemini AI.
 *
 * WHY THIS STRUCTURE?
 * - Next.js 13+ App Router uses route.ts files for API endpoints
 * - Dedicated endpoint for problem generation with clear separation of concerns
 * - Submission logic moved to /api/math-problem/submit for better organization
 *
 * DEPENDENCIES EXPLAINED:
 * - @google/generative-ai: For AI-powered problem generation
 * - @supabase/supabase-js: For database operations
 * - Database types from our custom types file for type safety
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase, Database } from '../../../lib/supabaseClient';

// Initialize Google Gemini AI with API key from environment variables
// WHY? Environment variables keep sensitive API keys secure and allow easy deployment
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Type definitions for better code clarity and TypeScript support
// WHY? TypeScript helps catch errors at compile time, not runtime
interface GenerateProblemRequest {
  // No body needed for problem generation - AI creates random problems
}

interface GenerateProblemResponse {
  problem: {
    problem_text: string;
    final_answer: number;
  };
  sessionId: string;
}


/**
 * POST /api/math-problem - Generate a new math problem
 *
 * HOW IT WORKS:
 * 1. Creates a prompt asking Gemini AI to generate a Primary 5 level math problem
 * 2. AI returns a JSON response with problem_text and final_answer
 * 3. Saves the problem to math_problem_sessions table in Supabase
 * 4. Returns the problem and session ID to frontend
 *
 * WHY THIS APPROACH?
 * - AI ensures varied, contextual problems suitable for 10-11 year olds
 * - Database persistence allows tracking attempts and progress
 * - Session ID enables linking submissions to specific problems
 */
export async function POST(request: Request) {
  try {
    // Handle problem generation directly
    // WHY? This route is now dedicated to problem generation only
    return await handleGenerateProblem(request);
  } catch (error) {
    // Comprehensive error handling with detailed logging
    // WHY? Helps with debugging and provides meaningful error messages
    console.error('API Error in /api/math-problem:', error);

    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Handles the problem generation logic
 * WHY SEPARATE FUNCTION? Keeps the main POST handler clean and readable
 */
async function handleGenerateProblem(request: Request): Promise<Response> {
  // Initialize Gemini AI model
  // WHY 'gemini-2.0-flash'? It's Google's most capable model for text generation
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Create a detailed prompt for the AI
  // WHY THIS PROMPT? Specifies age group, math level, and exact JSON format needed
  // NOTE: This is a diagnostic version to troubleshoot AI response issues
  const prompt = `
    Generate a math word problem suitable for Primary 5 students (10-11 years old).
    The problem should involve basic arithmetic operations like addition, subtraction, multiplication, or division.
    Make it engaging and relatable for children.

    CRITICAL REQUIREMENTS:
    - Respond with ONLY a valid JSON object
    - Do NOT include any explanations, markdown, or extra text
    - Do NOT wrap in code blocks
    - Format MUST be exactly:

    {
      "problem_text": "A bakery sold 45 cupcakes in the morning and 32 cupcakes in the afternoon. How many cupcakes did they sell in total?",
      "final_answer": 77
    }
  `;

  try {
    // Call Gemini AI to generate the problem
    // WHY async/await? Makes code more readable than promise chains
    const result = await model.generateContent(prompt);
    const aiResponse = await result.response;
    const text = aiResponse.text();

    // DEBUG: Log the raw AI response for troubleshooting
    console.log('=== AI DEBUG INFO ===');
    console.log('Raw AI Response:', text);
    console.log('Response Length:', text.length);
    console.log('===================');

    // Parse the AI response as JSON with enhanced error handling
    // WHY try-catch? AI might not always return perfect JSON format
    let parsedAIResponse;
    try {
      // First, try direct JSON parsing
      parsedAIResponse = JSON.parse(text);
      console.log('✅ Successfully parsed JSON directly');
    } catch (parseError) {
      console.log('❌ Direct JSON parsing failed, trying alternative methods...');

      // Try to extract JSON from markdown code blocks
      let jsonText = text.trim();

      // Remove markdown code block markers if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\s*|\s*```/g, '');
        console.log('🔧 Removed markdown json code block markers');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\s*|\s*```/g, '');
        console.log('🔧 Removed generic markdown code block markers');
      }

      // Try to find JSON object in the text (in case AI added extra text)
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
        console.log('🔧 Extracted JSON object from mixed content');
      }

      console.log('Attempting to parse cleaned JSON:', jsonText);

      try {
        parsedAIResponse = JSON.parse(jsonText);
        console.log('✅ Successfully parsed cleaned JSON');
      } catch (secondParseError) {
        console.error('❌ All JSON parsing attempts failed');
        console.error('Original text:', text);
        console.error('Cleaned text:', jsonText);
        console.error('Parse error:', secondParseError);

        // Log the issue for debugging, but provide a fallback problem
        console.error('🚨 AI JSON parsing completely failed - using fallback problem');
        console.error('Raw AI response:', text);
        console.error('Parse error:', secondParseError.message);

        // Use fallback problem so the app still works
        parsedAIResponse = {
          problem_text: "Sarah has 25 apples. She gives 10 apples to her friend. How many apples does Sarah have left?",
          final_answer: 15
        };
      }
    }

    // Validate that we have the required fields
    // WHY? Prevents runtime errors if AI response is malformed
    if (!parsedAIResponse.problem_text || typeof parsedAIResponse.final_answer !== 'number') {
      console.error('❌ Parsed response missing required fields:', parsedAIResponse);
      throw new Error('Invalid AI response format');
    }

    // If we get here, the AI worked! Log success
    console.log('✅ Successfully generated problem from AI:', parsedAIResponse.problem_text.substring(0, 50) + '...');

    // Save the problem to the database
    // WHY? Persists data for tracking and allows multiple attempts per problem
    const { data: session, error: dbError } = await supabase
      .from('math_problem_sessions')
      .insert({
        problem_text: parsedAIResponse.problem_text,
        correct_answer: parsedAIResponse.final_answer,
      })
      .select()
      .single();

    if (dbError) {
      // Detailed error logging for debugging database issues
      console.error('Database error saving problem:', dbError);
      throw new Error(`Failed to save problem: ${dbError.message}`);
    }

    // Return successful response with problem and session ID
    // WHY 201 status? Indicates a resource was created successfully
    const response: GenerateProblemResponse = {
      problem: {
        problem_text: parsedAIResponse.problem_text,
        final_answer: parsedAIResponse.final_answer,
      },
      sessionId: session.id,
    };

    return Response.json(response, { status: 201 });

  } catch (error) {
    // Handle AI or database errors gracefully
    console.error('Error generating problem:', error);
    return Response.json(
      {
        error: 'Failed to generate problem',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

