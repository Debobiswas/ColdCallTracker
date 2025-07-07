from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Business(BaseModel):
    id: Optional[int] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = "new"
    notes: Optional[str] = None
    last_called: Optional[datetime] = None
    callback_date: Optional[datetime] = None
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class NewBusiness(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = "new"
    notes: Optional[str] = None
    callback_date: Optional[datetime] = None

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    last_called: Optional[datetime] = None
    callback_date: Optional[datetime] = None

class Meeting(BaseModel):
    id: Optional[int] = None
    title: str
    date: datetime
    time: str
    duration: Optional[int] = None
    location: Optional[str] = None
    attendees: Optional[str] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Client(BaseModel):
    id: Optional[int] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None 