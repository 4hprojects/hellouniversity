// /quiz/js/scoreLesson6.js (ES module)
export function computeLesson6Score(answers) {
    // Map: questionName => correctAnswerValue
    const correctAnswers = {
      q12: "report_spam",
      q10: "sams0n_long",
      q7:  "trick_personal_info",
      q3:  "use_vpn",
      q13: "extra_layer",
      q9:  "when_available",
      q6:  "harmful_software",
      q14:"data_loss_protect",
      q5:  "blocking_unauthorized",
      q11: "False",
      q4:  "False",
      q15: "True",
      q1:  "False",
      q8:  "protecting_systems",
      q2:  "unauthorized_access"
      // ... add any you left out or reorder as needed
    };
  
    let score = 0;
    for (let key in correctAnswers) {
      // If answers.q12 === "report_spam", increment
      if (answers[key] && answers[key] === correctAnswers[key]) {
        score++;
      }
    }
    return score;
  }
  