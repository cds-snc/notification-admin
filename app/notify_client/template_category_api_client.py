from requests import HTTPError

from app.notify_client import NotifyAdminAPIClient, cache


class TemplateCategoryClient(NotifyAdminAPIClient):
    @cache.delete("template_categories")
    def create_template_category(
        self, name_en, name_fr, description_en, description_fr, sms_process_type, email_process_type, hidden, sms_sending_vehicle
    ):
        data = {
            "name_en": name_en,
            "name_fr": name_fr,
            "description_en": description_en,
            "description_fr": description_fr,
            "sms_process_type": sms_process_type,
            "email_process_type": email_process_type,
            "hidden": True if hidden == "True" else False,
            "sms_sending_vehicle": sms_sending_vehicle,
        }
        return self.post(url="/template-category", data=data)

    @cache.set("template_category-{template_category_id}")
    def get_template_category(self, template_category_id):
        return self.get(url="/template-category/{}".format(template_category_id))["template_category"]

    @cache.set("template_categories")
    def get_all_template_categories(self, template_type=None, hidden=None, sort_key=None):
        categories = self.get(url="/template-category")["template_categories"]

        if len(categories) > 0:
            if sort_key and sort_key in categories[0]:
                categories.sort(key=lambda category: category[sort_key].lower())
            return categories
        else:
            return []

    @cache.delete("template_category-{template_category_id}")
    @cache.delete("template_categories")
    @cache.delete_by_pattern("service-????????-????-????-????-????????????-templates")
    @cache.delete_by_pattern("template-????????-????-????-????-????????????-version-*")
    def update_template_category(
        self,
        template_category_id,
        name_en,
        name_fr,
        description_en,
        description_fr,
        sms_process_type,
        email_process_type,
        hidden,
        sms_sending_vehicle,
    ):
        data = {
            "name_en": name_en,
            "name_fr": name_fr,
            "description_en": description_en,
            "description_fr": description_fr,
            "sms_process_type": sms_process_type,
            "email_process_type": email_process_type,
            "hidden": hidden,
            "sms_sending_vehicle": sms_sending_vehicle,
        }
        return self.post(url="/template-category/{}".format(template_category_id), data=data)

    @cache.delete("template_category-{template_category_id}")
    @cache.delete("template_categories")
    def delete_template_category(self, template_category_id, cascade=False):
        try:
            self.delete(url="/template-category/{}".format(template_category_id), data=cascade)
        except HTTPError as e:
            if e.response.status_code == 400:
                raise e


template_category_api_client = TemplateCategoryClient()
