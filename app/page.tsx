'use client'

import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'

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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  // Difficulty and topic preferences - persisted across problem generations
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [topic, setTopic] = useState<'addition' | 'subtraction' | 'multiplication' | 'division' | 'random'>('random')
  
  // Temporary selections in modal (committed only when "Generate Problem" is clicked)
  const [tempDifficulty, setTempDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [tempTopic, setTempTopic] = useState<'addition' | 'subtraction' | 'multiplication' | 'division' | 'random'>('random')

  /**
   * Trigger confetti animation for correct answers
   * WHY? Celebrates student success and makes learning fun!
   */
  const triggerConfetti = () => {
    const duration = 3000; // 3 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      // Confetti from right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  }

  /**
   * Handle closing the feedback modal
   * WHY? Allows users to re-attempt the same question
   */
  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
  }

  /**
   * Handle "Try Another Problem" button
   * WHY? Closes modal and generates new problem automatically
   */
  const handleTryAnotherProblem = () => {
    setShowFeedbackModal(false);
    openSettingsModal();
  }

  /**
   * Open settings modal
   * WHY? Shows difficulty and topic selection before generating problem
   */
  const openSettingsModal = () => {
    // Pre-populate modal with last selections
    setTempDifficulty(difficulty);
    setTempTopic(topic);
    setShowSettingsModal(true);
  }

  /**
   * Close settings modal without generating
   * WHY? Allows users to cancel if they change their mind
   */
  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  }

  /**
   * Handle "Generate Problem" from settings modal
   * WHY? Commits selections and triggers problem generation
   */
  const handleGenerateFromModal = () => {
    // Commit temporary selections to actual state
    setDifficulty(tempDifficulty);
    setTopic(tempTopic);
    setShowSettingsModal(false);
    // Generate problem with new settings
    generateProblemWithSettings(tempDifficulty, tempTopic);
  }

  /**
   * Close modals on Escape key press
   * WHY? Improves UX with keyboard accessibility
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFeedbackModal) {
          closeFeedbackModal();
        } else if (showSettingsModal) {
          closeSettingsModal();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showFeedbackModal, showSettingsModal]);

  /**
   * Generates a new math problem using AI with specific settings
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
   * - User-friendly error message displayed
   */
  const generateProblemWithSettings = async (selectedDifficulty: 'easy' | 'medium' | 'hard', selectedTopic: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'random') => {
    // Set loading state to true immediately to prevent multiple rapid clicks
    // WHY? Users might click button multiple times quickly, causing duplicate requests
    setIsLoading(true);

    try {
      // Make API call to generate new problem with user preferences
      // WHY POST method? Creating a new resource (problem session)
      // WHY send body? User's difficulty and topic preferences customize the problem
      const response = await fetch('/api/math-problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          difficulty: selectedDifficulty,
          topic: selectedTopic,
        }),
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

      // Show feedback modal immediately
      setShowFeedbackModal(true);

      // Trigger confetti animation if answer is correct
      if (data.isCorrect) {
        triggerConfetti();
      }

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
                onClick={openSettingsModal}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl disabled:transform-none"
              >
                {isLoading ? '✨ Generating...' : '🎲 New Problem'}
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
            {/* Problem Header with Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text">
                ❓ Problem:
              </h2>
              {/* Difficulty Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                difficulty === 'medium' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {difficulty.toUpperCase()}
              </span>
              {/* Topic Badge */}
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                {topic === 'addition' ? '➕ Addition' :
                 topic === 'subtraction' ? '➖ Subtraction' :
                 topic === 'multiplication' ? '✖️ Multiplication' :
                 topic === 'division' ? '➗ Division' :
                 '🎲 Random'}
              </span>
            </div>
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
                  type="submit"
                  disabled={!userAnswer || isLoading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl disabled:transform-none"
                >
                  {isLoading ? '⏳ Checking...' : '✅ Submit Answer'}
                </button>
                
                <button
                  type="button"
                  onClick={openSettingsModal}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl disabled:transform-none"
                >
                  {isLoading ? '✨ Generating...' : '🎲 New Problem'}
                </button>
              </div>
            </form>
            </div>
          )}

        </div>
      </main>

      {/* Feedback Modal */}
      {showFeedbackModal && feedback && (
        <>
          {/* Backdrop - semi-transparent with blur */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={closeFeedbackModal}
          ></div>

          {/* Modal Container - centered with fade + scale animation */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl transform transition-all duration-300 scale-100 flex flex-col ${
                isCorrect 
                  ? 'border-4 border-green-400' 
                  : 'border-4 border-yellow-400'
              }`}
              style={{ animation: 'modalFadeIn 0.3s ease-out', maxHeight: '85vh' }}
            >
              {/* Close button (X) */}
              <button
                onClick={closeFeedbackModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Scrollable Feedback Content */}
              <div className="overflow-y-auto overflow-x-hidden px-8 pt-8 pb-4 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                <div className={`text-center p-6 rounded-2xl ${
                  isCorrect 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50' 
                    : 'bg-gradient-to-br from-yellow-50 to-amber-50'
                }`}>
                  <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">
                    {isCorrect ? '🎉 Correct! Amazing!' : '🤔 Not quite right'}
                  </h2>
                  <p className="text-gray-900 leading-relaxed text-base font-medium">
                    {feedback}
                  </p>
                </div>
              </div>

              {/* Scroll Indicator - subtle gradient fade at bottom */}
              <div className="absolute bottom-20 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>

              {/* Try Another Problem Button - Fixed at bottom */}
              <div className="px-8 pb-8 pt-4 bg-white rounded-b-3xl">
                <button
                  onClick={handleTryAnotherProblem}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl"
                >
                  🎲 Try Another Problem
                </button>
              </div>
            </div>
          </div>

          {/* CSS Animation for modal entrance */}
          <style jsx>{`
            @keyframes modalFadeIn {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={closeSettingsModal}
          ></div>

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 transform transition-all duration-300 scale-100 border-4 border-blue-400"
              style={{ animation: 'modalFadeIn 0.3s ease-out' }}
            >
              {/* Close button (X) */}
              <button
                onClick={closeSettingsModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Header */}
              <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                ⚙️ Problem Settings
              </h2>

              {/* Difficulty Selection */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  🎚️ Difficulty Level
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setTempDifficulty(level)}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition duration-200 ${
                        tempDifficulty === level
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Selection */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  📚 Topic
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'addition' as const, icon: '➕', label: 'Addition' },
                    { key: 'subtraction' as const, icon: '➖', label: 'Subtraction' },
                    { key: 'multiplication' as const, icon: '✖️', label: 'Multiply' },
                    { key: 'division' as const, icon: '➗', label: 'Division' },
                    { key: 'random' as const, icon: '🎲', label: 'Random', fullWidth: true }
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTempTopic(t.key)}
                      className={`px-4 py-3 rounded-lg font-semibold transition duration-200 text-sm ${
                        tempTopic === t.key
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } ${(t as any).fullWidth ? 'col-span-2' : ''}`}
                    >
                      <span className="mr-2">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleGenerateFromModal}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl"
                >
                  ✨ Generate Problem
                </button>
                <button
                  onClick={closeSettingsModal}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl transition duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}