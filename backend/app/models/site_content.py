"""
Site content models for About page and People/Contributors
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from ..database import Base


class SiteContent(Base):
    """Key-value store for admin-editable site content (e.g. about page)."""
    __tablename__ = "site_content"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Contributor(Base):
    """People who contributed to the platform."""
    __tablename__ = "contributors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    affiliation = Column(String(300), nullable=True)
    email = Column(String(200), nullable=True)
    role = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
