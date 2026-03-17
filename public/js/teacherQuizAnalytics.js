(function attachTeacherQuizAnalytics(global) {
    async function init() {
        const quizId = document.body?.dataset?.quizId;
        if (!quizId) return;

        try {
            const [quizResponse, analyticsResponse] = await Promise.all([
                fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}`, { credentials: 'include' }),
                fetch(`/api/quiz-builder/quizzes/${encodeURIComponent(quizId)}/analytics`, { credentials: 'include' })
            ]);
            const quizData = await quizResponse.json();
            const analyticsData = await analyticsResponse.json();

            if (!quizResponse.ok || !quizData.success || !quizData.quiz) throw new Error(quizData.message || 'Failed to load quiz.');
            if (!analyticsResponse.ok || !analyticsData.success) throw new Error(analyticsData.message || 'Failed to load analytics.');

            document.getElementById('teacherQuizAnalyticsTitle').textContent = `${quizData.quiz.title || quizData.quiz.quizTitle || 'Quiz'} Analytics`;
            renderAnalytics(analyticsData.analytics || {});
        } catch (error) {
            console.error('Quiz analytics load failed:', error);
            document.getElementById('teacherQuizAnalyticsStatus').textContent = error.message || 'Unable to load analytics.';
        }
    }

    function renderAnalytics(analytics) {
        const possible = Number(analytics.scorePossible || 0);
        document.getElementById('teacherQuizAnalyticsTotalResponses').textContent = String(Number(analytics.totalResponses || 0));
        document.getElementById('teacherQuizAnalyticsAverageScore').textContent = formatScore(analytics.averageScore, possible);
        document.getElementById('teacherQuizAnalyticsHighestScore').textContent = formatScore(analytics.highestScore, possible);
        document.getElementById('teacherQuizAnalyticsLowestScore').textContent = formatScore(analytics.lowestScore, possible);
        document.getElementById('teacherQuizAnalyticsStatus').textContent = possible
            ? `Scores are shown out of ${possible} point(s).`
            : 'No completed submissions yet.';
    }

    function formatScore(score, possible) {
        const numeric = Number(score || 0);
        return possible ? `${numeric.toFixed(1)} / ${possible}` : numeric.toFixed(1);
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherQuizAnalytics = { init };
})(window);
