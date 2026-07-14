const EVENT_TYPES = new Set(['module_opened','mode_selected','practice_started','assessment_started','session_paused','session_resumed','session_completed','session_abandoned','assessment_submitted','assessment_graded','visualization_started','play_pressed','pause_pressed','step_advanced','step_reversed','reset_pressed','speed_changed','custom_input_submitted','example_generated','prediction_submitted','action_submitted','action_correct','action_incorrect','hint_requested','hint_viewed','retry_started','step_completed','explanation_viewed','pseudocode_viewed','connection_lost','connection_restored','event_retried','event_duplicate','attempt_expired','attempt_invalidated','validation_error']);
const MODES = new Set(['guided','exploration','practice','assessment','instructor']);
const CODES = Object.freeze({
  arrays: ['AR01','AR02','AR03','AR04','AR05','AR06','AR07'],
  stacks: ['ST01','ST02','ST03','ST04','ST05','ST06','ST07'],
  queues: ['QU01','QU02','QU03','QU04','QU05','QU06','QU07','QU08','QU09'],
  'binary-search': ['BS01','BS02','BS03','BS04','BS05','BS06','BS07','BS08','BS09'],
  sorting: ['SO01','SO02','SO03','SO04','SO05','SO06','SO07','SO08','SO09','SO10','SO11','SO12'],
  bst: ['BT01','BT02','BT03','BT04','BT05','BT06','BT07','BT08','BT09','BT10']
});
function isKnownCode(moduleKey, code) { return !code || (CODES[moduleKey] || []).includes(code); }
module.exports = { CODES, EVENT_TYPES, MODES, isKnownCode };
