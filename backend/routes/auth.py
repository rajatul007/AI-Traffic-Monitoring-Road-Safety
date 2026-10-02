from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
import uuid
from backend.models.schemas import UserCreate, UserLogin, TokenResponse, UserResponse
from backend.utils.security import hash_password, verify_password, create_access_token
from backend.models.database import get_database, in_memory_store

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Pre-seeded admin user
DEFAULT_ADMIN = {
    "_id": "usr_admin_001",
    "name": "Traffic Admin",
    "email": "admin@traffic.gov",
    "passwordHash": hash_password("admin123"),
    "role": "System Administrator",
    "createdAt": datetime.utcnow()
}

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    db = get_database()
    
    # Check duplicate
    if db is not None:
        existing = await db.users.find_one({"email": user_data.email})
    else:
        existing = next((u for u in in_memory_store["users"] if u["email"] == user_data.email), None)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    user_doc = {
        "_id": str(uuid.uuid4()),
        "name": user_data.name,
        "email": user_data.email,
        "passwordHash": hash_password(user_data.password),
        "role": user_data.role,
        "createdAt": datetime.utcnow()
    }

    if db is not None:
        await db.users.insert_one(user_doc)
    else:
        in_memory_store["users"].append(user_doc)

    token = create_access_token({"sub": user_doc["email"], "role": user_doc["role"], "name": user_doc["name"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_doc["_id"],
            "name": user_doc["name"],
            "email": user_doc["email"],
            "role": user_doc["role"],
            "createdAt": user_doc["createdAt"]
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    db = get_database()
    user = None

    if credentials.email == DEFAULT_ADMIN["email"]:
        user = DEFAULT_ADMIN
    elif db is not None:
        user = await db.users.find_one({"email": credentials.email})
    else:
        user = next((u for u in in_memory_store["users"] if u["email"] == credentials.email), None)

    if not user or not verify_password(credentials.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials"
        )

    token = create_access_token({"sub": user["email"], "role": user["role"], "name": user["name"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.get("_id", "usr_01")),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "createdAt": user.get("createdAt", datetime.utcnow())
        }
    }
