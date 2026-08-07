import { describe, expect, it } from "vitest";
import { extractEmailsFromHtml } from "@/lib/email-extractor";

describe("e-mail kinyerés", () => {
  it("mailto, látható és strukturált e-maileket gyűjt", () => {
    const html = `
      <a href="mailto:hello@ceg.hu">írj</a>
      <p>kapcsolat: iroda [kukac] pelda [pont] hu</p>
      <script type="application/ld+json">{"email":"sales@ceg.hu"}</script>
    `;

    const emails = extractEmailsFromHtml(html, "https://example.hu");
    expect(emails.map((item) => item.email).sort()).toEqual(["hello@ceg.hu", "iroda@pelda.hu", "sales@ceg.hu"]);
  });

  it("kiszűri a mintákat és noreply címeket", () => {
    const emails = extractEmailsFromHtml("noreply@example.hu avatar.png@example.hu info@real.hu", "https://real.hu");
    expect(emails.map((item) => item.email)).toEqual(["info@real.hu"]);
  });
});
