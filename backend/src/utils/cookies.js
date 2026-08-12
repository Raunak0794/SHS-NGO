function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

function getClearAuthCookieOptions() {
  const { maxAge, ...options } = getAuthCookieOptions();
  return options;
}

module.exports = {
  getAuthCookieOptions,
  getClearAuthCookieOptions,
};
