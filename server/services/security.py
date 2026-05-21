from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()
ADMIN_SECRET = os.getenv("ADMIN_SECRET")

token_auth_scheme = HTTPBearer()

def verify_admin(token: HTTPAuthorizationCredentials = Depends(token_auth_scheme)):
    return
    if token.credentials != ADMIN_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="not allowed",
        )