from notifications_python_client.errors import HTTPError

from app.notify_client import NotifyAdminAPIClient


class TemplateApiPrefillClient(NotifyAdminAPIClient):

    def init_app(self, app):
        super().init_app(app)
        self.service_id = app.config['NOTIFY_TEMPLATE_PREFILL_SERVICE_ID']
    
    def get_template_list(self):
        endpoint = '/service/{}/template'.format(self.service_id)
        return self.get(url=endpoint)["data"]

    def get_template(self, template_id):
        try:
            endpoint = '/service/{}/template/{}'.format(self.service_id, template_id)
            result = self.get(url=endpoint)
            return result["data"]
        except HTTPError as e:
            return {"result": "error", "error": e.message}


template_api_prefill_client = TemplateApiPrefillClient()
