"""Database seeding script for demonstration and testing.

Creates initial demo accounts and missions for testing the application:
- Admin: admin@nasa.gov / Password123!
- Team Member: astronaut@nasa.gov / Password123!
- Team Member 2: engineer@nasa.gov / Password123!
- Sample Mission with assigned team member
"""
from app.core.database import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.base import Base
import app.models  # noqa: F401
from app.models.mission import Mission, MissionStatus
from app.models.report import Report
from app.models.user import Role, User


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if admin already exists
    admin = db.query(User).filter(User.email == "admin@nasa.gov").first()
    if not admin:
        admin = User(
            email="admin@nasa.gov",
            hashed_password=get_password_hash("Password123!"),
            role=Role.admin,
        )
        db.add(admin)

    member1 = db.query(User).filter(User.email == "astronaut@nasa.gov").first()
    if not member1:
        member1 = User(
            email="astronaut@nasa.gov",
            hashed_password=get_password_hash("Password123!"),
            role=Role.team_member,
        )
        db.add(member1)

    member2 = db.query(User).filter(User.email == "engineer@nasa.gov").first()
    if not member2:
        member2 = User(
            email="engineer@nasa.gov",
            hashed_password=get_password_hash("Password123!"),
            role=Role.team_member,
        )
        db.add(member2)

    db.commit()
    db.refresh(admin)
    db.refresh(member1)
    db.refresh(member2)

    # Check if sample missions exist
    mission1 = db.query(Mission).filter(Mission.title == "Artemis III - Lunar Landing").first()
    if not mission1:
        mission1 = Mission(
            title="Artemis III - Lunar Landing",
            description="Crewed exploration and scientific research mission to the lunar south pole region.",
            status=MissionStatus.in_progress,
        )
        mission1.assigned_users.append(member1)
        db.add(mission1)

    mission2 = db.query(Mission).filter(Mission.title == "Europa Clipper Deep Survey").first()
    if not mission2:
        mission2 = Mission(
            title="Europa Clipper Deep Survey",
            description="Orbital survey and atmospheric reconnaissance of Jupiter's moon Europa.",
            status=MissionStatus.planned,
        )
        mission2.assigned_users.append(member1)
        mission2.assigned_users.append(member2)
        db.add(mission2)

    db.commit()
    if mission1:
        db.refresh(mission1)

    # Sample pending report for Artemis III
    existing_report = db.query(Report).filter(Report.mission_id == mission1.id).first()
    if not existing_report:
        report = Report(
            mission_id=mission1.id,
            user_id=member1.id,
            current_status="in_progress",
            progress_update="Descent vehicle avionics testing 92% complete with nominal telemetry readings.",
            work_completed="Simulated descent trajectory and tested thruster pulse sequences under thermal stress.",
            blockers="Awaiting delivery of final communications transceiver unit.",
            reviewed=False,
        )
        db.add(report)
        db.commit()

    db.close()
    print("Database successfully seeded with demo data!")
    print("--------------------------------------------------")
    print("Admin:       admin@nasa.gov      / Password123!")
    print("Team Member: astronaut@nasa.gov  / Password123!")
    print("Team Member: engineer@nasa.gov   / Password123!")
    print("--------------------------------------------------")


if __name__ == "__main__":
    seed()
