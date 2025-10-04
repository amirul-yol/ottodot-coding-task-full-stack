'use client'

import { useState } from 'react'

interface MathProblem {
  problem_text: string
  final_answer: number
}

export default function Home() {
  const [problem, setProblem] = useState<MathProblem | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Generates a new math problem using AI
   *
   * HOW IT WORKS:
   * 1. Makes a POST request to /api/math-problem to generate a new problem
   * 2. API uses Google Gemini AI to create a Primary 5 level math word problem
   * 3. Problem is automatically saved to database by the API
   * 4. Updates local state with the new problem and session ID
   *
   * WHY THIS APPROACH?
   * - Separates frontend concerns (UI state) from backend logic (AI generation)
   * - Uses async/await for cleaner error handling than promise chains
   * - Resets previous feedback and answer when generating new problem
   * - Shows loading state to prevent multiple simultaneous requests
   *
   * ERROR HANDLING STRATEGY:
   * - Try-catch for network errors or API failures
   * - Console logging for debugging (visible in browser dev tools)
   * - Loading state automatically cleared on error
   * - User sees no error message (graceful degradation)
   */
  const generateProblem = async () => {
    // Set loading state to true immediately to prevent multiple rapid clicks
    // WHY? Users might click button multiple times quickly, causing duplicate requests
    setIsLoading(true);

    try {
      // Make API call to generate new problem
      // WHY POST method? Creating a new resource (problem session)
      // WHY no request body? AI generates random problems, no parameters needed
      const response = await fetch('/api/math-problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No body needed - AI generates random problems
        },
      });

      // Check if the API call was successful
      // WHY? Network errors or server issues should be handled gracefully
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      // Parse the JSON response from the API
      // WHY await? Response.json() returns a Promise
      const data = await response.json();

      // Update state with the new problem and session information
      // WHY? Frontend needs to display the problem and track which session this is for submissions
      setProblem(data.problem);
      setSessionId(data.sessionId);

      // Clear previous feedback, user input, and any error messages when generating new problem
      // WHY? Prevents confusion from old feedback showing with new problem
      setFeedback('');
      setUserAnswer('');
      setIsCorrect(null);
      setError(null); // Clear any previous errors on successful generation

    } catch (error) {
      // Handle any errors during the API call
      // WHY console.error? Helps with debugging in browser dev tools
      console.error('Failed to generate problem:', error);

      // Show user-friendly error message instead of silent failure
      // WHY? Users should know when operations fail so they can retry or troubleshoot
      setError('Failed to generate problem. Please check your connection and try again.');

    } finally {
      // Always clear loading state when done (success or failure)
      // WHY? Ensures button becomes clickable again
      setIsLoading(false);
    }
  }

  /**
   * Submits the user's answer and gets AI-generated feedback
   *
   * HOW IT WORKS:
   * 1. Prevents default form submission behavior
   * 2. Sends user's answer and session ID to /api/math-problem/submit
   * 3. API compares answer with correct answer and generates feedback using AI
   * 4. Updates UI with feedback and correctness status
   *
   * WHY THIS APPROACH?
   * - e.preventDefault() prevents page reload on form submission
   * - Validates session exists before making API call (user must generate problem first)
   * - Converts string input to number for proper comparison
   * - Updates multiple state variables to show comprehensive feedback
   *
   * FORM VALIDATION STRATEGY:
   * - Button already disabled if userAnswer is empty (handled in JSX)
   * - Additional check prevents submission without active session
   * - Number conversion ensures proper data type for API
   */
  const submitAnswer = async (e: React.FormEvent) => {
    // Prevent default form submission (page reload)
    // WHY? We want to handle submission with JavaScript for better UX
    e.preventDefault();

    // Validate that we have a session ID (user must generate a problem first)
    // WHY? Prevents API calls without context, ensures data integrity
    if (!sessionId) {
      console.error('No active session - user must generate a problem first');
      return;
    }

    // Set loading state to prevent multiple submissions
    // WHY? Users might click submit multiple times quickly
    setIsLoading(true);

    try {
      // Prepare request body with session ID and user's answer
      // WHY parseInt? Converts string input to number for proper comparison
      const requestBody = {
        sessionId: sessionId,
        userAnswer: parseInt(userAnswer), // Convert string to number
      };

      // Make API call to submit answer and get feedback
      // WHY POST method? Creating a new submission record
      const response = await fetch('/api/math-problem/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Check if API call was successful
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      // Parse the response containing feedback and correctness
      const data = await response.json();

      // Update UI state with feedback results
      // WHY? Shows user whether they were correct and provides learning feedback
      setFeedback(data.feedback);
      setIsCorrect(data.isCorrect);
      setError(null); // Clear any previous errors on successful submission

      // Note: We don't clear userAnswer here - user might want to see what they entered
      // They'll need to generate a new problem to continue

    } catch (error) {
      // Handle errors during submission
      console.error('Failed to submit answer:', error);

      // Show user-friendly error message instead of silent failure
      // WHY? Users should know when operations fail so they can retry or troubleshoot
      setError('Failed to submit answer. Please try again.');

    } finally {
      // Always clear loading state when done
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Math Problem Generator
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={generateProblem}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
          >
            {isLoading ? 'Generating...' : 'Generate New Problem'}
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {problem && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Problem:</h2>
            <p className="text-lg text-gray-800 leading-relaxed mb-6">
              {problem.problem_text}
            </p>
            
            <form onSubmit={submitAnswer} className="space-y-4">
              <div>
                <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer:
                </label>
                <input
                  type="number"
                  id="answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your answer"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={!userAnswer || isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
              >
                Submit Answer
              </button>
            </form>
          </div>
        )}

        {feedback && (
          <div className={`rounded-lg shadow-lg p-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {isCorrect ? '✅ Correct!' : '❌ Not quite right'}
            </h2>
            <p className="text-gray-800 leading-relaxed">{feedback}</p>
          </div>
        )}
      </main>
    </div>
  )
}