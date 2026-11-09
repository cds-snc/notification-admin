const { getAttachmentTranslations } = require("../../../app/assets/javascripts/attachments/localization");

describe("attachment localization", () => {
  test("english copy includes overFileLimit text", () => {
    const en = getAttachmentTranslations("en");
    expect(en.overFileLimit).toContain("6 MB");
  });

  test("french copy includes overFileLimit text", () => {
    const fr = getAttachmentTranslations("fr");
    expect(fr.overFileLimit).toContain("6 Mo");
  });

  test("duplicate filename helper exists in both languages", () => {
    const en = getAttachmentTranslations("en");
    const fr = getAttachmentTranslations("fr");

    expect(en.duplicateFilename("test.pdf")).toContain("test.pdf");
    expect(fr.duplicateFilename("test.pdf")).toContain("test.pdf");
  });
});
