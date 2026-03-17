function getPublicBaseUrl() {
  const raw = process.env.BASE_URL || 'https://hellouniversity.online';
  return raw.replace(/\/+$/, '');
}

module.exports = { getPublicBaseUrl };
