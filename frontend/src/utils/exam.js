export const pickRandomVariants = (questions = [], count = 10) => {
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export const gradeSubmission = ({ questions, answers }) => {
  let score = 0
  questions.forEach((question, index) => {
    if (answers[index] && answers[index] === question.correct_answer) {
      score += 1
    }
  })
  return {
    score,
    total: questions.length,
    percentage: Math.round((score / questions.length) * 100),
  }
}
