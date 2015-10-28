#config for celery
BROKER_URL='amqp://'
CELERY_RESULT_BACKEND="redis://"
CELERY_MAX_CACHED_RESULTS=100

#CELERY_RESULT_BACKEND = 'cache+memcached://127.0.0.1:11211/'
CACHES = {
    'default':{
        'BACKEND':'redis_cache.RedisCache',
        'LOCATION':'127.0.0.1:6379',
        'OPTIONS': {
            'DB':0,
            'PASSWORD':'',
            'PARSER_CLASS':'redis.connection.HiredisParser'
        }
   }
}
CELERYD_PREFETCH_MULTIPLIER=12
CELERY_TASK_RESULT_EXPIRES=60*60*24*31 #31 days
CELERY_ACCEPT_CONTENT = ['json','pickle']
#CELERY_TASK_TIME_LIMIT=60*60*4 #4 hours