from app.notify_client import NotifyAdminAPIClient

class TemplateApiPrefillClient(NotifyAdminAPIClient):
    
    def get_template_list(self, service_id):
        endpoint = '/service/{}/template'.format(service_id)
        return self.get(url=endpoint)["data"]

    
    def get_template(self, service_id, template_id):
        endpoint = '/service/{}/template/{}'.format(service_id, template_id)
        return self.get(
            url=endpoint
        )["data"]
       
template_api_prefill_client = TemplateApiPrefillClient()