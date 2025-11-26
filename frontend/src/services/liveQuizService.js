/**
 * Live Quiz Service - Firebase Realtime Database
 * Handles realtime quiz synchronization for 100+ concurrent users
 */

import { ref, set, onValue, off, push, update, get } from 'firebase/database'
import { getRTDB } from '../firebase'

/**
 * Create a new live quiz session
 * @param {string} teacherId - Teacher user ID
 * @param {Object} quizData - Quiz data (title, questions, etc.)
 * @returns {Promise<string>} Quiz ID
 */
export async function createLiveQuiz(teacherId, quizData) {
  const rtdb = getRTDB()
  const quizRef = push(ref(rtdb, 'quiz'))
  const quizId = quizRef.key

  const quizSession = {
    teacherId,
    title: quizData.title,
    subject: quizData.subject,
    status: 'waiting', // waiting, question_1, question_2, ..., finished
    currentQuestion: 0,
    startTime: null,
    createdAt: Date.now(),
    questions: quizData.questions || {},
    answers: {},
    leaderboard: {},
    settings: {
      timePerQuestion: quizData.timePerQuestion || 30, // seconds
      showLeaderboard: quizData.showLeaderboard !== false,
    },
  }

  await set(quizRef, quizSession)
  return quizId
}

/**
 * Start a quiz (teacher only)
 * @param {string} quizId - Quiz ID
 */
export async function startQuiz(quizId) {
  const rtdb = getRTDB()
  const quizRef = ref(rtdb, `quiz/${quizId}`)
  await update(quizRef, {
    status: 'question_1',
    currentQuestion: 1,
    startTime: Date.now(),
  })
}

/**
 * Move to next question (teacher only)
 * @param {string} quizId - Quiz ID
 * @param {number} questionNumber - Next question number
 */
export async function nextQuestion(quizId, questionNumber) {
  const rtdb = getRTDB()
  const quizRef = ref(rtdb, `quiz/${quizId}`)
  await update(quizRef, {
    status: `question_${questionNumber}`,
    currentQuestion: questionNumber,
  })
}

/**
 * End quiz (teacher only)
 * @param {string} quizId - Quiz ID
 */
export async function endQuiz(quizId) {
  const rtdb = getRTDB()
  const quizRef = ref(rtdb, `quiz/${quizId}`)
  await update(quizRef, {
    status: 'finished',
  })
}

/**
 * Submit answer (student)
 * @param {string} quizId - Quiz ID
 * @param {string} userId - User ID
 * @param {number} questionNumber - Question number
 * @param {string} answer - Selected answer (A, B, C, D)
 */
export async function submitAnswer(quizId, userId, questionNumber, answer) {
  const rtdb = getRTDB()
  const answerRef = ref(rtdb, `quiz/${quizId}/answers/${userId}`)
  
  // Get current answers
  const snapshot = await get(answerRef)
  const currentAnswers = snapshot.val() || {}
  
  // Update with new answer
  await update(answerRef, {
    ...currentAnswers,
    [questionNumber]: answer,
    lastUpdated: Date.now(),
  })
}

/**
 * Listen to quiz status changes (realtime)
 * @param {string} quizId - Quiz ID
 * @param {Function} callback - Callback function (status) => void
 * @returns {Function} Unsubscribe function
 */
export function watchQuizStatus(quizId, callback) {
  const rtdb = getRTDB()
  const statusRef = ref(rtdb, `quiz/${quizId}/status`)
  
  onValue(statusRef, (snapshot) => {
    const status = snapshot.val()
    callback(status)
  })

  return () => off(statusRef)
}

/**
 * Listen to quiz data (realtime)
 * @param {string} quizId - Quiz ID
 * @param {Function} callback - Callback function (quizData) => void
 * @returns {Function} Unsubscribe function
 */
export function watchQuiz(quizId, callback) {
  const rtdb = getRTDB()
  const quizRef = ref(rtdb, `quiz/${quizId}`)
  
  onValue(quizRef, (snapshot) => {
    const quizData = snapshot.val()
    callback(quizData)
  })

  return () => off(quizRef)
}

/**
 * Listen to leaderboard (realtime)
 * @param {string} quizId - Quiz ID
 * @param {Function} callback - Callback function (leaderboard) => void
 * @returns {Function} Unsubscribe function
 */
export function watchLeaderboard(quizId, callback) {
  const rtdb = getRTDB()
  const leaderboardRef = ref(rtdb, `quiz/${quizId}/leaderboard`)
  
  onValue(leaderboardRef, (snapshot) => {
    const leaderboard = snapshot.val() || {}
    // Convert to array and sort by score
    const sorted = Object.entries(leaderboard)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
    callback(sorted)
  })

  return () => off(leaderboardRef)
}

/**
 * Calculate and update leaderboard (should be called by Cloud Function or Teacher)
 * @param {string} quizId - Quiz ID
 */
export async function calculateLeaderboard(quizId) {
  const rtdb = getRTDB()
  const quizRef = ref(rtdb, `quiz/${quizId}`)
  const snapshot = await get(quizRef)
  const quiz = snapshot.val()

  if (!quiz || !quiz.questions) return

  const leaderboard = {}
  const answers = quiz.answers || {}
  const questions = quiz.questions || {}

  // Calculate scores for each user
  Object.entries(answers).forEach(([userId, userAnswers]) => {
    let score = 0
    let correct = 0
    let total = 0

    Object.entries(userAnswers).forEach(([qNum, answer]) => {
      if (qNum === 'lastUpdated') return
      
      total++
      const question = questions[qNum]
      if (question && question.correctAnswer === answer) {
        correct++
        score += 10 // 10 points per correct answer
      }
    })

    leaderboard[userId] = {
      score,
      correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  })

  // Update leaderboard
  await update(ref(rtdb, `quiz/${quizId}`), { leaderboard })
}

/**
 * Get quiz data (one-time)
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} Quiz data
 */
export async function getQuiz(quizId) {
  const rtdb = getRTDB()
  const quizRef = ref(rtdb, `quiz/${quizId}`)
  const snapshot = await get(quizRef)
  return snapshot.val()
}

