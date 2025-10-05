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
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'random';
}

interface GenerateProblemResponse {
  problem: {
    problem_text: string;
    final_answer: number;
    hint?: string; // Optional hint for helping students
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
    // Parse request body to get difficulty and topic preferences
    const body = await request.json() as GenerateProblemRequest;
    const difficulty = body.difficulty || 'medium';
    const topic = body.topic || 'random';
    
    // Handle problem generation with user preferences
    return await handleGenerateProblem(request, difficulty, topic);
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
async function handleGenerateProblem(
  request: Request, 
  difficulty: 'easy' | 'medium' | 'hard',
  topic: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'random'
): Promise<Response> {
  // Initialize Gemini AI model
  // WHY 'gemini-2.0-flash'? It's Google's most capable model for text generation
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Build difficulty-specific instructions
  const difficultyInstructions = {
    easy: `
      EASY DIFFICULTY:
      - Single-step problems only
      - Use small, friendly numbers (under 100)
      - Simple operations: basic addition, subtraction, or single multiplication/division
      - Clear, straightforward scenarios
      - Example: "A basket has 12 apples. You add 8 more. How many apples are there now?"
    `,
    medium: `
      MEDIUM DIFFICULTY:
      - Two-step problems
      - Use larger numbers (up to 500)
      - Can combine operations
      - Slightly more complex scenarios
      - Example: "A store has 45 boxes with 6 pencils each. If they sell 70 pencils, how many are left?"
    `,
    hard: `
      HARD DIFFICULTY:
      - Multi-step problems (3+ steps)
      - Use larger numbers and fractions/decimals where appropriate
      - Require deeper reasoning and planning
      - Complex word problem scenarios
      - Still appropriate for Primary 5 level
      - Example: "A library has 8 shelves with 15 books each. They receive 3 boxes of 12 new books. If they remove 25 damaged books, how many books remain?"
      - For HARD problems, provide a MORE DETAILED hint that breaks down the steps
    `
  };

  // Build topic-specific instructions
  const topicInstructions = {
    addition: 'Use ONLY ADDITION operations (can be multi-step addition)',
    subtraction: 'Use ONLY SUBTRACTION operations (can be multi-step subtraction)',
    multiplication: 'Use ONLY MULTIPLICATION operations (can include finding totals of groups)',
    division: 'Use ONLY DIVISION operations (can include sharing or grouping problems)',
    random: 'Use ANY combination of operations (addition, subtraction, multiplication, division)'
  };

  // Create a detailed prompt for the AI
  // WHY THIS PROMPT? Specifies age group, math level, variety requirements, and exact JSON format
  // NOTE: Enhanced with diversity instructions to prevent repetitive problems
  const prompt = `
    Generate a UNIQUE and CREATIVE math word problem suitable for Primary 5 students (10-11 years old).
    
    DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
    ${difficultyInstructions[difficulty]}
    
    TOPIC: ${topic.toUpperCase()}
    ${topicInstructions[topic]}
    
    VARIETY REQUIREMENTS - Make each problem different:
    - Use DIVERSE scenarios: sports, cooking, animals, school, games, shopping, nature, travel, books, arts, technology
    - Use VARIED problem structures: finding totals, differences, rates, distributions, comparisons, equal groups
    - Use DIFFERENT names each time (avoid repeating common names like Sarah, Lily, John)
    - Make each problem feel UNIQUE and engaging for children
    
    EXAMPLES OF DIVERSE PROBLEMS:
    - "A zoo has 48 penguins split equally into 6 enclosures. How many penguins are in each enclosure?"
    - "Tom scored 23 points in the first basketball game and 31 in the second. How many total points did he score?"
    - "A bakery makes 156 cookies and packs them into boxes of 12. How many boxes can they fill?"
    - "Emma has 5 sticker books with 25 pages each. If each page holds 8 stickers, how many stickers can she collect in total?"
    - "A farmer planted 7 rows of tomato plants with 9 plants in each row. How many tomato plants did he plant?"

    CRITICAL REQUIREMENTS:
    - Respond with ONLY a valid JSON object
    - Include a HELPFUL HINT that guides students without giving away the answer
    - The hint should be simple and direct, appropriate for 10-11 year olds
    - Do NOT include any explanations, markdown, or extra text
    - Do NOT wrap in code blocks
    - Format MUST be exactly:

    {
      "problem_text": "Your unique and creative problem here...",
      "final_answer": 42,
      "hint": "Your helpful hint here..."
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

    // Validate hint field (optional but log if missing)
    // WHY? Hints are expected but not critical - we can proceed without them
    if (!parsedAIResponse.hint) {
      console.warn('⚠️ AI response missing hint field - hint button will not be shown');
    }

    // If we get here, the AI worked! Log success
    console.log('✅ Successfully generated problem from AI:', parsedAIResponse.problem_text.substring(0, 50) + '...');
    console.log('💡 Hint provided:', parsedAIResponse.hint ? 'Yes' : 'No');

    // Save the problem to the database (including hint, difficulty, and topic)
    // WHY? Persists data for tracking and allows multiple attempts per problem
    // NOTE: Hint is optional - if AI doesn't provide it, we save NULL
    const { data: session, error: dbError } = await supabase
      .from('math_problem_sessions')
      .insert({
        problem_text: parsedAIResponse.problem_text,
        correct_answer: parsedAIResponse.final_answer,
        hint: parsedAIResponse.hint || null, // Use null if hint is missing
        difficulty: difficulty, // Save user's difficulty preference
        topic: topic, // Save user's topic preference
      })
      .select()
      .single();

    if (dbError) {
      // Detailed error logging for debugging database issues
      console.error('Database error saving problem:', dbError);
      throw new Error(`Failed to save problem: ${dbError.message}`);
    }

    // Return successful response with problem, hint, and session ID
    // WHY 201 status? Indicates a resource was created successfully
    // NOTE: Include hint in response so frontend can display it
    const response: GenerateProblemResponse = {
      problem: {
        problem_text: parsedAIResponse.problem_text,
        final_answer: parsedAIResponse.final_answer,
        hint: parsedAIResponse.hint, // Include hint for frontend display
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

