from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
import shutil
import uuid

from models import (
    User, UserCreate, UserLogin, UserUpdate,
    Beat, BeatCreate, BeatUpdate,
    Order, OrderCreate, OrderItem, OrderStatus,
    Favorite, ProducerStats, UserRole, LicenseType
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_producer
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "audio").mkdir(exist_ok=True)
(UPLOADS_DIR / "images").mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="OMINSOUNDS API")
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    user_dict = user.model_dump()
    user_dict["password"] = get_password_hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role
    })
    
    return {
        "user": user.model_dump(),
        "token": token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Convert datetime if needed
    if isinstance(user["created_at"], str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    user_obj = User(**{k: v for k, v in user.items() if k != "password"})
    
    token = create_access_token({
        "sub": user_obj.id,
        "email": user_obj.email,
        "role": user_obj.role
    })
    
    return {
        "user": user_obj.model_dump(),
        "token": token
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user"""
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user["created_at"], str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return User(**user).model_dump()

@api_router.put("/users/profile")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": update_dict}
        )
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password": 0})
    if isinstance(user["created_at"], str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return User(**user).model_dump()

# ==================== BEATS ROUTES ====================

@api_router.post("/beats")
async def create_beat(
    title: str = Form(...),
    bpm: int = Form(...),
    key: str = Form(...),
    genre: str = Form(...),
    price_mp3: float = Form(...),
    price_wav: float = Form(...),
    price_exclusive: float = Form(...),
    description: str = Form(None),
    audio_file: UploadFile = File(...),
    image_file: UploadFile = File(None),
    current_user: dict = Depends(get_current_producer)
):
    """Create a new beat (Producer only)"""
    # Save audio file
    audio_filename = f"{uuid.uuid4()}_{audio_file.filename}"
    audio_path = UPLOADS_DIR / "audio" / audio_filename
    with open(audio_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)
    
    # Save image file
    image_url = None
    if image_file:
        image_filename = f"{uuid.uuid4()}_{image_file.filename}"
        image_path = UPLOADS_DIR / "images" / image_filename
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image_file.file, buffer)
        image_url = f"/uploads/images/{image_filename}"
    
    # Get producer info
    producer = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    
    beat = Beat(
        title=title,
        bpm=bpm,
        key=key,
        genre=genre,
        price_mp3=price_mp3,
        price_wav=price_wav,
        price_exclusive=price_exclusive,
        description=description,
        producer_id=current_user["sub"],
        producer_name=producer["name"],
        audio_url=f"/uploads/audio/{audio_filename}",
        image_url=image_url
    )
    
    beat_dict = beat.model_dump()
    beat_dict["created_at"] = beat_dict["created_at"].isoformat()
    
    await db.beats.insert_one(beat_dict)
    
    return beat.model_dump()

@api_router.get("/beats")
async def get_beats(
    genre: Optional[str] = None,
    min_bpm: Optional[int] = None,
    max_bpm: Optional[int] = None,
    key: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100)
):
    """Get beats with filters"""
    query = {}
    
    if genre:
        query["genre"] = genre
    if key:
        query["key"] = key
    if min_bpm or max_bpm:
        query["bpm"] = {}
        if min_bpm:
            query["bpm"]["$gte"] = min_bpm
        if max_bpm:
            query["bpm"]["$lte"] = max_bpm
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"producer_name": {"$regex": search, "$options": "i"}}
        ]
    
    beats = await db.beats.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for beat in beats:
        if isinstance(beat["created_at"], str):
            beat["created_at"] = datetime.fromisoformat(beat["created_at"])
    
    return [Beat(**beat).model_dump() for beat in beats]

@api_router.get("/beats/{beat_id}")
async def get_beat(beat_id: str):
    """Get single beat"""
    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Increment plays
    await db.beats.update_one({"id": beat_id}, {"$inc": {"plays": 1}})
    
    if isinstance(beat["created_at"], str):
        beat["created_at"] = datetime.fromisoformat(beat["created_at"])
    
    return Beat(**beat).model_dump()

@api_router.put("/beats/{beat_id}")
async def update_beat(
    beat_id: str,
    update_data: BeatUpdate,
    current_user: dict = Depends(get_current_producer)
):
    """Update beat (Producer only)"""
    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    if beat["producer_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.beats.update_one({"id": beat_id}, {"$set": update_dict})
    
    updated_beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if isinstance(updated_beat["created_at"], str):
        updated_beat["created_at"] = datetime.fromisoformat(updated_beat["created_at"])
    
    return Beat(**updated_beat).model_dump()

@api_router.delete("/beats/{beat_id}")
async def delete_beat(beat_id: str, current_user: dict = Depends(get_current_producer)):
    """Delete beat (Producer only)"""
    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    if beat["producer_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.beats.delete_one({"id": beat_id})
    
    return {"message": "Beat deleted successfully"}

@api_router.get("/producers/{producer_id}")
async def get_producer_profile(producer_id: str):
    """Get producer profile"""
    producer = await db.users.find_one({"id": producer_id, "role": {"$in": ["PRODUCER", "ADMIN"]}}, {"_id": 0, "password": 0})
    if not producer:
        raise HTTPException(status_code=404, detail="Producer not found")
    
    # Get producer's beats
    beats = await db.beats.find({"producer_id": producer_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for beat in beats:
        if isinstance(beat["created_at"], str):
            beat["created_at"] = datetime.fromisoformat(beat["created_at"])
    
    if isinstance(producer["created_at"], str):
        producer["created_at"] = datetime.fromisoformat(producer["created_at"])
    
    # Calculate stats
    total_sales = sum(beat.get("sales", 0) for beat in beats)
    total_plays = sum(beat.get("plays", 0) for beat in beats)
    
    return {
        "producer": User(**producer).model_dump(),
        "beats": [Beat(**beat).model_dump() for beat in beats],
        "stats": {
            "total_beats": len(beats),
            "total_sales": total_sales,
            "total_plays": total_plays
        }
    }

# ==================== FAVORITES ROUTES ====================

@api_router.post("/favorites/{beat_id}")
async def add_favorite(beat_id: str, current_user: dict = Depends(get_current_user)):
    """Add beat to favorites"""
    # Check if already favorited
    existing = await db.favorites.find_one({"user_id": current_user["sub"], "beat_id": beat_id}, {"_id": 0})
    if existing:
        return {"message": "Already in favorites"}
    
    favorite = Favorite(
        user_id=current_user["sub"],
        beat_id=beat_id
    )
    
    fav_dict = favorite.model_dump()
    fav_dict["created_at"] = fav_dict["created_at"].isoformat()
    
    await db.favorites.insert_one(fav_dict)
    
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{beat_id}")
async def remove_favorite(beat_id: str, current_user: dict = Depends(get_current_user)):
    """Remove beat from favorites"""
    await db.favorites.delete_one({"user_id": current_user["sub"], "beat_id": beat_id})
    return {"message": "Removed from favorites"}

@api_router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorite beats"""
    favorites = await db.favorites.find({"user_id": current_user["sub"]}, {"_id": 0}).to_list(100)
    
    beat_ids = [fav["beat_id"] for fav in favorites]
    beats = await db.beats.find({"id": {"$in": beat_ids}}, {"_id": 0}).to_list(100)
    
    for beat in beats:
        if isinstance(beat["created_at"], str):
            beat["created_at"] = datetime.fromisoformat(beat["created_at"])
    
    return [Beat(**beat).model_dump() for beat in beats]

# ==================== ORDERS ROUTES ====================

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    """Create a new order"""
    # Get beats info
    beat_ids = [item.beat_id for item in order_data.items]
    beats = await db.beats.find({"id": {"$in": beat_ids}}, {"_id": 0}).to_list(100)
    beats_dict = {beat["id"]: beat for beat in beats}
    
    # Create order items
    items = []
    total = 0
    
    for item_data in order_data.items:
        beat = beats_dict.get(item_data.beat_id)
        if not beat:
            raise HTTPException(status_code=404, detail=f"Beat {item_data.beat_id} not found")
        
        order_item = OrderItem(
            order_id="",  # Will be set after order creation
            beat_id=item_data.beat_id,
            beat_title=beat["title"],
            license_type=item_data.license_type,
            price=item_data.price
        )
        items.append(order_item)
        total += item_data.price
    
    # Create order
    order = Order(
        user_id=current_user["sub"],
        user_email=current_user["email"],
        total=total,
        status=OrderStatus.PENDING,
        billing_type=order_data.billing_type,
        items=items
    )
    
    # Update order_id in items
    for item in order.items:
        item.order_id = order.id
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Here you would integrate with Asaas payment gateway
    # For now, we'll mock the payment
    
    return order.model_dump()

@api_router.get("/orders")
async def get_orders(current_user: dict = Depends(get_current_user)):
    """Get user's orders"""
    orders = await db.orders.find({"user_id": current_user["sub"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for order in orders:
        if isinstance(order["created_at"], str):
            order["created_at"] = datetime.fromisoformat(order["created_at"])
    
    return [Order(**order).model_dump() for order in orders]

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get single order"""
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["sub"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order["created_at"], str):
        order["created_at"] = datetime.fromisoformat(order["created_at"])
    
    return Order(**order).model_dump()

# ==================== PRODUCER ANALYTICS ====================

@api_router.get("/producer/stats")
async def get_producer_stats(current_user: dict = Depends(get_current_producer)):
    """Get producer statistics"""
    # Get all producer's beats
    beats = await db.beats.find({"producer_id": current_user["sub"]}, {"_id": 0}).to_list(1000)
    
    # Get orders containing producer's beats
    beat_ids = [beat["id"] for beat in beats]
    orders = await db.orders.find(
        {"items.beat_id": {"$in": beat_ids}, "status": "PAID"},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Calculate stats
    total_sales = 0
    total_revenue = 0.0
    
    for order in orders:
        if isinstance(order["created_at"], str):
            order["created_at"] = datetime.fromisoformat(order["created_at"])
        
        for item in order["items"]:
            if item["beat_id"] in beat_ids:
                total_sales += 1
                total_revenue += item["price"]
    
    total_plays = sum(beat.get("plays", 0) for beat in beats)
    
    # Format recent sales
    recent_sales = []
    for order in orders[:5]:
        for item in order["items"]:
            if item["beat_id"] in beat_ids:
                recent_sales.append({
                    "beat_title": item["beat_title"],
                    "license_type": item["license_type"],
                    "price": item["price"],
                    "date": order["created_at"].isoformat()
                })
    
    return ProducerStats(
        total_sales=total_sales,
        total_revenue=total_revenue,
        total_beats=len(beats),
        total_plays=total_plays,
        recent_sales=recent_sales
    ).model_dump()

@api_router.get("/producer/beats")
async def get_producer_beats(current_user: dict = Depends(get_current_producer)):
    """Get all beats from current producer"""
    beats = await db.beats.find({"producer_id": current_user["sub"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for beat in beats:
        if isinstance(beat["created_at"], str):
            beat["created_at"] = datetime.fromisoformat(beat["created_at"])
    
    return [Beat(**beat).model_dump() for beat in beats]

# Include router
app.include_router(api_router)

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
