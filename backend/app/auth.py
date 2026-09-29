import hashlib
import os
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request
from pwdlib import PasswordHash
from sqlalchemy import select
from .db import get_db
from .models import Session, User

password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash('dummy-password-for-timing-only')
PERMISSIONS = {'ADMIN': {'read', 'write', 'users'}, 'USUARIO': {'read'}}

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()

def current_user(request: Request, db=Depends(get_db)):
    token = request.cookies.get('frotagest_session')
    session = db.scalar(select(Session).where(Session.token_hash == digest(token))) if token else None
    if not session or session.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(401, 'Faça login para continuar')
    user = db.get(User, session.user_id)
    if not user or not user.active:
        raise HTTPException(401, 'Usuário inativo')
    return user

def require(permission):
    def dependency(user=Depends(current_user)):
        if permission not in PERMISSIONS.get(user.role, set()):
            raise HTTPException(403, 'Você não tem permissão para esta operação')
        return user
    return dependency

admin = require('write')
