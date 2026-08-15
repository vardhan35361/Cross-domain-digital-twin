"""Authentication + RBAC + audit + user admin for the Hyderabad ITMS."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Body, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 60 * 8  # 8h shift

ROLES = {
    "super_admin": {
        "label": "Super Administrator",
        "permissions": ["*"],
        "description": "Full control of the ITMS platform, users, and infrastructure.",
    },
    "control_admin": {
        "label": "Control Room Administrator",
        "permissions": ["overview", "twin", "traffic", "signals", "incidents", "emergency", "replay", "analytics", "predictive", "live", "cctv", "drones", "convoy", "audit"],
        "description": "Runs the command floor; no system configuration.",
    },
    "senior_officer": {
        "label": "Senior Traffic Officer",
        "permissions": ["overview", "twin", "traffic", "analytics", "predictive", "convoy", "emergency", "signals", "cctv", "drones"],
        "description": "Zone-agnostic traffic engineering + convoy operations.",
    },
    "zone_officer": {
        "label": "Zone Traffic Officer",
        "permissions": ["overview", "twin", "traffic", "incidents", "analytics", "cctv"],
        "description": "Assigned zone monitoring, incident logging, local dispatch.",
    },
    "dispatch_officer": {
        "label": "Emergency Dispatch Officer",
        "permissions": ["overview", "twin", "emergency", "replay", "convoy", "cctv", "drones"],
        "description": "Ambulance / fire / police dispatch + green corridor control.",
    },
    "viewer": {
        "label": "Viewer",
        "permissions": ["overview", "twin", "traffic", "analytics", "predictive"],
        "description": "Read-only observer.",
    },
}

SEED_ACCOUNTS = [
    ("super@hyderabad.gov.in", "super_admin", "R. Verma", "ALL ZONES"),
    ("control@hyderabad.gov.in", "control_admin", "A. Sharma", "COMMAND ROOM"),
    ("senior@hyderabad.gov.in", "senior_officer", "S. Iyer", "TRAFFIC ENG"),
    ("zone.gachi@hyderabad.gov.in", "zone_officer", "P. Reddy", "GACHIBOWLI"),
    ("dispatch@hyderabad.gov.in", "dispatch_officer", "K. Rao", "108 CONTROL"),
    ("viewer@hyderabad.gov.in", "viewer", "Media Cell", "PRESS BOX"),
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES),
               "type": "access"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def seed_users(db) -> None:
    await db.users.create_index("email", unique=True)
    await db.audit_logs.create_index([("created_at", -1)])
    password = os.environ.get("SEED_PASSWORD", "Hyderabad@2026")
    for email, role, name, zone in SEED_ACCOUNTS:
        existing = await db.users.find_one({"email": email})
        payload = {"email": email, "role": role, "name": name, "zone": zone,
                   "password_hash": hash_password(password), "active": True,
                   "created_at": datetime.now(timezone.utc)}
        if existing is None:
            await db.users.insert_one(payload)
        else:
            await db.users.update_one({"email": email},
                {"$set": {"password_hash": payload["password_hash"], "role": role,
                          "name": name, "zone": zone, "active": True}})


async def record_audit(db, actor: Optional[Dict[str, Any]], action: str, target: str = "-", meta: Optional[Dict[str, Any]] = None, ip: Optional[str] = None) -> None:
    entry = {"actor_email": (actor or {}).get("email", "anonymous"),
             "actor_role": (actor or {}).get("role", "-"),
             "action": action, "target": target, "meta": meta or {},
             "ip": ip or "-", "created_at": datetime.now(timezone.utc)}
    try:
        await db.audit_logs.insert_one(entry)
    except Exception:
        pass


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    zone: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    role_label: str = ""


def user_out(doc: Dict[str, Any]) -> Dict[str, Any]:
    role = doc.get("role", "viewer")
    return {"id": str(doc["_id"]), "email": doc["email"], "name": doc.get("name", ""),
            "role": role, "zone": doc.get("zone"),
            "permissions": ROLES.get(role, {}).get("permissions", []),
            "role_label": ROLES.get(role, {}).get("label", role)}


def build_router(db, get_state: Callable[[], Dict[str, Any]]) -> APIRouter:
    router = APIRouter(prefix="/api")

    async def current_user(request: Request, access_token: Optional[str] = Cookie(default=None)) -> Dict[str, Any]:
        token = access_token
        if not token:
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth[7:]
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Session expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid session token")
        try:
            user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid session")
        if not user or not user.get("active", True):
            raise HTTPException(status_code=401, detail="Account inactive")
        return user

    def require_permission(perm: str):
        async def dep(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
            perms = ROLES.get(user.get("role", "viewer"), {}).get("permissions", [])
            if "*" not in perms and perm not in perms:
                raise HTTPException(status_code=403, detail=f"Missing permission: {perm}")
            return user
        return dep

    @router.post("/auth/login")
    async def login(response: Response, data: LoginRequest, request: Request):
        email = data.email.strip().lower()
        user = await db.users.find_one({"email": email})
        if not user or not verify_password(data.password, user["password_hash"]):
            await record_audit(db, {"email": email, "role": "-"}, "auth.login_failed", email,
                              ip=request.client.host if request.client else "-")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not user.get("active", True):
            await record_audit(db, {"email": email, "role": user.get("role", "-")}, "auth.login_blocked", email,
                              ip=request.client.host if request.client else "-")
            raise HTTPException(status_code=401, detail="Account inactive — contact administrator")
        token = create_access_token(str(user["_id"]), user["email"], user["role"])
        response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                            samesite="none", max_age=ACCESS_MINUTES * 60, path="/")
        out = user_out(user)
        await record_audit(db, out, "auth.login", user["email"],
                          ip=request.client.host if request.client else "-")
        return {"user": out, "access_token": token}

    @router.post("/auth/logout")
    async def logout(response: Response, user: Dict[str, Any] = Depends(current_user)):
        response.delete_cookie("access_token", path="/")
        await record_audit(db, user_out(user), "auth.logout", user["email"])
        return {"ok": True}

    @router.get("/auth/me")
    async def me(user: Dict[str, Any] = Depends(current_user)):
        return user_out(user)

    @router.get("/auth/roles")
    async def roles_info():
        return [{"role": k, **v} for k, v in ROLES.items()]

    @router.get("/auth/accounts")
    async def seeded_accounts():
        # Non-sensitive: returns emails + roles + demo password for viva display
        return {"password": os.environ.get("SEED_PASSWORD", "Hyderabad@2026"),
                "accounts": [{"email": e, "role": r, "name": n, "zone": z,
                              "role_label": ROLES[r]["label"], "description": ROLES[r]["description"]}
                             for e, r, n, z in SEED_ACCOUNTS]}

    # ---------- user admin (super_admin only) ----------
    @router.get("/users")
    async def list_users(user=Depends(require_permission("*"))):
        docs = await db.users.find({}, {"password_hash": 0}).to_list(200)
        for d in docs:
            d["id"] = str(d.pop("_id"))
            d["created_at"] = d.get("created_at").isoformat() if d.get("created_at") else None
        return docs

    @router.post("/users/{user_id}/deactivate")
    async def deactivate(user_id: str, actor=Depends(require_permission("*"))):
        try:
            oid = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid id")
        result = await db.users.update_one({"_id": oid}, {"$set": {"active": False}})
        if not result.matched_count:
            raise HTTPException(status_code=404, detail="User not found")
        await record_audit(db, user_out(actor), "user.deactivate", user_id)
        return {"ok": True}

    @router.post("/users/{user_id}/reactivate")
    async def reactivate(user_id: str, actor=Depends(require_permission("*"))):
        try:
            oid = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid id")
        await db.users.update_one({"_id": oid}, {"$set": {"active": True}})
        await record_audit(db, user_out(actor), "user.reactivate", user_id)
        return {"ok": True}

    # ---------- audit log ----------
    @router.get("/audit")
    async def audit_list(limit: int = 100, user=Depends(current_user)):
        # audit visible to super_admin and control_admin
        perms = ROLES.get(user.get("role"), {}).get("permissions", [])
        if "*" not in perms and "audit" not in perms:
            raise HTTPException(status_code=403, detail="Missing permission: audit")
        docs = await db.audit_logs.find({}).sort("created_at", -1).to_list(min(500, max(1, limit)))
        for d in docs:
            d["id"] = str(d.pop("_id"))
            if isinstance(d.get("created_at"), datetime):
                d["created_at"] = d["created_at"].isoformat()
        return docs

    return router, current_user, require_permission, record_audit
