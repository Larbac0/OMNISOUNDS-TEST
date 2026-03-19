from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
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
import io

from models import (
    User, UserCreate, UserLogin, UserUpdate,
    Beat, BeatCreate, BeatUpdate,
    Order, OrderCreate, OrderItem, OrderStatus,
    Favorite, ProducerStats, UserRole, LicenseType, BillingType
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_producer
)
from services.asaas_service import asaas_service
from services.s3_service import s3_service

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

        if "password" in update_dict:
            update_dict["password"] = get_password_hash(update_dict["password"])

        if update_dict:
            await db.users.update_one(
                {"id": current_user["sub"]},
                {"$set": update_dict}
            )

        user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password": 0})
        if isinstance(user["created_at"], str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])

        return User(**user).model_dump()


@api_router.post("/users/avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload de foto de perfil do usuário.
    Aceita JPG, PNG, GIF, WEBP (máx 5MB).
    Retorna a URL pública da imagem salva.
    """
    # Validar tipo de arquivo
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if avatar.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Formato de imagem inválido. Use JPG, PNG, GIF ou WEBP."
        )

    # Validar tamanho (5MB)
    contents = await avatar.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="A imagem deve ter no máximo 5MB."
        )

    # Gerar nome único
    ext = avatar.filename.rsplit(".", 1)[-1] if "." in avatar.filename else "jpg"
    filename = f"{current_user['sub']}_avatar.{ext}"

    # Tentar salvar no S3
    avatar_url = None
    try:
        s3_key = f"avatars/{filename}"
        avatar_url = await s3_service.upload_file(
            file_content=io.BytesIO(contents),
            key=s3_key,
            content_type=avatar.content_type
        )
        logger.info(f"Avatar saved to S3: {s3_key}")
    except Exception as e:
        logger.warning(f"S3 upload failed, falling back to local: {e}")
        # Fallback: salvar localmente
        avatar_dir = UPLOADS_DIR / "avatars"
        avatar_dir.mkdir(exist_ok=True)
        file_path = avatar_dir / filename
        with open(file_path, "wb") as f:
            f.write(contents)
        avatar_url = f"/uploads/avatars/{filename}"

    # Atualizar no banco
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"avatar": avatar_url}}
    )

    return {"avatar_url": avatar_url, "message": "Avatar atualizado com sucesso"}


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
    
    # Try to upload to S3, fallback to local storage
    audio_url = None
    image_url = None
    
    # Upload audio file
    audio_content = await audio_file.read()
    if s3_service.enabled:
        audio_url = await s3_service.upload_file(
            io.BytesIO(audio_content),
            audio_file.filename,
            audio_file.content_type or 'audio/mpeg',
            'audio'
        )
    
    if not audio_url:
        # Fallback to local storage
        audio_filename = f"{uuid.uuid4()}_{audio_file.filename}"
        audio_path = UPLOADS_DIR / "audio" / audio_filename
        with open(audio_path, "wb") as buffer:
            buffer.write(audio_content)
        audio_url = f"/uploads/audio/{audio_filename}"
    
    # Upload image file
    if image_file:
        image_content = await image_file.read()
        if s3_service.enabled:
            image_url = await s3_service.upload_file(
                io.BytesIO(image_content),
                image_file.filename,
                image_file.content_type or 'image/jpeg',
                'images'
            )
        
        if not image_url:
            # Fallback to local storage
            image_filename = f"{uuid.uuid4()}_{image_file.filename}"
            image_path = UPLOADS_DIR / "images" / image_filename
            with open(image_path, "wb") as buffer:
                buffer.write(image_content)
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
        audio_url=audio_url,
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
    """Create a new order with Asaas payment and 80/20 split"""
    # Get beats info
    beat_ids = [item.beat_id for item in order_data.items]
    beats = await db.beats.find({"id": {"$in": beat_ids}}, {"_id": 0}).to_list(100)
    beats_dict = {beat["id"]: beat for beat in beats}
    
    # Create order items and calculate total
    items = []
    total = 0
    producer_ids = set()
    
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
        producer_ids.add(beat["producer_id"])
    
    # Get user info for Asaas customer
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    
    # Get CPF from order data or user profile
    cpf = order_data.cpf or user.get("cpf")
    phone = order_data.phone or user.get("phone")
    
    # Update user with CPF if provided and not already set
    if order_data.cpf and not user.get("cpf"):
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {"cpf": order_data.cpf}}
        )
    
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
    
    # Try to create Asaas payment
    payment_response = None
    pix_data = None
    boleto_url = None
    
    try:
        # Create or get Asaas customer (with CPF)
        customer = await asaas_service.create_customer(
            name=user["name"],
            email=user["email"],
            cpf_cnpj=cpf,
            phone=phone
        )
        
        # Update user with asaas_customer_id if not set
        if not user.get("asaas_customer_id"):
            await db.users.update_one(
                {"id": current_user["sub"]},
                {"$set": {"asaas_customer_id": customer["id"]}}
            )
        
        # Get producer wallet ID (for split)
        # For simplicity, we'll use the first producer's wallet
        producer_wallet_id = None
        if producer_ids:
            first_producer = await db.users.find_one(
                {"id": list(producer_ids)[0]},
                {"_id": 0}
            )
            producer_wallet_id = first_producer.get("asaas_wallet_id") if first_producer else None
        
        # Create payment with split
        payment_response = await asaas_service.create_payment_with_split(
            customer_id=customer["id"],
            value=total,
            billing_type=order_data.billing_type.value,
            description=f"OMINSOUNDS - Compra de {len(items)} beat(s)",
            producer_wallet_id=producer_wallet_id or "",
            producer_percentage=80.0,
            platform_percentage=20.0
        )
        
        order.payment_id = payment_response.get("id")
        
        # Get PIX QR Code if payment method is PIX
        if order_data.billing_type == BillingType.PIX and payment_response.get("id"):
            try:
                pix_data = await asaas_service.get_pix_qr_code(payment_response["id"])
            except Exception as e:
                logger.warning(f"Failed to get PIX QR code: {e}")
        
        # Get boleto URL if payment method is BOLETO
        if order_data.billing_type == BillingType.BOLETO and payment_response.get("id"):
            boleto_url = payment_response.get("bankSlipUrl")
        
        logger.info(f"Asaas payment created: {payment_response.get('id')}")
        
    except Exception as e:
        logger.warning(f"Asaas payment failed, order created without payment: {e}")
        # Continue with order creation even if Asaas fails
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Build response
    response = order.model_dump()
    if payment_response:
        response["payment"] = {
            "id": payment_response.get("id"),
            "status": payment_response.get("status"),
            "invoice_url": payment_response.get("invoiceUrl"),
            "bank_slip_url": boleto_url
        }
    if pix_data:
        response["pix"] = {
            "qr_code": pix_data.get("encodedImage"),
            "copy_paste": pix_data.get("payload")
        }
    
    return response

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

# ==================== ASAAS WEBHOOK ====================

@app.post("/webhook/asaas")
async def asaas_webhook(request: Request):
    """
    Webhook endpoint for Asaas payment notifications.
    Updates order status when payment is confirmed.
    """
    try:
        payload = await request.json()
        event = payload.get("event")
        payment = payload.get("payment", {})
        
        logger.info(f"Asaas webhook received: {event}")
        
        payment_id = payment.get("id")
        if not payment_id:
            return JSONResponse({"success": True})
        
        # Find order by payment_id
        order = await db.orders.find_one({"payment_id": payment_id}, {"_id": 0})
        if not order:
            logger.warning(f"Order not found for payment_id: {payment_id}")
            return JSONResponse({"success": True})
        
        # Update order status based on event
        new_status = None
        
        if event in ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]:
            new_status = OrderStatus.PAID.value
            
            # Update beat sales count
            for item in order.get("items", []):
                await db.beats.update_one(
                    {"id": item["beat_id"]},
                    {"$inc": {"sales": 1}}
                )
            
            logger.info(f"Order {order['id']} marked as PAID")
            
        elif event == "PAYMENT_OVERDUE":
            new_status = OrderStatus.FAILED.value
            logger.info(f"Order {order['id']} marked as FAILED (overdue)")
            
        elif event == "PAYMENT_REFUNDED":
            new_status = OrderStatus.REFUNDED.value
            logger.info(f"Order {order['id']} marked as REFUNDED")
        
        if new_status:
            await db.orders.update_one(
                {"id": order["id"]},
                {"$set": {"status": new_status}}
            )
        
        return JSONResponse({"success": True})
        
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return JSONResponse({"success": True})  # Always return 200 to avoid retries

# ==================== DOWNLOADS ====================

@api_router.get("/orders/{order_id}/download/{beat_id}")
async def download_beat(
    order_id: str,
    beat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download a beat after purchase confirmation"""
    # Verify order belongs to user and is paid
    order = await db.orders.find_one({
        "id": order_id,
        "user_id": current_user["sub"],
        "status": OrderStatus.PAID.value
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not paid")
    
    # Check if beat is in order
    beat_in_order = None
    for item in order.get("items", []):
        if item["beat_id"] == beat_id:
            beat_in_order = item
            break
    
    if not beat_in_order:
        raise HTTPException(status_code=404, detail="Beat not in this order")
    
    # Get beat info
    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Return download URL (for S3 files, generate presigned URL)
    audio_url = beat.get("audio_url", "")
    
    # If using S3, the URL is already public
    # For local files, return the relative path
    return {
        "download_url": audio_url,
        "beat_title": beat["title"],
        "license_type": beat_in_order["license_type"]
    }

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
