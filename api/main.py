from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from os import getenv

###############################
#      FastAPI instance
###############################

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # allow local origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

###############################
#   Enviromental Variables
###############################

load_dotenv()

SECRET_KEY = getenv('SECRET_KEY') # openssl rand -hex 32
ALGORITHM = getenv('ALGORITHM')   # HS256
ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv('ACCESS_TOKEN_EXPIRE_MINUTES', default=5))
ACCESS_GROUP_GID = int(getenv('ACCESS_GROUP_GID') or 0) or None

if not SECRET_KEY or not ALGORITHM:
    raise Exception('Both SECRET_KEY and ALGORITHM must be set in the .env configuration')

###############################
#   Submodules
###############################

import auth # run authentication
import requests.auth_requests
import requests.machine_data_requests
import requests.network_conf_requests