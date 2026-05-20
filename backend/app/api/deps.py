from fastapi import Depends
import app.config


class LocalUser:
    id: str

    def __init__(self, user_id: str):
        self.id = user_id


def get_local_user() -> LocalUser:
    return LocalUser(app.config.LOCAL_USER_ID)
