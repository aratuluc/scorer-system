import jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
import os

load_dotenv()

# 1. THE SECRET CODES (Never share the secret key in production!)
SECRET_KEY = os.getenv("ADMIN_SECRET")
ALGORITHM = "HS256" 

# 2. THE SIGNPOST (Tells Swagger where the login door is)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

# 3. THE WRISTBAND PRINTER (Generates the JWT token)
def create_access_token(data: dict):
    to_encode = data.copy()
    # Token expires in 12 hours
    expire = datetime.utcnow() + timedelta(hours=12)
    to_encode.update({"exp": expire})
    
    # Encrypt the token using your secret key
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 4. THE SCANNER (The Bouncer that guards your routes)
def verify_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Try to decrypt the wristband
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return True # Wristband is valid!
    except jwt.PyJWTError:
        raise credentials_exception