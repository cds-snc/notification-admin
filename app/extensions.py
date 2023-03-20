from flask_caching import Cache
from notifications_utils.clients.antivirus.antivirus_client import AntivirusClient
from notifications_utils.clients.redis.redis_client import RedisClient
from notifications_utils.clients.statsd.statsd_client import StatsdClient
from notifications_utils.clients.zendesk.zendesk_client import ZendeskClient
from notifications_utils.clients.redis.bounce_rate import RedisBounceRate

antivirus_client = AntivirusClient()
statsd_client = StatsdClient()
zendesk_client = ZendeskClient()
redis_client = RedisClient()
bounce_rate_client = RedisBounceRate(redis_client)
cache = Cache(config={"CACHE_TYPE": "simple"})  # TODO: pull config out to config.py later
