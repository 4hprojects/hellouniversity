const crypto = require('crypto');
const arrays = require('../../public/js/visualdsa/modules/arrays/arrayModule');
const stacks = require('../../public/js/visualdsa/modules/stacks/stackModule');
const queues = require('../../public/js/visualdsa/modules/queues/queueModule');
const binarySearch = require('../../public/js/visualdsa/modules/binary-search/binarySearchModule');
const sorting = require('../../public/js/visualdsa/modules/sorting/sortingModule');
const bst = require('../../public/js/visualdsa/modules/bst/bstModule');

function seededNumber(seed, offset = 0) {
  const digest = crypto.createHash('sha256').update(`${seed}:${offset}`).digest();
  return digest.readUInt32BE(0);
}
function integer(seed, offset, min, max) { return min + (seededNumber(seed, offset) % (max - min + 1)); }
function createSeed(prefix = 'VD') { return `${prefix}-${crypto.randomUUID()}`; }

function generateProblem({ templateKey, seed }) {
  if (!seed) throw new TypeError('A server-issued seed is required.');
  let input;
  if (templateKey === 'array-insert-v1') {
    const values = Array.from({ length: 4 }, (_, i) => integer(seed, i, -20, 50));
    input = { operation: 'insert', values, index: integer(seed, 5, 0, values.length), newValue: integer(seed, 6, -20, 50), capacity: 5 };
  } else if (templateKey === 'stack-operation-sequence-v1') {
    input = { operation: 'pop', values: [integer(seed, 1, 1, 30), integer(seed, 2, 1, 30)].map(String), capacity: 6 };
  } else if (templateKey === 'queue-operation-sequence-v1') {
    input = { operation: 'dequeue', values: [integer(seed, 1, 1, 30), integer(seed, 2, 1, 30)].map(String), capacity: 6, front: integer(seed, 3, 0, 4) };
  } else if (templateKey === 'binary-search-step-sequence-v1') {
    input={values:Array.from({length:7},(_,i)=>integer(seed,i,1,9)+(i*10)).sort((a,b)=>a-b)};input.target=input.values[integer(seed,9,0,6)];
  } else if(['bubble-sort-full-trace-v1','selection-sort-full-trace-v1','insertion-sort-full-trace-v1'].includes(templateKey)){
    input={algorithm:templateKey.split('-')[0],values:Array.from({length:5},(_,i)=>integer(seed,i,-20,50))};
  } else if(templateKey==='bst-insert-one-v1'){const values=[40,20,60,10,30];input={values,operation:'insert',target:integer(seed,10,31,39)};
  } else if(templateKey==='bst-traversal-v1'){input={values:[40,20,60,10,30],operation:'traverse',traversal:['preorder','inorder','postorder'][integer(seed,11,0,2)]};
  } else throw Object.assign(new Error('Unknown problem template.'), { code: 'INVALID_INPUT' });
  const moduleApi = templateKey.startsWith('array-') ? arrays : templateKey.startsWith('stack-') ? stacks : templateKey.startsWith('queue-')?queues:templateKey.startsWith('binary-')?binarySearch:templateKey.startsWith('bst-')?bst:sorting;
  const expectedStates = moduleApi.generateSteps(input);
  const expectedStepsHash = crypto.createHash('sha256').update(JSON.stringify(expectedStates)).digest('hex');
  return Object.freeze({ seed, input, expectedStates, expectedStepsHash, moduleVersion: moduleApi.version });
}

function validateAction({ templateKey, problem, action }) {
  const state = problem.expectedStates[action.stepNumber];
  if (!state) return { accepted: false, isCorrect: false, misconceptionCode: null, validationVersion: '1.0.0' };
  let result;
  if (templateKey.startsWith('array-')) result = arrays.validateStudentAction(action.payload, state);
  else if (templateKey.startsWith('stack-')) result = stacks.validateStudentAction(action.payload, state);
  else if(templateKey.startsWith('queue-')) result = queues.validateStudentAction(action.payload, state);
  else if(templateKey.startsWith('binary-'))result=binarySearch.validateStudentAction(action.payload,state);
  else if(templateKey.startsWith('bst-'))result=bst.validateStudentAction(action.payload,state);
  else result=sorting.validateStudentAction(action.payload,state);
  return { ...result, validationVersion: '1.0.0' };
}

module.exports = { createSeed, generateProblem, seededNumber, validateAction };
