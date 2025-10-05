'use client'

import { useState } from 'react'

interface MathProblem {
  problem_text: string
  final_answer: number
  hint?: string  // Optional hint from AI - may not always be present
}

export default function Home() {
  const [problem, setProblem] = useState<MathProblem | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)

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
      setShowHint(false); // Reset hint visibility for new problem

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
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      {/* Blur and overlay effect for background - increased opacity for comfort */}
      <div 
        className="absolute inset-0 backdrop-blur-md bg-black/40"
        style={{ zIndex: 0 }}
      ></div>

      <main className="container mx-auto px-4 py-8 max-w-3xl relative flex items-center justify-center min-h-screen" style={{ zIndex: 1 }}>
        {/* Single unified container with all content */}
        <div className="w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Fancy title with gradient and shadow - responsive font size */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg">
            Math Problem Generator
          </h1>

          {/* Divider after title */}
          <div className="border-t-2 border-gray-100 mb-6"></div>

          {/* Generate button - shown when no problem exists */}
          {!problem && (
            <div className="mb-6">
              <button
                onClick={generateProblem}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl disabled:transform-none"
              >
                {isLoading ? '✨ Generating...' : '🎲 Generate New Problem'}
              </button>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              <p className="font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Problem display section */}
          {problem && (
            <div className="border-t-2 border-gray-100 pt-6 mt-6">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text">
              ❓ Problem:
            </h2>
            <p className="text-lg text-gray-800 leading-relaxed mb-6 font-medium">
              {problem.problem_text}
            </p>

            {/* Hint Button - Only show if hint is available */}
            {problem.hint && (
              <div className="mb-6">
                {!showHint ? (
                  <button
                    onClick={() => setShowHint(true)}
                    type="button"
                    className="text-amber-600 hover:text-amber-700 font-semibold text-sm flex items-center gap-2 transition duration-200 hover:gap-3"
                  >
                    💡 Need Help? Show Hint
                  </button>
                ) : (
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-5 shadow-md">
                    <p className="text-sm font-bold text-amber-800 mb-2">💡 Hint</p>
                    <p className="text-sm text-amber-900 leading-relaxed">{problem.hint}</p>
                  </div>
                )}
              </div>
            )}
            
            <form onSubmit={submitAnswer} className="space-y-5">
              <div>
                <label htmlFor="answer" className="block text-base font-bold text-gray-700 mb-3">
                  ✍️ Your Answer:
                </label>
                <input
                  type="number"
                  id="answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-lg font-medium text-gray-900"
                  placeholder="Enter your answer"
                  required
                />
              </div>
              
              {/* Action buttons - responsive: stacked on mobile, side-by-side on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={generateProblem}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl disabled:transform-none"
                >
                  {isLoading ? '✨ Generating...' : '🎲 New Problem'}
                </button>
                
                <button
                  type="submit"
                  disabled={!userAnswer || isLoading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl disabled:transform-none"
                >
                  {isLoading ? '⏳ Checking...' : '✅ Submit Answer'}
                </button>
              </div>
            </form>
            </div>
          )}

          {/* Feedback section */}
          {feedback && (
            <div className={`border-t-2 border-gray-100 pt-6 mt-6 rounded-xl p-6 ${
              isCorrect 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50' 
                : 'bg-gradient-to-br from-yellow-50 to-amber-50'
            }`}>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                {isCorrect ? '🎉 Correct! Amazing!' : '🤔 Not quite right'}
              </h2>
              <p className="text-gray-900 leading-relaxed text-lg font-medium">{feedback}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}