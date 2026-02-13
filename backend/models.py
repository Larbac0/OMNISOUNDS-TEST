from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class UserRole(str, Enum):
    USER = "USER"
    PRODUCER = "PRODUCER"
    ADMIN = "ADMIN"

class BillingType(str, Enum):
    CREDIT_CARD = "CREDIT_CARD"
    BOLETO = "BOLETO"
    PIX = "PIX"
    DEBIT_CARD = "DEBIT_CARD"

class LicenseType(str, Enum):
    MP3 = "MP3"
    WAV = "WAV"
    EXCLUSIVE = "EXCLUSIVE"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.USER

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.USER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: UserRole
    avatar: Optional[str] = None
    bio: Optional[str] = None
    asaas_wallet_id: Optional[str] = None  # Wallet ID for payment splits (producers)
    asaas_customer_id: Optional[str] = None  # Customer ID for payments (buyers)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    asaas_wallet_id: Optional[str] = None  # Producers can add their Asaas wallet ID

# Beat Models
class BeatCreate(BaseModel):
    title: str
    bpm: int
    key: str
    genre: str
    price_mp3: float
    price_wav: float
    price_exclusive: float
    description: Optional[str] = None

class Beat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    bpm: int
    key: str
    genre: str
    price_mp3: float
    price_wav: float
    price_exclusive: float
    description: Optional[str] = None
    producer_id: str
    producer_name: str
    audio_url: str
    image_url: Optional[str] = None
    plays: int = 0
    sales: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BeatUpdate(BaseModel):
    title: Optional[str] = None
    bpm: Optional[int] = None
    key: Optional[str] = None
    genre: Optional[str] = None
    price_mp3: Optional[float] = None
    price_wav: Optional[float] = None
    price_exclusive: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

# Order Models
class OrderItemCreate(BaseModel):
    beat_id: str
    license_type: LicenseType
    price: float

class OrderItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    beat_id: str
    beat_title: str
    license_type: LicenseType
    price: float

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    billing_type: BillingType

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    total: float
    status: OrderStatus
    payment_id: Optional[str] = None
    billing_type: BillingType
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    items: List[OrderItem] = []

# Favorite Model
class Favorite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    beat_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Analytics Model
class ProducerStats(BaseModel):
    total_sales: int
    total_revenue: float
    total_beats: int
    total_plays: int
    recent_sales: List[dict]
