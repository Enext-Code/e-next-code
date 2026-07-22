import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import aioboto3
from botocore.config import Config
from fastapi import UploadFile

from . import settings

logger = logging.getLogger(__name__)


class S3Manager:
    """S3 Connection Manager"""

    _instance = None
    _initialized = False
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.session = aioboto3.Session(
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME,
            )
            self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            self._initialized = True

            # AWS Config
            self.config = Config(
                region_name=settings.AWS_S3_REGION_NAME,
                retries=dict(max_attempts=3),
                max_pool_connections=settings.AWS_MAX_CONNECTIONS,
            )

    async def initialize(self):
        """Initialize the connection"""
        # No need to initialize anything for aioboto3
        pass

    @asynccontextmanager
    async def get_client(self):
        """Get a client using aioboto3 session"""
        async with self.session.client(
            "s3", config=self.config, endpoint_url=settings.AWS_S3_ENDPOINT_URL
        ) as client:
            yield client

    async def upload_file(
        self,
        file: UploadFile,
        folder: str,
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Upload a single file to S3"""
        try:
            key = f"{folder.strip('/')}/{filename or file.filename}"
            content = await file.read()

            async with self.get_client() as client:
                await client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=content,
                    ContentType=file.content_type,
                    Metadata=metadata or {},
                )

            return {
                "key": key,
                "filename": filename or file.filename,
                "content_type": file.content_type,
            }

        except Exception as e:
            logger.error(f"Error uploading file to S3: {e}")
            raise

    async def upload_multiple_files(
        self,
        files: List[UploadFile],
        folder: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """Upload multiple files concurrently"""
        tasks = [self.upload_file(file, folder, metadata=metadata) for file in files]
        return await asyncio.gather(*tasks, return_exceptions=True)

    async def delete_file(self, key: str) -> bool:
        """Delete a file from S3"""
        try:
            async with self.get_client() as client:
                await client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception as e:
            logger.error(f"Error deleting file from S3: {e}")
            return False

    async def get_presigned_url(
        self,
        key: str,
        expiration: int = None,
        response_content_type: Optional[str] = None,
    ) -> str:
        """Generate a presigned URL for an S3 object"""
        try:
            params = {"Bucket": self.bucket_name, "Key": key}
            if response_content_type:
                params["ResponseContentType"] = response_content_type

            async with self.get_client() as client:
                url = await client.generate_presigned_url(
                    "get_object",
                    Params=params,
                    ExpiresIn=expiration or settings.AWS_PRESIGNED_EXPIRATION,
                )
            return url
        except Exception as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise

    async def get_presigned_urls_batch(
        self,
        keys: List[str],
        expiration: int = None,
        response_content_type: Optional[str] = None,
    ) -> Dict[str, str]:
        """Generate presigned URLs for multiple keys"""
        if not keys:
            return {}

        async def generate_single_url(key):
            try:
                params = {"Bucket": self.bucket_name, "Key": key}
                if response_content_type:
                    params["ResponseContentType"] = response_content_type

                async with self.get_client() as client:
                    url = await client.generate_presigned_url(
                        "get_object",
                        Params=params,
                        ExpiresIn=expiration or settings.AWS_PRESIGNED_EXPIRATION,
                    )
                return key, url
            except Exception as e:
                logger.error(f"Error generating presigned URL for {key}: {e}")
                return key, None

        # Create tasks for all URLs
        tasks = [generate_single_url(key) for key in keys]

        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks)

        return {key: url for key, url in results if url is not None}

    async def get_file_content(self, key: str) -> bytes:
        """
        Get the raw content of a file from S3

        Args:
            key: The S3 key of the file

        Returns:
            The file content as bytes

        Raises:
            Exception: If the file cannot be retrieved
        """
        try:
            async with self.get_client() as client:
                response = await client.get_object(Bucket=self.bucket_name, Key=key)

                # Read the streaming body
                async with response["Body"] as stream:
                    content = await stream.read()

                return content
        except Exception as e:
            logger.error(f"Error retrieving file content from S3 for key {key}: {e}")
            raise


s3 = S3Manager()
