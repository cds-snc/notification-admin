describe("Dashboard GA click tracking", () => {
  beforeAll(() => {
    require("../../app/assets/javascripts/dashboardGaTracking.js");
  });

  beforeEach(() => {
    document.documentElement.lang = "en";
    document.body.innerHTML = `
      <div data-ga-section="weekly_email" data-ga-item="email">
        <a id="email-card" href="/sent"><span id="email-card-label">Emails sent</span></a>
        <a id="email-failed" href="/failed" data-ga-section="weekly_failed">Review reports</a>
      </div>
      <div data-ga-section="annual_usage_report">
        <a id="usage" href="/usage">Visit usage report</a>
        <span id="not-a-link">Text</span>
      </div>
      <a id="untracked" href="/elsewhere">Elsewhere</a>
    `;
    window.gtag = jest.fn();
    // Prevent jsdom from attempting navigation
    document.addEventListener("click", (e) => e.preventDefault());
  });

  afterEach(() => {
    delete window.gtag;
  });

  const click = (id) => document.getElementById(id).click();

  test("sends section and item for a link in a tracked section", () => {
    click("email-card");
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "dashboard_click",
      expect.objectContaining({ section: "weekly_email", item: "email", language: "en" }),
    );
  });

  test("tracks clicks on elements nested inside a link", () => {
    click("email-card-label");
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "dashboard_click",
      expect.objectContaining({ section: "weekly_email" }),
    );
  });

  test("the closest section wins, while the item is inherited", () => {
    click("email-failed");
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "dashboard_click",
      expect.objectContaining({ section: "weekly_failed", item: "email" }),
    );
  });

  test("item is undefined when not set", () => {
    click("usage");
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "dashboard_click",
      expect.objectContaining({ section: "annual_usage_report", item: undefined }),
    );
  });

  test("ignores links outside tracked sections and non-link clicks", () => {
    click("untracked");
    click("not-a-link");
    expect(window.gtag).not.toHaveBeenCalled();
  });

  test("does nothing when gtag is unavailable", () => {
    delete window.gtag;
    expect(() => click("usage")).not.toThrow();
  });
});
