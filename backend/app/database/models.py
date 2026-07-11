from __future__ import annotations
from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    username: Mapped[str | None] = mapped_column(String, unique=True, nullable=True, index=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    theme_preference: Mapped[str] = mapped_column(String, default="system", nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Integer, default=1, nullable=False) # SQLite uses Integer for boolean
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    last_login_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)

    # Relationships
    generations: Mapped[list["Generation"]] = relationship(
        "Generation",
        back_populates="owner",
        cascade="all, delete-orphan",
        foreign_keys="[Generation.user_id]"
    )

class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    original_image_path: Mapped[str] = mapped_column(String, nullable=False)
    room_type_detected: Mapped[str | None] = mapped_column(String, nullable=True)
    room_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    style: Mapped[str] = mapped_column(String, nullable=False)
    redesign_prompt: Mapped[str] = mapped_column(String, nullable=False)
    prompt_version: Mapped[str | None] = mapped_column(String, nullable=True)
    analysis_json: Mapped[str | None] = mapped_column(String, nullable=True)
    parent_generation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("generations.id"), nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    provider_version: Mapped[str | None] = mapped_column(String, nullable=True)
    model_used: Mapped[str] = mapped_column(String, nullable=False)
    model_version: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="completed", nullable=False)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    processing_time_sec: Mapped[float] = mapped_column(Float, nullable=False)
    selected_variation_id: Mapped[int | None] = mapped_column(
        Integer, 
        ForeignKey("variations.id", use_alter=True, name="fk_generation_selected_variation_id"), 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    owner: Mapped[User | None] = relationship(
        "User",
        back_populates="generations",
        foreign_keys=[user_id]
    )

    # One Generation has many Variations (with cascading delete)
    variations: Mapped[list[Variation]] = relationship(
        "Variation",
        back_populates="generation",
        cascade="all, delete-orphan",
        foreign_keys="[Variation.generation_id]"
    )

    # Allow mapping to the specific selected variation
    selected_variation: Mapped[Variation | None] = relationship(
        "Variation",
        foreign_keys=[selected_variation_id],
        post_update=True
    )

class Variation(Base):
    __tablename__ = "variations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    generation_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("generations.id", ondelete="CASCADE"), 
        nullable=False
    )
    image_path: Mapped[str] = mapped_column(String, nullable=False)
    seed: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    generation: Mapped["Generation"] = relationship(
        "Generation",
        back_populates="variations",
        foreign_keys=[generation_id]
    )
