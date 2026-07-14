function calculateAttemptSummary(actions) {
  const scored=actions.filter(a=>a.validation?.accepted!==false); const first=new Map();
  scored.forEach(a=>{const key=a.stepNumber??first.size;if(!first.has(key))first.set(key,a);});
  const firstCorrect=[...first.values()].filter(a=>a.validation?.isCorrect).length;
  const finalByStep=new Map();scored.forEach(a=>finalByStep.set(a.stepNumber??finalByStep.size,a));
  const finalCorrect=[...finalByStep.values()].filter(a=>a.validation?.isCorrect).length;
  const pct=(n,d)=>d?Math.round(n/d*10000)/100:0;
  return Object.freeze({totalScoredSteps:first.size,correctFirstResponses:firstCorrect,correctFinalResponses:finalCorrect,firstAttemptAccuracy:pct(firstCorrect,first.size),finalAccuracy:pct(finalCorrect,finalByStep.size),hintsUsed:scored.filter(a=>Number(a.hintLevel)>0).length,retries:Math.max(0,scored.length-first.size),misconceptionCounts:scored.reduce((o,a)=>{const c=a.validation?.misconceptionCode;if(c)o[c]=(o[c]||0)+1;return o;},{})});
}
module.exports={calculateAttemptSummary};
