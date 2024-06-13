from app.notify_client import NotifyAdminAPIClient

# TODO: remove this and call the API
cats = [
    {
        "title": "Status updates",
        "hint": "Notice of change in status, progress of a submission",
        "id": "1",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
    },
    {
        "title": "Promotional call to action",
        "hint": "Surveys, general apply now, learn more",
        "id": "2",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
    },
    {
        "title": "Service related requests",
        "hint": "Submit additional documents, follow up to move a process forward",
        "id": "3",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
    },
    {
        "title": "Fulfillment with attachments - email only",
        "hint": "Here’s your permit",
        "id": "4",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
    },
    {
        "title": "Broadcast messages",
        "hint": "General information, not related to transactions such as COVID 19 information",
        "id": "5",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
    },
    {
        "title": "Auto-reply",
        "hint": "No-reply messages, acknowledgements, response wait times",
        "id": "6",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
    },
    {
        "title": "Verification message",
        "hint": "Authentication codes, confirming an account change",
        "id": "7",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
    },
    {
        "title": "Confirmation / Receipts",
        "hint": "Record of transaction, approvals",
        "id": "8",
        "email_priority": "high",
        "sms_priority": "low",
        "hidden": "false"
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
