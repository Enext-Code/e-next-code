from datetime import UTC, datetime, timezone
from typing import Any, Generic, List, Optional, Type, TypeVar

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field

from app.core import settings

T = TypeVar("T", bound="BaseSchema")


def get_current_datetime() -> datetime:
    """Helper function to get current datetime with UTC timezone"""
    return datetime.now(UTC)


class TimestampMixin(BaseModel):
    """Mixin to add created_at and updated_at timestamps"""

    created_at: datetime = Field(default_factory=get_current_datetime)
    updated_at: datetime = Field(default_factory=get_current_datetime)

    class Config:
        json_encoders = {
            datetime: lambda v: v.astimezone(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        }

    def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = get_current_datetime()


class IDMixin(BaseModel):
    """Mixin to add MongoDB ID field"""

    id: Optional[str] = Field(
        default=None, alias="id", description="ID of the document", index=True
    )

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )


class StatusMixin(BaseModel):
    """Mixin to add status field"""

    is_active: bool = Field(default=True)
    is_deleted: bool = Field(default=False)


class AuditMixin(BaseModel):
    """Mixin to add audit fields"""

    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_by_profile: Optional[str] = None
    updated_by_profile: Optional[str] = None


class OrganisationMixin(BaseModel):
    """Mixin to add organisation fields"""

    organisation_id: Optional[str] = None


class BaseMaster(AuditMixin, TimestampMixin, IDMixin, StatusMixin):
    name: str = Field(..., description="Name of the master item")
    description: Optional[str] = Field(
        None, description="Description of the master item"
    )
    code: Optional[str] = Field(None, description="Code of the master item")
    order: Optional[int] = Field(None, description="Order of the master item")

    class Settings:
        indexes = [[("name", 1)], [("code", 1)], [("is_active", 1)], [("order", 1)]]


class BaseSchema(BaseModel):
    """Base schema with common configurations"""

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        from_attributes=True,
    )

    class Settings:
        """Database settings"""

        collection: str = None
        indexes: list = []

    @classmethod
    def get_collection(cls):
        """Get MongoDB collection"""
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DB_NAME]
        return db[cls.Settings.collection]

    @classmethod
    async def create(cls: Type[T], **kwargs) -> T:
        """Create a new document"""
        from datetime import date, datetime as dt, time as dt_time
        
        collection = cls.get_collection()

        # Create instance
        instance = cls(**kwargs)

        # Convert to dict for MongoDB (without json mode to preserve types)
        doc = instance.model_dump(exclude={"id"})
        
        # Convert date objects to datetime for MongoDB compatibility
        for key, value in doc.items():
            if isinstance(value, date) and not isinstance(value, dt):
                # Convert date to datetime at start of day UTC
                doc[key] = dt.combine(value, dt_time.min)

        # Insert into database
        result = await collection.insert_one(doc)

        # Update id field
        instance.id = str(result.inserted_id)

        return instance

    async def save(self) -> T:
        """Save the document to database"""
        from datetime import date, datetime as dt, time as dt_time
        
        collection = self.get_collection()

        if hasattr(self, "update_timestamp"):
            self.update_timestamp()

        # Convert to dict for MongoDB (without json mode to preserve types)
        doc = self.model_dump(exclude={"id"})
        
        # Convert date objects to datetime for MongoDB compatibility
        for key, value in doc.items():
            if isinstance(value, date) and not isinstance(value, dt):
                # Convert date to datetime at start of day UTC
                doc[key] = dt.combine(value, dt_time.min)

        if self.id:
            # Update existing document
            await collection.update_one({"_id": ObjectId(self.id)}, {"$set": doc})
        else:
            # Insert new document
            result = await collection.insert_one(doc)
            self.id = str(result.inserted_id)

        return self

    @classmethod
    async def find_one(
        cls: Type[T], filter_dict: dict, projection: dict = None
    ) -> Optional[T]:
        """Find one document"""
        collection = cls.get_collection()

        doc = await collection.find_one(filter_dict, projection)
        if doc:
            # Convert _id to string
            if "_id" in doc:
                doc["id"] = str(doc.pop("_id"))
            return cls(**doc)
        return None

    @classmethod
    async def find(
        cls: Type[T],
        filter_dict: dict[str, Any] = None,
        skip: int = 0,
        limit: int = 100,
        sort: List[tuple] = None,
        projection: dict[str, Any] = None,
    ) -> List[T]:
        """Find multiple documents"""
        collection = cls.get_collection()

        # Initialize filter dict if None
        filter_dict = filter_dict or {}

        # Convert string ID to ObjectId if present
        if "_id" in filter_dict and isinstance(filter_dict["_id"], str):
            filter_dict["_id"] = ObjectId(filter_dict["_id"])

        # Create cursor with all options
        cursor = collection.find(filter_dict, projection)

        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        if sort:
            cursor = cursor.sort(sort)

        # Get all documents
        documents = []
        async for doc in cursor:
            if "_id" in doc:
                doc["id"] = str(doc.pop("_id"))
            documents.append(cls(**doc))

        return documents

    async def update(self, update_dict: dict) -> T:
        """Update the document with specific fields"""
        if not self.id:
            raise ValueError("Cannot update document without id")

        collection = self.get_collection()

        if hasattr(self, "update_timestamp"):
            self.update_timestamp()
            update_dict["updated_at"] = self.updated_at

        # Update in database
        await collection.update_one({"_id": ObjectId(self.id)}, {"$set": update_dict})

        # Update instance
        for key, value in update_dict.items():
            setattr(self, key, value)

        return self

    async def delete(self) -> bool:
        """Delete the document"""
        if not self.id:
            return False

        if hasattr(self, "is_deleted"):
            self.is_deleted = True
            await self.save()
            return True

        collection = self.get_collection()
        result = await collection.delete_one({"_id": ObjectId(self.id)})
        return result.deleted_count > 0

    @classmethod
    async def count(cls, filter_dict: dict = None) -> int:
        """Count documents"""
        collection = cls.get_collection()
        return await collection.count_documents(filter_dict or {})


class BaseMasterCreate(BaseModel):
    """Base schema for creating master items"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    code: Optional[str] = Field(default=None, max_length=50)
    order: Optional[int] = Field(default=0)
    is_active: Optional[bool] = Field(default=True)


class BaseMasterUpdate(BaseModel):
    """Base schema for updating master items"""

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    code: Optional[str] = Field(default=None, max_length=50)
    order: Optional[int] = Field(default=None)
    is_active: Optional[bool] = Field(default=None)


class BaseMasterBulkCreate(BaseModel):
    """Base schema for bulk creating master items"""

    items: List[BaseMasterCreate]


class BaseMasterResponse(BaseModel):
    """Base schema for master item responses"""

    id: str
    name: str
    description: Optional[str] = None
    code: Optional[str] = None
    order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BulkCreateResponse(BaseModel, Generic[T]):
    """Response for bulk create operations"""

    created_count: int
    items: List[T]
    failed_count: int
    failed_items: List[dict] = []
