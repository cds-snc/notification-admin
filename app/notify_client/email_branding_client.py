from app.notify_client import NotifyAdminAPIClient, cache


class EmailBrandingClient(NotifyAdminAPIClient):
    @cache.set("email_branding-{branding_id}")
    def get_email_branding(self, branding_id):
        return self.get(url="/email-branding/{}".format(branding_id))

    @cache.set("email_branding-{organisation_id}")
    def get_all_email_branding(self, sort_key=None, organisation_id=None):
        brandings = self.get(url="/email-branding", params={"organisation_id": organisation_id})["email_branding"]

        if len(brandings) > 0:
            if sort_key and sort_key in brandings[0]:
                brandings.sort(key=lambda branding: branding[sort_key].lower())
            return brandings
        else:
            return []

    @cache.delete("email_branding-{organisation_id}")
    @cache.delete("email_branding-None")
    def create_email_branding(
        self, logo, name, text, colour, brand_type, organisation_id, alt_text_en, alt_text_fr, created_by_id
    ):
        data = {
            "logo": logo,
            "name": name,
            "text": text,
            "colour": colour,
            "brand_type": brand_type,
            "organisation_id": organisation_id,
            "alt_text_en": alt_text_en,
            "alt_text_fr": alt_text_fr,
            "created_by_id": created_by_id,
        }
        return self.post(url="/email-branding", data=data)

    @cache.delete("email_branding-{branding_id}")
    @cache.delete("email_branding-{organisation_id}")
    @cache.delete("email_branding-None")
    def update_email_branding(
        self, branding_id, logo, name, text, colour, brand_type, organisation_id, alt_text_en, alt_text_fr, updated_by_id
    ):
        data = {
            "logo": logo,
            "name": name,
            "text": text,
            "colour": colour,
            "brand_type": brand_type,
            "organisation_id": organisation_id,
            "alt_text_en": alt_text_en,
            "alt_text_fr": alt_text_fr,
            "updated_by_id": updated_by_id,
        }
        return self.post(url="/email-branding/{}".format(branding_id), data=data)


email_branding_client = EmailBrandingClient()
