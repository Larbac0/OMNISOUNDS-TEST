import httpx
import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class AsaasService:
    def __init__(self):
        self.api_url = os.environ.get("ASAAS_API_URL", "https://sandbox.asaas.com/api/v3")
        self.api_key = os.environ.get("ASAAS_API_KEY", "")
        self.platform_wallet_id = os.environ.get("ASAAS_PLATFORM_WALLET_ID", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_customer(
        self,
        name: str,
        email: str,
        cpf_cnpj: Optional[str] = None,
        phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create or get customer in Asaas"""
        
        async with httpx.AsyncClient() as client:
            # First check if customer exists
            response = await client.get(
                f"{self.api_url}/customers",
                params={"email": email},
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    logger.info(f"Customer already exists: {data['data'][0]['id']}")
                    return data["data"][0]
            
            # Create new customer
            payload = {
                "name": name,
                "email": email,
                "cpfCnpj": cpf_cnpj,
                "phone": phone,
                "notificationDisabled": False
            }
            
            response = await client.post(
                f"{self.api_url}/customers",
                json=payload,
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                customer = response.json()
                logger.info(f"Customer created: {customer['id']}")
                return customer
            else:
                logger.error(f"Failed to create customer: {response.text}")
                raise Exception(f"Failed to create customer: {response.text}")
    
    async def create_payment_with_split(
        self,
        customer_id: str,
        value: float,
        billing_type: str,
        description: str,
        producer_wallet_id: str,
        producer_percentage: float = 80.0,
        platform_percentage: float = 20.0,
        due_date: Optional[str] = None,
        credit_card_info: Optional[Dict] = None,
        credit_card_holder_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create a payment with split between producer (80%) and platform (20%)
        
        billing_type options: BOLETO, CREDIT_CARD, PIX, DEBIT_CARD
        """
        
        # Build split configuration
        splits = []
        
        # Producer receives 80%
        if producer_wallet_id:
            splits.append({
                "walletId": producer_wallet_id,
                "percentualValue": producer_percentage
            })
        
        # Platform receives 20%
        if self.platform_wallet_id:
            splits.append({
                "walletId": self.platform_wallet_id,
                "percentualValue": platform_percentage
            })
        
        payload = {
            "customer": customer_id,
            "billingType": billing_type,
            "value": value,
            "description": description,
            "dueDate": due_date or datetime.now().strftime("%Y-%m-%d"),
        }
        
        # Add split if configured
        if splits:
            payload["split"] = splits
        
        # Add credit card info if provided
        if billing_type == "CREDIT_CARD" and credit_card_info:
            payload["creditCard"] = credit_card_info
            if credit_card_holder_info:
                payload["creditCardHolderInfo"] = credit_card_holder_info
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/payments",
                json=payload,
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                payment = response.json()
                logger.info(f"Payment created: {payment['id']} with split")
                return payment
            else:
                logger.error(f"Failed to create payment: {response.text}")
                raise Exception(f"Failed to create payment: {response.text}")
    
    async def get_pix_qr_code(self, payment_id: str) -> Dict[str, Any]:
        """Get PIX QR Code for a payment"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/payments/{payment_id}/pixQrCode",
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get PIX QR Code: {response.text}")
                raise Exception(f"Failed to get PIX QR Code: {response.text}")
    
    async def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Get payment status"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/payments/{payment_id}",
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get payment: {response.text}")
                raise Exception(f"Failed to get payment: {response.text}")
    
    async def get_boleto_info(self, payment_id: str) -> Dict[str, Any]:
        """Get boleto bank slip info"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/payments/{payment_id}/bankSlipUrl",
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get boleto info: {response.text}")
                raise Exception(f"Failed to get boleto info: {response.text}")

# Singleton instance
asaas_service = AsaasService()
