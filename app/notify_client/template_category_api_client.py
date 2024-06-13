from app.notify_client import NotifyAdminAPIClient

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
    def create_template_category(self, template_category):
        # TODO: Implement the creation logic
        pass

    def get_template_category(self, template_category_id):
        # TODO: Implement the retrieval logic
        return next((category for category in cats if category["id"] == template_category_id), None)

    def get_all_template_categories(self):
        # TODO: Implement retrieval logic
        return cats

    def update_template_category(self, template_category_id, template_category):
        # TODO: Implement the update logic
        pass

    def delete_template_category(self, template_category_id):
        # TODO: Implement the deletion logic
        pass


template_category_api_client = TemplateCategoryClient()
