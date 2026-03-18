"""
OMINSOUNDS API Tests
Tests for: Auth (register/login), Beats CRUD, Orders, Producers
"""
import pytest
import requests
import os
import uuid
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://producer-hub-17.preview.emergentagent.com')

# Test data
TEST_USER_EMAIL = f"test_user_{uuid.uuid4().hex[:8]}@test.com"
TEST_PRODUCER_EMAIL = f"test_producer_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "test123456"


class TestAuthRegister:
    """Test user registration - USER and PRODUCER roles"""
    
    def test_register_user_success(self):
        """Register a new USER"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "name": "Test User",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "user" in data
        assert "token" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        assert data["user"]["role"] == "USER"
        assert len(data["token"]) > 0
        print(f"User registration successful: {data['user']['id']}")
    
    def test_register_producer_success(self):
        """Register a new PRODUCER"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_PRODUCER_EMAIL,
            "name": "Test Producer",
            "password": TEST_PASSWORD,
            "role": "PRODUCER"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user" in data
        assert "token" in data
        assert data["user"]["email"] == TEST_PRODUCER_EMAIL
        assert data["user"]["role"] == "PRODUCER"
        print(f"Producer registration successful: {data['user']['id']}")
    
    def test_register_duplicate_email(self):
        """Registering with duplicate email should fail"""
        # First registration
        email = f"test_dup_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "Test User",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        
        # Duplicate registration
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "Another User",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        
        assert response.status_code == 400
        print("Duplicate email registration correctly rejected")


