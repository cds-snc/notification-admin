from app.notify_client import NotifyAdminAPIClient


class BillingAPIClient(NotifyAdminAPIClient):

    def get_billable_units(self, service_id, year):
        return self.get(
            '/service/{0}/billing/monthly-usage'.format(service_id),
            params=dict(year=year)
        )

    def get_service_usage(self, service_id, year=None):
        return self.get(
            '/service/{0}/billing/yearly-usage-summary'.format(service_id),
            params=dict(year=year)
        )

    def get_free_sms_fragment_limit_for_year(self, service_id, year=None):
        result = self.get(
            '/service/{0}/billing/free-sms-fragment-limit'.format(service_id),
            params=dict(financial_year_start=year)
        )
        return result['free_sms_fragment_limit']

    def create_or_update_free_sms_fragment_limit(self, service_id, free_sms_fragment_limit, year=None):
        # year = None will update current and future year in the API
        data = {
            "financial_year_start": year,
            "free_sms_fragment_limit": free_sms_fragment_limit
        }

        return self.post(
            url='/service/{0}/billing/free-sms-fragment-limit'.format(service_id),
            data=data
        )


billing_api_client = BillingAPIClient()
