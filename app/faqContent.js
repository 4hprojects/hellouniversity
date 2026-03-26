const homeFaqItems = Object.freeze([
  {
    question: 'What is HelloUniversity?',
    answer: 'HelloUniversity is a digital academic platform designed to support school and higher education workflows such as classes, assessments, communication, and learning management.'
  },
  {
    question: 'Is HelloUniversity a university or school?',
    answer: 'No. HelloUniversity is not a university itself. It is an online academic platform used by students, teachers, and academic teams.'
  },
  {
    question: 'Does HelloUniversity support senior high school and higher education?',
    answer: 'Yes. HelloUniversity supports senior high school, college, and university use cases with role-aware access for students, teachers, and admins.'
  },
  {
    question: 'What can teachers do in HelloUniversity?',
    answer: 'Teachers can manage classes, share learning materials, post announcements, create quizzes, review submissions, and monitor class activity from one workspace.'
  }
]);

const helpFaqItems = Object.freeze([
  {
    question: 'What is HelloUniversity used for?',
    answer: 'HelloUniversity is used to support school and higher education workflows such as classes, assessments, communication, learning management, and student academic access.'
  },
  {
    question: 'Is HelloUniversity a university or school?',
    answer: 'No. HelloUniversity is not a university itself. It is a digital academic platform for students, teachers, and academic teams.'
  },
  {
    question: 'Does HelloUniversity support senior high school, college, and university workflows?',
    answer: 'Yes. HelloUniversity supports senior high school, college, and university settings through role-aware workspaces for students, teachers, and admins.'
  },
  {
    question: 'How do I create a HelloUniversity account?',
    answer: 'Open the signup page, choose the correct account type, select your school, and complete the registration flow. Teacher access may remain pending until admin approval is granted.'
  },
  {
    question: 'What can students and teachers do in HelloUniversity?',
    answer: 'Students can access lessons, classes, attendance, activities, and grade-related pages. Teachers can manage classes, publish announcements, build quizzes, review results, and monitor academic activity.'
  },
  {
    question: 'How do I reset my HelloUniversity password?',
    answer: 'Use the reset password page, verify your account email, and follow the recovery steps to set a new password.'
  }
]);

function buildFaqStructuredDataScript(faqItems) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };

  const schemaJson = JSON.stringify(schema).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${schemaJson}</script>`;
}

module.exports = {
  homeFaqItems,
  helpFaqItems,
  buildFaqStructuredDataScript
};
