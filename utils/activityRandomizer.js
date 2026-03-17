module.exports = function randomizeActivity(subject) {
  const activities = {
    PROGIT1: [
      'https://placeholder-link-1.com',
      'https://placeholder-link-2.com',
      'https://placeholder-link-3.com',
    ],
    DSALGO1: [
      'https://placeholder-link-1.com',
      'https://placeholder-link-2.com',
      'https://placeholder-link-3.com',
    ],
  };

  if (!activities[subject]) throw new Error('Invalid subject provided.');
  const list = activities[subject];
  return list[Math.floor(Math.random() * list.length)];
};