class TestAuthLogin:
    """Test user login flow"""
    
    @pytest.fixture
    def registered_user(self):
        """Create a user for login tests"""
        email = f"test_login_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "Login Test User",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        return {"email": email, "password": TEST_PASSWORD, "user_data": response.json()}
    
    def test_login_success(self, registered_user):
        """Login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user" in data
        assert "token" in data
        assert data["user"]["email"] == registered_user["email"]
        print(f"Login successful for user: {registered_user['email']}")
    
    def test_login_invalid_credentials(self):
        """Login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_auth_me_with_token(self, registered_user):
        """Get current user with valid token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        token = login_response.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        print("Auth /me endpoint working correctly")


class TestBeats:
    """Test beats CRUD operations"""
    
    @pytest.fixture
    def producer_auth(self):
        """Create and authenticate a producer"""
        email = f"test_beats_producer_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "Beat Producer",
            "password": TEST_PASSWORD,
            "role": "PRODUCER"
        })
        data = response.json()
        return {"token": data["token"], "user": data["user"]}
    
    def test_get_beats_list(self):
        """Get list of beats (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/beats")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Got {len(data)} beats from listing")
    
    def test_get_beats_with_filters(self):
        """Test beat listing with filters"""
        # Filter by genre
        response = requests.get(f"{BASE_URL}/api/beats", params={"genre": "Trap"})
        assert response.status_code == 200
        
        # Filter by BPM range
        response = requests.get(f"{BASE_URL}/api/beats", params={"min_bpm": 100, "max_bpm": 150})
        assert response.status_code == 200
        
        # Search by text
        response = requests.get(f"{BASE_URL}/api/beats", params={"search": "test"})
        assert response.status_code == 200
        
        print("Beat filters working correctly")
    
    def test_create_beat_as_producer(self, producer_auth):
        """Producer can upload a beat"""
        # Create a test audio file (simple WAV-like content)
        audio_content = b"RIFF" + b"\x00" * 1000  # Minimal fake audio
        
        files = {
            'audio_file': ('test_beat.mp3', io.BytesIO(audio_content), 'audio/mpeg'),
        }
        data = {
            'title': f'TEST_Beat_{uuid.uuid4().hex[:8]}',
            'bpm': 140,
            'key': 'C Minor',
            'genre': 'Trap',
            'price_mp3': 29.99,
            'price_wav': 49.99,
            'price_exclusive': 199.99,
            'description': 'Test beat for API testing'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/beats",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {producer_auth['token']}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        beat = response.json()
        
        assert beat["title"] == data["title"]
        assert beat["bpm"] == data["bpm"]
        assert beat["producer_id"] == producer_auth["user"]["id"]
        assert "audio_url" in beat
        print(f"Beat created successfully: {beat['id']}")
        return beat
    
    def test_create_beat_without_auth_fails(self):
        """Creating beat without authentication should fail"""
        data = {
            'title': 'Unauthorized Beat',
            'bpm': 140,
            'key': 'C Minor',
            'genre': 'Trap',
            'price_mp3': 29.99,
            'price_wav': 49.99,
            'price_exclusive': 199.99
        }
        
        response = requests.post(f"{BASE_URL}/api/beats", data=data)
        assert response.status_code in [401, 403, 422]
        print("Unauthorized beat creation correctly rejected")
    
    def test_get_beat_by_id(self, producer_auth):
        """Get beat details by ID"""
        # First create a beat
        audio_content = b"RIFF" + b"\x00" * 1000
        files = {'audio_file': ('test.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        data = {
            'title': f'TEST_BeatDetail_{uuid.uuid4().hex[:8]}',
            'bpm': 120, 'key': 'A Minor', 'genre': 'R&B',
            'price_mp3': 25.00, 'price_wav': 45.00, 'price_exclusive': 150.00
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/beats", files=files, data=data,
            headers={"Authorization": f"Bearer {producer_auth['token']}"}
        )
        beat_id = create_resp.json()["id"]
        
        # Now get the beat
        response = requests.get(f"{BASE_URL}/api/beats/{beat_id}")
        
        assert response.status_code == 200
        beat = response.json()
        assert beat["id"] == beat_id
        assert beat["title"] == data["title"]
        print(f"Beat details retrieved successfully: {beat['id']}")
    
    def test_get_nonexistent_beat_returns_404(self):
        """Getting nonexistent beat should return 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/beats/{fake_id}")
        
        assert response.status_code == 404
        print("Nonexistent beat correctly returns 404")


class TestProducers:
    """Test producer profile endpoints"""
    
    @pytest.fixture
    def producer_with_beat(self):
        """Create a producer with a beat"""
        email = f"test_producer_profile_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "Profile Producer",
            "password": TEST_PASSWORD,
            "role": "PRODUCER"
        })
        producer_data = reg_response.json()
        
        # Upload a beat
        audio_content = b"RIFF" + b"\x00" * 1000
        files = {'audio_file': ('test.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        data = {
            'title': f'TEST_ProducerBeat_{uuid.uuid4().hex[:8]}',
            'bpm': 130, 'key': 'D Major', 'genre': 'Hip Hop',
            'price_mp3': 30.00, 'price_wav': 50.00, 'price_exclusive': 200.00
        }
        
        requests.post(
            f"{BASE_URL}/api/beats", files=files, data=data,
            headers={"Authorization": f"Bearer {producer_data['token']}"}
        )
        
        return producer_data
    
    def test_get_producer_profile(self, producer_with_beat):
        """Get producer profile with beats"""
        producer_id = producer_with_beat["user"]["id"]
        
        response = requests.get(f"{BASE_URL}/api/producers/{producer_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "producer" in data
        assert "beats" in data
        assert "stats" in data
        assert data["producer"]["id"] == producer_id
        assert isinstance(data["beats"], list)
        print(f"Producer profile retrieved with {len(data['beats'])} beats")
    
    def test_get_nonexistent_producer_returns_404(self):
        """Getting nonexistent producer should return 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/producers/{fake_id}")
        
        assert response.status_code == 404
        print("Nonexistent producer correctly returns 404")


class TestOrders:
    """Test order creation and retrieval - including CPF field for Asaas"""
    
    @pytest.fixture
    def order_setup(self):
        """Create user, producer, and beat for order tests"""
        # Create producer
        producer_email = f"test_order_producer_{uuid.uuid4().hex[:8]}@test.com"
        producer_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": producer_email,
            "name": "Order Producer",
            "password": TEST_PASSWORD,
            "role": "PRODUCER"
        })
        producer_data = producer_resp.json()
        
        # Create beat
        audio_content = b"RIFF" + b"\x00" * 1000
        files = {'audio_file': ('test.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        data = {
            'title': f'TEST_OrderBeat_{uuid.uuid4().hex[:8]}',
            'bpm': 140, 'key': 'G Minor', 'genre': 'Trap',
            'price_mp3': 29.99, 'price_wav': 49.99, 'price_exclusive': 199.99
        }
        beat_resp = requests.post(
            f"{BASE_URL}/api/beats", files=files, data=data,
            headers={"Authorization": f"Bearer {producer_data['token']}"}
        )
        beat = beat_resp.json()
        
        # Create buyer user
        user_email = f"test_order_user_{uuid.uuid4().hex[:8]}@test.com"
        user_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": user_email,
            "name": "Order Buyer",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        user_data = user_resp.json()
        
        return {
            "producer": producer_data,
            "beat": beat,
            "user": user_data
        }
    
    def test_create_order_pix_with_cpf(self, order_setup):
        """Create order with PIX payment method and CPF (required for Asaas)"""
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{
                    "beat_id": order_setup["beat"]["id"],
                    "license_type": "MP3",
                    "price": order_setup["beat"]["price_mp3"]
                }],
                "billing_type": "PIX",
                "cpf": "12345678909",
                "phone": "11999999999"
            },
            headers={"Authorization": f"Bearer {order_setup['user']['token']}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        order = response.json()
        
        assert "id" in order
        assert order["status"] == "PENDING"
        assert order["billing_type"] == "PIX"
        assert len(order["items"]) == 1
        print(f"Order created with PIX + CPF: {order['id']}, status: {order['status']}")
        return order
    
    def test_create_order_credit_card_with_cpf(self, order_setup):
        """Create order with credit card payment method and CPF"""
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{
                    "beat_id": order_setup["beat"]["id"],
                    "license_type": "WAV",
                    "price": order_setup["beat"]["price_wav"]
                }],
                "billing_type": "CREDIT_CARD",
                "cpf": "98765432100",
                "phone": "21988888888"
            },
            headers={"Authorization": f"Bearer {order_setup['user']['token']}"}
        )
        
        assert response.status_code == 200
        order = response.json()
        assert order["billing_type"] == "CREDIT_CARD"
        print(f"Order created with Credit Card + CPF: {order['id']}")
    
    def test_create_order_boleto_with_cpf(self, order_setup):
        """Create order with boleto payment method and CPF"""
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{
                    "beat_id": order_setup["beat"]["id"],
                    "license_type": "EXCLUSIVE",
                    "price": order_setup["beat"]["price_exclusive"]
                }],
                "billing_type": "BOLETO",
                "cpf": "11122233344",
                "phone": "31977777777"
            },
            headers={"Authorization": f"Bearer {order_setup['user']['token']}"}
        )
        
        assert response.status_code == 200
        order = response.json()
        assert order["billing_type"] == "BOLETO"
        print(f"Order created with Boleto + CPF: {order['id']}")
    
    def test_get_user_orders(self, order_setup):
        """Get list of user's orders"""
        # First create an order
        requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{
                    "beat_id": order_setup["beat"]["id"],
                    "license_type": "MP3",
                    "price": order_setup["beat"]["price_mp3"]
                }],
                "billing_type": "PIX"
            },
            headers={"Authorization": f"Bearer {order_setup['user']['token']}"}
        )
        
        # Get orders
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {order_setup['user']['token']}"}
        )
        
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        assert len(orders) >= 1
        print(f"Retrieved {len(orders)} orders for user")
    
    def test_create_order_without_auth_fails(self, order_setup):
        """Creating order without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{
                    "beat_id": order_setup["beat"]["id"],
                    "license_type": "MP3",
                    "price": 29.99
                }],
                "billing_type": "PIX"
            }
        )
        
        assert response.status_code in [401, 403]
        print("Order creation without auth correctly rejected")


class TestDownloads:
    """Test download endpoint for PAID orders"""
    
    def test_download_without_paid_order_fails(self):
        """Download should fail if order is not PAID"""
        # Create user
        user_email = f"test_dl_user_{uuid.uuid4().hex[:8]}@test.com"
        user_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": user_email,
            "name": "Download User",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        user_data = user_resp.json()
        
        # Create producer and beat
        producer_email = f"test_dl_producer_{uuid.uuid4().hex[:8]}@test.com"
        producer_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": producer_email,
            "name": "Download Producer",
            "password": TEST_PASSWORD,
            "role": "PRODUCER"
        })
        producer_data = producer_resp.json()
        
        audio_content = b"RIFF" + b"\x00" * 1000
        files = {'audio_file': ('test.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        data = {
            'title': f'TEST_DownloadBeat_{uuid.uuid4().hex[:8]}',
            'bpm': 120, 'key': 'C Minor', 'genre': 'Trap',
            'price_mp3': 25.00, 'price_wav': 45.00, 'price_exclusive': 150.00
        }
        beat_resp = requests.post(
            f"{BASE_URL}/api/beats", files=files, data=data,
            headers={"Authorization": f"Bearer {producer_data['token']}"}
        )
        beat = beat_resp.json()
        
        # Create order (PENDING status)
        order_resp = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{
                    "beat_id": beat["id"],
                    "license_type": "MP3",
                    "price": beat["price_mp3"]
                }],
                "billing_type": "PIX",
                "cpf": "12345678909"
            },
            headers={"Authorization": f"Bearer {user_data['token']}"}
        )
        order = order_resp.json()
        
        # Try to download - should fail (order is PENDING, not PAID)
        download_resp = requests.get(
            f"{BASE_URL}/api/orders/{order['id']}/download/{beat['id']}",
            headers={"Authorization": f"Bearer {user_data['token']}"}
        )
        
        assert download_resp.status_code == 404, f"Expected 404 for PENDING order download, got {download_resp.status_code}"
        print("Download correctly rejected for PENDING order")
    
    def test_download_nonexistent_order_fails(self):
        """Download should fail for nonexistent order"""
        user_email = f"test_dl_fail_user_{uuid.uuid4().hex[:8]}@test.com"
        user_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": user_email,
            "name": "Fail Download User",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        user_data = user_resp.json()
        
        fake_order_id = str(uuid.uuid4())
        fake_beat_id = str(uuid.uuid4())
        
        download_resp = requests.get(
            f"{BASE_URL}/api/orders/{fake_order_id}/download/{fake_beat_id}",
            headers={"Authorization": f"Bearer {user_data['token']}"}
        )
        
        assert download_resp.status_code == 404
        print("Download correctly fails for nonexistent order")


class TestFavorites:
    """Test favorites endpoints"""
    
    @pytest.fixture
    def favorites_setup(self):
        """Setup user and beat for favorites tests"""
        # Create user
        user_email = f"test_fav_user_{uuid.uuid4().hex[:8]}@test.com"
        user_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": user_email,
            "name": "Favorites User",
            "password": TEST_PASSWORD,
            "role": "USER"
        })
        user_data = user_resp.json()
        
        # Create producer and beat
        producer_email = f"test_fav_producer_{uuid.uuid4().hex[:8]}@test.com"
        producer_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": producer_email,
            "name": "Fav Producer",
            "password": TEST_PASSWORD,
            "role": "PRODUCER"
        })
        producer_data = producer_resp.json()
        
        audio_content = b"RIFF" + b"\x00" * 1000
        files = {'audio_file': ('test.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        data = {
            'title': f'TEST_FavBeat_{uuid.uuid4().hex[:8]}',
            'bpm': 125, 'key': 'F Minor', 'genre': 'Drill',
            'price_mp3': 35.00, 'price_wav': 55.00, 'price_exclusive': 175.00
        }
        beat_resp = requests.post(
            f"{BASE_URL}/api/beats", files=files, data=data,
            headers={"Authorization": f"Bearer {producer_data['token']}"}
        )
        
        return {"user": user_data, "beat": beat_resp.json()}
    
    def test_add_and_remove_favorite(self, favorites_setup):
        """Test adding and removing favorites"""
        beat_id = favorites_setup["beat"]["id"]
        token = favorites_setup["user"]["token"]
        
        # Add favorite
        add_resp = requests.post(
            f"{BASE_URL}/api/favorites/{beat_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert add_resp.status_code == 200
        print(f"Added beat {beat_id} to favorites")
        
        # Get favorites
        get_resp = requests.get(
            f"{BASE_URL}/api/favorites",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_resp.status_code == 200
        favorites = get_resp.json()
        assert len(favorites) >= 1
        
        # Remove favorite
        remove_resp = requests.delete(
            f"{BASE_URL}/api/favorites/{beat_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert remove_resp.status_code == 200
        print("Favorites add/remove working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
