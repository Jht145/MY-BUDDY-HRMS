from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Literal
import sqlite3

from backend.db import get_db
from backend.middleware import get_current_user, require_role
from backend.utils.geofence import evaluate_geofence, OFFICE_LAT, OFFICE_LON, GEOFENCE_RADIUS_METERS

router = APIRouter(
    prefix="/api/v1/attendance",
    tags=["Smart Kiosk Attendance"],
    dependencies=[Depends(get_current_user)]
)

class CheckInRequest(BaseModel):
    photo_url: str = Field(..., description="Webcam snapshot (URL or Base64 image data)")
    latitude: float = Field(..., description="Device GPS Latitude")
    longitude: float = Field(..., description="Device GPS Longitude")

class CheckOutRequest(BaseModel):
    photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AdminVerifyRequest(BaseModel):
    action: Literal["APPROVE", "REJECT"] = Field(..., description="Review action")
    notes: Optional[str] = Field(default=None, description="Mandatory notes if rejecting")

@router.post("/kiosk/check-in")
async def kiosk_check_in(
    payload: CheckInRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Biometric & Spatial Verification Smart Kiosk Check-In:
    - Calculates distance using Haversine formula from office (12.9716, 77.5946).
    - If distance <= 100m: Status = 'PRESENT' (Auto-approved).
    - If distance > 100m: Status = 'PENDING_ADMIN_APPROVAL' (Flagged for HR Admin desk).
    """
    user_id = current_user["user_id"]
    distance, is_within = evaluate_geofence(payload.latitude, payload.longitude)

    if is_within:
        status_value = "PRESENT"
        notes = f"Auto-approved: Location within {GEOFENCE_RADIUS_METERS}m office geofence ({distance:.1f}m)."
    else:
        status_value = "PENDING_ADMIN_APPROVAL"
        notes = f"Flagged: Check-in coordinates ({payload.latitude:.4f}, {payload.longitude:.4f}) are {distance:.1f}m away from office (exceeds {GEOFENCE_RADIUS_METERS}m limit)."

    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO attendance_logs (user_id, check_in_timestamp, check_in_photo_url, check_in_latitude, check_in_longitude, distance_meters, status, approval_notes)
        VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        payload.photo_url,
        payload.latitude,
        payload.longitude,
        distance,
        status_value,
        notes
    ))
    db.commit()
    log_id = cursor.lastrowid

    return {
        "success": True,
        "message": "Check-in recorded successfully." if is_within else "Check-in recorded and flagged for HR Admin geofence approval.",
        "data": {
            "log_id": log_id,
            "status": status_value,
            "distance_meters": distance,
            "is_within_geofence": is_within,
            "office_location": {"latitude": OFFICE_LAT, "longitude": OFFICE_LON, "radius_meters": GEOFENCE_RADIUS_METERS},
            "approval_notes": notes
        }
    }

@router.post("/kiosk/check-out")
async def kiosk_check_out(
    payload: CheckOutRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Record shift check-out timestamp on today's active log.
    """
    user_id = current_user["user_id"]
    cursor = db.cursor()

    # Find the most recent check-in for this user today without check_out
    cursor.execute("""
        SELECT id FROM attendance_logs
        WHERE user_id = ? AND check_out_timestamp IS NULL
        ORDER BY check_in_timestamp DESC LIMIT 1
    """, (user_id,))
    active_log = cursor.fetchone()

    if not active_log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "No active check-in found to check out from."}
        )

    cursor.execute("""
        UPDATE attendance_logs 
        SET check_out_timestamp = CURRENT_TIMESTAMP, check_out_photo_url = ? 
        WHERE id = ?
    """, (payload.photo_url, active_log["id"]))
    db.commit()

    return {
        "success": True,
        "message": "Check-out timestamp successfully recorded.",
        "log_id": active_log["id"]
    }

