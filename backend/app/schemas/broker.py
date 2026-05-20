from pydantic import BaseModel
from datetime import datetime


class BrokerConnectRequest(BaseModel):
    broker_name: str
    username: str
    password: str
    mfa_code: str | None = None
    connection_id: str | None = None


class BrokerConnectResponse(BaseModel):
    connected: bool
    mfa_required: bool = False
    connection_id: str | None = None
    connection: "BrokerConnectionResponse | None" = None


class BrokerConnectionResponse(BaseModel):
    id: str
    broker_name: str
    username: str
    is_connected: bool
    last_synced_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BrokerStatusResponse(BaseModel):
    connected: bool
    broker_name: str | None
    last_synced_at: datetime | None
    accounts: list["AccountResponse"]

    model_config = {"from_attributes": True}


class AccountResponse(BaseModel):
    id: str
    account_number: str
    account_type: str
    currency: str
    initial_balance: float
    current_balance: float

    model_config = {"from_attributes": True}
