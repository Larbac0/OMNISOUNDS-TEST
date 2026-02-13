import os
import logging
from typing import Dict, List
import httpx
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

PLATFORM_COMMISSION = float(os.environ.get('PLATFORM_COMMISSION_PERCENT', 20))
PRODUCER_COMMISSION = float(os.environ.get('PRODUCER_COMMISSION_PERCENT', 80))

class PaymentSplitService:
    """Serviço para gerenciar split de pagamentos 80/20"""
    
    def __init__(self):
        self.api_key = os.environ.get('ASAAS_API_KEY')
        self.environment = os.environ.get('ASAAS_ENVIRONMENT', 'sandbox')
        
        if self.environment == 'production':
            self.base_url = 'https://api.asaas.com/v3'
        else:
            self.base_url = 'https://api-sandbox.asaas.com/v3'
        
        self.headers = {
            'Content-Type': 'application/json',
            'access_token': self.api_key
        }
    
    def calculate_split(self, total_amount: float) -> Dict[str, float]:
        """
        Calcula split de pagamento 80% produtor / 20% plataforma
        
        Args:
            total_amount: Valor total da venda
        
        Returns:
            Dict com valores para produtor e plataforma
        """
        producer_amount = total_amount * (PRODUCER_COMMISSION / 100)
        platform_amount = total_amount * (PLATFORM_COMMISSION / 100)
        
        return {
            'total': total_amount,
            'producer_amount': round(producer_amount, 2),
            'platform_amount': round(platform_amount, 2),
            'producer_percent': PRODUCER_COMMISSION,
            'platform_percent': PLATFORM_COMMISSION
        }
    
    async def create_split_payment(
        self,
        customer_id: str,
        producer_wallet_id: str,
        total_amount: float,
        description: str,
        billing_type: str,
        due_date: str,
        external_reference: str
    ) -> Dict:
        """
        Cria pagamento com split automático
        
        Fluxo:
        1. Cliente paga R$ 100
        2. R$ 80 vai para carteira do produtor
        3. R$ 20 fica na conta principal (OMINSOUNDS)
        
        Args:
            customer_id: ID do cliente no Asaas
            producer_wallet_id: ID da carteira do produtor no Asaas
            total_amount: Valor total
            description: Descrição do pagamento
            billing_type: PIX, BOLETO, CREDIT_CARD
            due_date: Data de vencimento (YYYY-MM-DD)
            external_reference: ID do pedido
        
        Returns:
            Dados do pagamento criado com split
        """
        
        split_info = self.calculate_split(total_amount)
        
        # Criar pagamento com split
        payment_payload = {
            'customer': customer_id,
            'billingType': billing_type,
            'value': total_amount,
            'dueDate': due_date,
            'description': description,
            'externalReference': external_reference,
            'split': [
                {
                    'walletId': producer_wallet_id,
                    'fixedValue': split_info['producer_amount'],
                    'description': f'Produtor - {PRODUCER_COMMISSION}%'
                }
                # Os 20% restantes ficam automaticamente na conta principal (OMINSOUNDS)
            ]
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payments",
                    json=payment_payload,
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                payment = response.json()
                
                logger.info(
                    f"Pagamento com split criado: {payment.get('id')} | "
                    f"Produtor: R$ {split_info['producer_amount']} | "
                    f"Plataforma: R$ {split_info['platform_amount']}"
                )
                
                return {
                    'payment_id': payment['id'],
                    'status': payment['status'],
                    'invoice_url': payment.get('invoiceUrl'),
                    'bank_slip_url': payment.get('bankSlipUrl'),
                    'pix_qrcode': payment.get('encodedImage'),
                    'pix_copy_paste': payment.get('payload'),
                    'split_info': split_info
                }
        
        except httpx.HTTPStatusError as e:
            logger.error(f"Erro HTTP ao criar split: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Erro ao criar split: {str(e)}")
            raise
    
    async def create_producer_account(self, producer_data: Dict) -> str:
        """
        Cria subconta (wallet) para o produtor no Asaas
        
        O produtor precisa fornecer:
        - CPF/CNPJ
        - Dados bancários
        - Endereço completo
        
        Args:
            producer_data: {
                'name': str,
                'email': str,
                'cpfCnpj': str,
                'phone': str,
                'mobilePhone': str,
                'address': str,
                'addressNumber': str,
                'province': str,
                'postalCode': str
            }
        
        Returns:
            wallet_id: ID da carteira do produtor
        """
        
        try:
            async with httpx.AsyncClient() as client:
                # Criar subconta
                response = await client.post(
                    f"{self.base_url}/accounts",
                    json=producer_data,
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                account = response.json()
                
                wallet_id = account['walletId']
                
                logger.info(f"Subconta criada para produtor: {wallet_id}")
                
                return wallet_id
        
        except Exception as e:
            logger.error(f"Erro ao criar subconta: {str(e)}")
            raise
    
    async def get_producer_balance(self, wallet_id: str) -> Dict:
        """
        Consulta saldo do produtor
        
        Returns:
            {
                'availableBalance': float,  # Disponível para saque
                'pendingBalance': float,    # Aguardando confirmação
                'totalBalance': float       # Total
            }
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/wallets/{wallet_id}/balance",
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                return response.json()
        
        except Exception as e:
            logger.error(f"Erro ao consultar saldo: {str(e)}")
            raise
    
    async def request_producer_transfer(self, wallet_id: str, amount: float) -> Dict:
        """
        Solicita transferência do saldo do produtor para conta bancária
        
        Tempo: 1-2 dias úteis
        Taxa: Grátis
        
        Args:
            wallet_id: ID da carteira do produtor
            amount: Valor a transferir
        
        Returns:
            Dados da transferência
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/transfers",
                    json={
                        'walletId': wallet_id,
                        'value': amount
                    },
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                return response.json()
        
        except Exception as e:
            logger.error(f"Erro ao solicitar transferência: {str(e)}")
            raise

# Instância única
payment_split_service = PaymentSplitService()
