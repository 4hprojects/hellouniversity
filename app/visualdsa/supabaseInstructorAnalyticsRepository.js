const { requireData } = require('./supabasePracticeRepository');

function round(value) {
  return Math.round(value * 100) / 100;
}

function createSupabaseInstructorAnalyticsRepository(supabase) {
  if (!supabase?.from) throw new TypeError('A Supabase client is required.');
  return Object.freeze({
    async createAssignment(input) {
      const moduleRow = requireData('assignment module lookup', await supabase.from('visualdsa_modules')
        .select('id,module_key,version').eq('module_key', input.moduleKey).eq('status', 'active').maybeSingle());
      if (!moduleRow) throw Object.assign(new Error('Module unavailable.'), { code: 'INVALID_INPUT' });
      const templateRow = requireData('assignment template lookup', await supabase.from('visualdsa_problem_templates')
        .select('id,template_key').eq('module_id', moduleRow.id).eq('template_key', input.templateKey).eq('is_active', true).maybeSingle());
      if (!templateRow) throw Object.assign(new Error('Problem template unavailable.'), { code: 'INVALID_INPUT' });
      const row = requireData('assignment creation', await supabase.from('visualdsa_assessment_assignments').insert({
        class_id: input.classItem.id, created_by_user_id: input.identity.userId, module_id: moduleRow.id,
        title: input.title, status: 'published', available_from: input.availableFrom, available_until: input.availableUntil,
        settings: { templateKey: templateRow.template_key, attemptLimit: input.attemptLimit, timeLimitMinutes: input.timeLimitMinutes, scoringVersion: '1.0.0' }
      }).select('id,title,status,available_from,available_until').single());
      return { assignmentId: row.id, title: row.title, status: row.status, moduleKey: moduleRow.module_key, moduleVersion: moduleRow.version, availableFrom: row.available_from, availableUntil: row.available_until };
    },
    async overview(classItem) {
      const [masteryResult, attemptsResult, eventsResult] = await Promise.all([
        supabase.from('visualdsa_topic_mastery')
          .select('student_id,module_key,mastery_score,mastery_status,calculated_at').eq('class_id', classItem.id),
        supabase.from('visualdsa_assessment_attempts')
          .select('student_id,status,percentage_score,assignment_id,visualdsa_assessment_assignments(visualdsa_modules(module_key))')
          .eq('class_id', classItem.id),
        supabase.from('visualdsa_interaction_events')
          .select('student_id,module_key,step_number,is_correct,response_number,misconception_code,response_time_ms')
          .eq('class_id', classItem.id)
      ]);
      const mastery = requireData('class mastery', masteryResult);
      const attempts = requireData('class attempts', attemptsResult);
      const events = requireData('class events', eventsResult);
      const moduleKeys = new Set([
        ...mastery.map((item) => item.module_key),
        ...attempts.map((item) => item.visualdsa_assessment_assignments?.visualdsa_modules?.module_key).filter(Boolean)
      ]);
      const modules = [...moduleKeys].sort().map((moduleKey) => {
        const moduleMastery = mastery.filter((item) => item.module_key === moduleKey);
        const moduleAttempts = attempts.filter((item) =>
          item.visualdsa_assessment_assignments?.visualdsa_modules?.module_key === moduleKey);
        return {
          moduleKey,
          started: new Set(moduleAttempts.map((item) => item.student_id)).size,
          completed: new Set(moduleAttempts.filter((item) => item.status === 'graded').map((item) => item.student_id)).size,
          averageMastery: moduleMastery.length
            ? round(moduleMastery.reduce((sum, item) => sum + Number(item.mastery_score || 0), 0) / moduleMastery.length)
            : null,
          interventions: moduleMastery.filter((item) => ['needs_review', 'developing'].includes(item.mastery_status)).length
        };
      });
      const misconceptionMap = events.reduce((map, item) => {
        if (!item.misconception_code) return map;
        const key = `${item.module_key}:${item.misconception_code}`;
        const value = map[key] || { code: item.misconception_code, moduleKey: item.module_key, events: 0, students: new Set() };
        value.events += 1;
        value.students.add(item.student_id);
        map[key] = value;
        return map;
      }, {});
      const misconceptions = Object.entries(misconceptionMap)
        .map(([, value]) => ({ code: value.code, moduleKey: value.moduleKey, events: value.events, students: value.students.size }))
        .sort((left, right) => right.events - left.events || left.code.localeCompare(right.code));
      const firstAttempts = events.filter((item) => Number(item.response_number || 1) === 1);
      const stepMap = firstAttempts.reduce((map, item) => {
        const key = `${item.module_key}:${item.step_number}`;
        const value = map[key] || { moduleKey: item.module_key, stepNumber: item.step_number, total: 0, correct: 0 };
        value.total += 1;
        if (item.is_correct) value.correct += 1;
        map[key] = value;
        return map;
      }, {});
      const difficultSteps = Object.values(stepMap)
        .map((item) => ({ ...item, firstAttemptAccuracy: item.total ? round((item.correct / item.total) * 100) : 0 }))
        .sort((left, right) => left.firstAttemptAccuracy - right.firstAttemptAccuracy || right.total - left.total);
      return {
        classItem,
        enrolledStudents: classItem.studentIds.length,
        modules,
        masteryMatrix: mastery,
        misconceptions,
        difficultSteps,
        interventions: mastery.filter((item) => ['needs_review', 'developing'].includes(item.mastery_status))
      };
    },
    async student(classItem, studentId) {
      const [masteryResult, attemptsResult, eventsResult] = await Promise.all([
        supabase.from('visualdsa_topic_mastery').select('*').eq('class_id', classItem.id).eq('student_id', studentId),
        supabase.from('visualdsa_assessment_attempts')
          .select('id,status,percentage_score,attempt_number,started_at,submitted_at')
          .eq('class_id', classItem.id).eq('student_id', studentId),
        supabase.from('visualdsa_interaction_events')
          .select('misconception_code,client_timestamp,server_timestamp')
          .eq('class_id', classItem.id).eq('student_id', studentId).not('misconception_code', 'is', null)
      ]);
      return {
        classItem,
        studentId,
        mastery: requireData('student mastery', masteryResult),
        attempts: requireData('student attempts', attemptsResult),
        misconceptions: requireData('student misconceptions', eventsResult)
      };
    }
  });
}

module.exports = { createSupabaseInstructorAnalyticsRepository };
