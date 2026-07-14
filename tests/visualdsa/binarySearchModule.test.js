const bs=require('../../public/js/visualdsa/modules/binary-search/binarySearchModule');
describe('Binary Search module',()=>{
 test.each([{v:[4],t:4,i:0},{v:[4,9,13,18],t:4,i:0},{v:[4,9,13,18],t:18,i:3},{v:[4,9,13,18,24],t:13,i:2}])('finds $t',({v,t,i})=>expect(bs.generateSteps({values:v,target:t}).at(-1)).toEqual(expect.objectContaining({phase:'found',foundIndex:i})));
 test('confirms absence only after low exceeds high',()=>{const s=bs.generateSteps({values:[4,9,13,18],target:12}).at(-1);expect(s.phase).toBe('not-found');expect(s.low).toBeGreaterThan(s.high);});
 test('rejects unsorted and invalid input',()=>{expect(bs.validateInput({values:[2,1],target:1}).valid).toBe(false);expect(bs.validateInput({values:[],target:1}).valid).toBe(false);});
 test('handles duplicates with find-any policy and negative values',()=>{expect(bs.generateSteps({values:[-4,2,2,2,9],target:2}).at(-1).phase).toBe('found');});
 test('classifies midpoint and boundary errors',()=>{expect(bs.validateStudentAction({mid:9},{phase:'compare',mid:2}).misconceptionCode).toBe('BS01');expect(bs.validateStudentAction({low:2},{phase:'update-low',low:3}).misconceptionCode).toBe('BS02');expect(bs.validateStudentAction({high:3},{phase:'update-high',high:2}).misconceptionCode).toBe('BS03');});
 test('exposes BS04 through BS09 diagnostic classifications',()=>{expect(bs.classifyError({returnedToDiscarded:true},{})).toBe('BS04');expect(bs.classifyError({precondition:'unsorted'},{})).toBe('BS05');expect(bs.classifyError({stoppedEarly:true},{})).toBe('BS06');expect(bs.classifyError({resetFullRange:true},{})).toBe('BS07');expect(bs.classifyError({includedMidpoint:true},{})).toBe('BS08');expect(bs.classifyError({skippedFinalElement:true},{})).toBe('BS09');});
});
