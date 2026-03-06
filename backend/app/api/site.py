"""
Site content API - About page and People/Contributors
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models.site_content import SiteContent, Contributor
from ..models import User
from ..core.deps import get_admin_user

router = APIRouter(prefix="/site", tags=["Site Content"])


# --- Schemas ---

class AboutResponse(BaseModel):
    mission: str
    donate: str
    collaborate: str

class AboutUpdate(BaseModel):
    mission: Optional[str] = None
    donate: Optional[str] = None
    collaborate: Optional[str] = None

class ContributorOut(BaseModel):
    id: int
    name: str
    affiliation: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    bio: Optional[str] = None
    url: Optional[str] = None
    display_order: int = 0

class ContributorCreate(BaseModel):
    name: str
    affiliation: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    bio: Optional[str] = None
    url: Optional[str] = None
    display_order: int = 0

class ContributorUpdate(BaseModel):
    name: Optional[str] = None
    affiliation: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    bio: Optional[str] = None
    url: Optional[str] = None
    display_order: Optional[int] = None


# --- Helpers ---

def _get_content(db: Session, key: str, default: str = "") -> str:
    row = db.query(SiteContent).filter(SiteContent.key == key).first()
    return row.value if row else default

def _set_content(db: Session, key: str, value: str):
    row = db.query(SiteContent).filter(SiteContent.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SiteContent(key=key, value=value))
    db.commit()


# --- About endpoints ---

DEFAULT_MISSION = """QuantumArena is a platform for benchmarking quantum hardware performance across real-world applications in the early fault-tolerant era.

Our mission is to provide a fair, transparent, and reproducible environment where quantum programmers can test their algorithms on real quantum hardware, and where hardware providers can showcase the capabilities of their systems.

We believe that the path to practical quantum computing requires rigorous benchmarking against meaningful application-level tasks — not just synthetic metrics."""

DEFAULT_DONATE = """QuantumArena is an open research platform. If you'd like to support our work:

- **Academic Collaboration**: We welcome research partnerships with universities and labs working on quantum computing, error correction, and applications.
- **Financial Support**: Donations help us maintain infrastructure and expand hardware access. Contact us to discuss sponsorship opportunities.
- **Spread the Word**: Share QuantumArena with your quantum computing community."""

DEFAULT_COLLABORATE = """**Hardware Providers**: We invite quantum hardware companies to join QuantumArena by providing API access to their systems. Your hardware will be benchmarked across a growing suite of real-world applications, giving you visibility into performance comparisons and user feedback.

Currently supported platforms include IBM, IonQ, QuEra, and Rigetti. To add your hardware:

1. Contact us at the email listed on our People page
2. Provide API credentials or a partnership agreement
3. We integrate your backend into our evaluation pipeline

**Software Contributors**: If you'd like to contribute evaluation code, new application benchmarks, or platform features, reach out to our team."""


@router.get("/about", response_model=AboutResponse)
def get_about(db: Session = Depends(get_db)):
    return AboutResponse(
        mission=_get_content(db, "about_mission", DEFAULT_MISSION),
        donate=_get_content(db, "about_donate", DEFAULT_DONATE),
        collaborate=_get_content(db, "about_collaborate", DEFAULT_COLLABORATE),
    )


@router.put("/about", response_model=AboutResponse)
def update_about(
    data: AboutUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if data.mission is not None:
        _set_content(db, "about_mission", data.mission)
    if data.donate is not None:
        _set_content(db, "about_donate", data.donate)
    if data.collaborate is not None:
        _set_content(db, "about_collaborate", data.collaborate)
    return AboutResponse(
        mission=_get_content(db, "about_mission", DEFAULT_MISSION),
        donate=_get_content(db, "about_donate", DEFAULT_DONATE),
        collaborate=_get_content(db, "about_collaborate", DEFAULT_COLLABORATE),
    )


# --- People/Contributors endpoints ---

@router.get("/people", response_model=list[ContributorOut])
def get_people(db: Session = Depends(get_db)):
    contributors = db.query(Contributor).order_by(Contributor.display_order, Contributor.id).all()
    if not contributors:
        # Seed default contributor
        default = Contributor(
            name="John Ye",
            affiliation="UCLA CS Department",
            email="yezhuoyang@cs.ucla.edu",
            role="Founder & Lead Developer",
            display_order=0,
        )
        db.add(default)
        db.commit()
        db.refresh(default)
        contributors = [default]
    return [ContributorOut(
        id=c.id, name=c.name, affiliation=c.affiliation, email=c.email,
        role=c.role, bio=c.bio, url=c.url, display_order=c.display_order,
    ) for c in contributors]


@router.post("/people", response_model=ContributorOut, status_code=status.HTTP_201_CREATED)
def add_contributor(
    data: ContributorCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    c = Contributor(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return ContributorOut(
        id=c.id, name=c.name, affiliation=c.affiliation, email=c.email,
        role=c.role, bio=c.bio, url=c.url, display_order=c.display_order,
    )


@router.put("/people/{contributor_id}", response_model=ContributorOut)
def update_contributor(
    contributor_id: int,
    data: ContributorUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    c = db.query(Contributor).filter(Contributor.id == contributor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contributor not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return ContributorOut(
        id=c.id, name=c.name, affiliation=c.affiliation, email=c.email,
        role=c.role, bio=c.bio, url=c.url, display_order=c.display_order,
    )


@router.delete("/people/{contributor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contributor(
    contributor_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    c = db.query(Contributor).filter(Contributor.id == contributor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contributor not found")
    db.delete(c)
    db.commit()
