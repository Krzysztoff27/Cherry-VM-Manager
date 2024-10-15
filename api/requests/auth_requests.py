from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from datetime import timedelta
from typing import Annotated

from main import app, ACCESS_TOKEN_EXPIRE_MINUTES
from auth import authenticate_user, get_current_user, create_access_token, Token, User

################################
# auth requests
################################

@app.post("/token", tags=['auth'])
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")

@app.get("/user", response_model=User, tags=['auth'])
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user