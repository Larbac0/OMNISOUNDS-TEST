import boto3
import logging
import os
from typing import BinaryIO, Optional
from botocore.exceptions import ClientError
import uuid

logger = logging.getLogger(__name__)

AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "")

class S3Service:
    def __init__(self):
        self.bucket_name = S3_BUCKET_NAME
        self.region = AWS_REGION
        
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION
            )
            self.enabled = True
            logger.info("S3 Service initialized with credentials")
        else:
            self.s3_client = None
            self.enabled = False
            logger.warning("S3 Service disabled - no AWS credentials provided")
    
    def generate_unique_filename(self, original_filename: str, prefix: str = "") -> str:
        """Generate a unique filename with UUID"""
        ext = original_filename.split('.')[-1] if '.' in original_filename else ''
        unique_id = str(uuid.uuid4())
        if prefix:
            return f"{prefix}/{unique_id}.{ext}" if ext else f"{prefix}/{unique_id}"
        return f"{unique_id}.{ext}" if ext else unique_id
    
    async def upload_file(
        self,
        file_content: BinaryIO,
        filename: str,
        content_type: str,
        folder: str = "uploads"
    ) -> Optional[str]:
        """
        Upload a file to S3 and return the public URL
        
        Args:
            file_content: File content as binary
            filename: Original filename
            content_type: MIME type (e.g., 'audio/mpeg', 'image/jpeg')
            folder: S3 folder/prefix (e.g., 'audio', 'images')
        
        Returns:
            Public URL of the uploaded file or None if S3 is disabled
        """
        
        if not self.enabled:
            logger.warning("S3 upload skipped - service disabled")
            return None
        
        try:
            # Generate unique key
            key = self.generate_unique_filename(filename, folder)
            
            # Upload to S3
            self.s3_client.upload_fileobj(
                file_content,
                self.bucket_name,
                key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read'
                }
            )
            
            # Generate public URL
            url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"
            logger.info(f"File uploaded to S3: {url}")
            
            return url
            
        except ClientError as e:
            logger.error(f"S3 upload error: {str(e)}")
            raise Exception(f"Failed to upload file to S3: {str(e)}")
    
    async def delete_file(self, url: str) -> bool:
        """Delete a file from S3 by its URL"""
        
        if not self.enabled:
            return False
        
        try:
            # Extract key from URL
            key = url.split(f"{self.bucket_name}.s3.{self.region}.amazonaws.com/")[1]
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            logger.info(f"File deleted from S3: {key}")
            return True
            
        except (ClientError, IndexError) as e:
            logger.error(f"S3 delete error: {str(e)}")
            return False
    
    def generate_presigned_url(self, key: str, expiration: int = 3600) -> Optional[str]:
        """Generate a presigned URL for private file access"""
        
        if not self.enabled:
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            return None

# Singleton instance
s3_service = S3Service()
