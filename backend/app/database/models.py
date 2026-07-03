from __future__ import annotations
from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base

class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    original_image_path: Mapped[str] = mapped_column(String, nullable=False)
    control_image_path: Mapped[str | None] = mapped_column(String, nullable=True)
    room_type_detected: Mapped[str | None] = mapped_column(String, nullable=True)
    room_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    style: Mapped[str] = mapped_column(String, nullable=False)
    prompt_used: Mapped[str] = mapped_column(String, nullable=False)
    model_used: Mapped[str] = mapped_column(String, nullable=False)
    generation_time_sec: Mapped[float] = mapped_column(Float, nullable=False)
    selected_variation_id: Mapped[int | None] = mapped_column(
        Integer, 
        ForeignKey("variations.id", use_alter=True, name="fk_generation_selected_variation_id"), 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
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
