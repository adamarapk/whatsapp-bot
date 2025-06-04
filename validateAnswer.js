const correctAnswers = [
  "ilham",
  "kakaknya",
  "karena warisan",
];

export function validateAnswer(input) {
  const jawaban = input.toLowerCase().trim();
  return correctAnswers.some((ans) => jawaban.includes(ans));
}