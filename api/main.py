from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from os import getenv
import logging

###############################
#      FastAPI instance
###############################

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allow local origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}")  # Log the error for debugging purposes

    # Return a JSON response with a 500 status code and **correct headers**.
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
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