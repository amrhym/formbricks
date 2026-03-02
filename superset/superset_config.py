import os

SECRET_KEY = os.environ.get('SUPERSET_SECRET_KEY', 'changeme')
SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:////app/superset_home/superset.db')

# Redis cache
REDIS_HOST = os.environ.get('REDIS_HOST', 'redis')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))

CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_HOST': REDIS_HOST,
    'CACHE_REDIS_PORT': REDIS_PORT,
    'CACHE_REDIS_DB': 1,
}

# Enable guest token for embedding
GUEST_ROLE_NAME = 'Public'
GUEST_TOKEN_JWT_SECRET = os.environ.get('GUEST_TOKEN_JWT_SECRET', SECRET_KEY)
FEATURE_FLAGS = {
    'EMBEDDED_SUPERSET': True,
    'DASHBOARD_CROSS_FILTERS': True,
}

# CORS for embedding
ENABLE_CORS = True
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['*'],
    'resources': ['*'],
    'origins': ['*'],
}

# Talisman (CSP) - disable for embedding
TALISMAN_ENABLED = False