@router.get("/my-logs")
async def get_my_attendance_logs(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Personal attendance history view for the authenticated employee.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, check_in_timestamp, check_out_timestamp, check_in_photo_url, check_out_photo_url,
               check_in_latitude, check_in_longitude, distance_meters, status, approval_notes
        FROM attendance_logs
        WHERE user_id = ?
        ORDER BY check_in_timestamp DESC
    """, (current_user["user_id"],))
    rows = cursor.fetchall()

    logs = [
        {
            "id": r["id"],
            "check_in_timestamp": r["check_in_timestamp"],
            "check_out_timestamp": r["check_out_timestamp"],
            "check_in_photo_url": r["check_in_photo_url"],
            "check_out_photo_url": r["check_out_photo_url"],
            "latitude": r["check_in_latitude"],
            "longitude": r["check_in_longitude"],
            "distance_meters": r["distance_meters"],
            "status": r["status"],
            "notes": r["approval_notes"]
        }
        for r in rows
    ]

    return {
        "success": True,
        "count": len(logs),
        "logs": logs
    }

@router.get("/admin/flagged")
async def get_admin_flagged_logs(
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin Desk: Lists all entries requiring manual geofence verification.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT a.id, a.user_id, u.employee_id, u.first_name, u.last_name, u.email, u.department,
               a.check_in_timestamp, a.check_in_photo_url, a.check_in_latitude, a.check_in_longitude,
               a.distance_meters, a.status, a.approval_notes
        FROM attendance_logs a
        JOIN users u ON a.user_id = u.id
        WHERE a.status IN ('PENDING_ADMIN_APPROVAL', 'FLAGGED')
        ORDER BY a.check_in_timestamp DESC
    """)
    rows = cursor.fetchall()

    flagged = [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "employee_id": r["employee_id"],
            "employee_name": f"{r['first_name']} {r['last_name']}",
            "email": r["email"],
            "department": r["department"],
            "check_in_timestamp": r["check_in_timestamp"],
            "photo_url": r["check_in_photo_url"],
            "latitude": r["check_in_latitude"],
            "longitude": r["check_in_longitude"],
            "distance_meters": r["distance_meters"],
            "status": r["status"],
            "notes": r["approval_notes"],
            "maps_url": f"https://www.google.com/maps?q={r['check_in_latitude']},{r['check_in_longitude']}"
        }
        for r in rows
    ]

    return {
        "success": True,
        "count": len(flagged),
        "flagged_logs": flagged
    }

@router.get("/admin/all")
async def get_all_attendance_logs(
    status_filter: Optional[str] = Query(default=None),
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin master log search & filter.
    """
    cursor = db.cursor()
    query = """
        SELECT a.id, a.user_id, u.employee_id, u.first_name, u.last_name, u.email, u.department,
               a.check_in_timestamp, a.check_out_timestamp, a.check_in_photo_url,
               a.distance_meters, a.status, a.approval_notes
        FROM attendance_logs a
        JOIN users u ON a.user_id = u.id
        WHERE 1=1
    """
    params = []
    if status_filter:
        query += " AND a.status = ?"
        params.append(status_filter)

    query += " ORDER BY a.check_in_timestamp DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()

    logs = [
        {
            "id": r["id"],
            "employee_id": r["employee_id"],
            "employee_name": f"{r['first_name']} {r['last_name']}",
            "department": r["department"],
            "check_in": r["check_in_timestamp"],
            "check_out": r["check_out_timestamp"],
            "photo_url": r["check_in_photo_url"],
            "distance_meters": r["distance_meters"],
            "status": r["status"],
            "notes": r["approval_notes"]
        }
        for r in rows
    ]

    return {"success": True, "count": len(logs), "logs": logs}

@router.patch("/admin/verify/{log_id}")
async def admin_verify_attendance(
    log_id: int,
    payload: AdminVerifyRequest,
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin action to manually approve or reject a flagged attendance entry.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, user_id, status FROM attendance_logs WHERE id = ?", (log_id,))
    log = cursor.fetchone()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Attendance log entry not found."}
        )

    new_status = "PRESENT" if payload.action == "APPROVE" else "REJECTED"
    notes = payload.notes or f"Manual review: {payload.action} by HR Admin ({admin_user.get('email')})"

    cursor.execute("""
        UPDATE attendance_logs
        SET status = ?, approval_notes = ?, verified_by = ?
        WHERE id = ?
    """, (new_status, notes, admin_user["user_id"], log_id))
    db.commit()

    return {
        "success": True,
        "message": f"Attendance log #{log_id} has been marked as {new_status}.",
        "new_status": new_status,
        "notes": notes
    }
