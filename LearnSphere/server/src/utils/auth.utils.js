const createTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

module.exports = {
  createTokenPayload,
};
