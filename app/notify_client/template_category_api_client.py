from app.notify_client import NotifyAdminAPIClient, cache

# TODO: remove this and call the API
cats = [
    {
        "name_en": "Status updates",
        "name_fr": "FR: Status updates",
        "desc_en": "Notice of change in status, progress of a submission",
        "desc_fr": "FR: Notice of change in status, progress of a submission",
        "id": "1",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
    {
        "name_en": "Promotional call to action",
        "name_fr": "FR: Promotional call to action",
        "desc_en": "Surveys, general apply now, learn more",
        "desc_fr": "FR: Surveys, general apply now, learn more",
        "id": "2",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
    {
        "name_en": "Service related requests",
        "name_fr": "FR: Service related requests",
        "desc_en": "Submit additional documents, follow up to move a process forward",
        "desc_fr": "FR: Submit additional documents, follow up to move a process forward",
        "id": "3",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
    {
        "name_en": "Fulfillment with attachments - email only",
        "name_fr": "FR: Fulfillment with attachments - email only",
        "desc_en": "Here’s your permit",
        "desc_fr": "FR: Here’s your permit",
        "id": "4",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
    {
        "name_en": "Broadcast messages",
        "name_fr": "FR: Broadcast messages",
        "desc_en": "General information, not related to transactions such as COVID 19 information",
        "desc_fr": "FR: General information, not related to transactions such as COVID 19 information",
        "id": "5",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
    {
        "name_en": "Auto-reply",
        "name_fr": "FR: Auto-reply",
        "desc_en": "No-reply messages, acknowledgements, response wait times",
        "desc_fr": "FR: No-reply messages, acknowledgements, response wait times",
        "id": "6",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
    {
        "name_en": "Verification message",
        "name_fr": "FR: Verification message",
        "desc_en": "Authentication codes, confirming an account change",
        "desc_fr": "FR: Authentication codes, confirming an account change",
        "id": "7",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
    {
        "name_en": "Confirmation / Receipts",
        "name_fr": "FR: Confirmation / Receipts",
        "desc_en": "Record of transaction, approvals",
        "desc_fr": "FR: Record of transaction, approvals",
        "id": "8",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false",
    },
]


class TemplateCategoryClient(NotifyAdminAPIClient):
    @cache.set("template_category-{template_category_id}")
    def create_template_category(self, name_en, name_fr, description_en, description_fr, sms_process_type, email_process_type, hidden):
        data = {
            "name_en": name_en,
            "name_fr": name_fr,
            "description_en": description_en,
            "description_fr": description_fr,
            "sms_process_type": sms_process_type,
            "email_process_type": email_process_type,
            "hidden": hidden,
        }
        return self.post(url="/template-category", data=data)

    @cache.set("template_category-{template_category_id}")
    def get_template_category(self, template_category_id):
        return self.get(url="/template-category/{}".format(template_category_id))

    @cache.set("template_categories")
    def get_all_template_categories(self, template_type=None, hidden=None, sort_key=None):
        categories = self.get(url="/template-category")["template_categories"]

        if len(categories) > 0:
            if sort_key and sort_key in categories[0]:
                categories.sort(key=lambda category: category[sort_key].lower())
            return categories
        else:
            return []

    @cache.set("template_category-{template_category_id}")
    def update_template_category(self, template_category_id, name_en, name_fr, description_en, description_fr, sms_process_type, email_process_type, hidden):
        data = {
            "name_en": name_en,
            "name_fr": name_fr,
            "description_en": description_en,
            "description_fr": description_fr,
            "sms_process_type": sms_process_type,
            "email_process_type": email_process_type,
            "hidden": hidden,
        }
        return self.post(url="/template-category/{}".format(template_category_id), data=data)

    @cache.delete("template_category-{template_category_id}")
    def delete_template_category(self, template_category_id, cascade=False):
        return self.delete(url="/template-category/{}".format(template_category_id), data=cascade)


template_category_api_client = TemplateCategoryClient()
