/**
 * Redirects the user after a specified period of time.
 */
(function () {
  const REDIRECT_LOCATION = '/sign-in?timeout=true';
  const SESSION_TIMEOUT_MS = 7 * 60 * 60 * 1000 + 55 * 60 * 1000; // 7 hours 55 minutes

  redirectCountdown(REDIRECT_LOCATION, SESSION_TIMEOUT_MS); // 7 hours 55 minutes

  /**
   * Redirects to the specified location after a given period of time.
   * @param {string} redirectLocation - The URL to redirect to.
   * @param {number} period - The period of time (in milliseconds) before redirecting.
   */
  function redirectCountdown(redirectLocation, period) {
    setTimeout(function () {
      window.location.href = redirectLocation;
    }, period);
  }
})();
