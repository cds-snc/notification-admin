from app.notify_client import NotifyAdminAPIClient
from notifications_python_client.errors import HTTPError

class TemplateApiPrefillClient(NotifyAdminAPIClient):
    
    def get_template_list(self, service_id):
        endpoint = '/service/{}/template'.format(service_id)
        return self.get(url=endpoint)["data"]

    
    def get_template(self, service_id, template_id):
        try:
            endpoint = '/service/{}/template/{}'.format(service_id, template_id)
            result = self.get(url=endpoint)
            return result["data"]
        except HTTPError as e:
            return { "result":  "error" }
       
template_api_prefill_client = TemplateApiPrefillClient()