import re
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Money = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
Km = Annotated[int, Field(ge=0, le=99999999)]
Text = Annotated[str, Field(min_length=1, max_length=160)]

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Login(Input):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower()

class UserInput(Login):
    name: str = Field(min_length=1, max_length=120)
    role: Literal['ADMIN', 'USUARIO'] = 'USUARIO'
    password: str = Field(min_length=12, max_length=128)

class TruckInput(Input):
    plate: str
    brand: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=100)
    version: str | None = Field(None, max_length=100)
    manufacture_year: int | None = Field(None, ge=1900, le=2100)
    model_year: int | None = Field(None, ge=1900, le=2100)
    chassis: str | None = Field(None, max_length=40)
    renavam: str | None = Field(None, max_length=20)
    color: str | None = Field(None, max_length=60)
    driver: str | None = Field(None, max_length=120)
    notes: str | None = Field(None, max_length=5000)
    status: Literal['DISPONIVEL', 'EM_MANUTENCAO', 'PARADO', 'INATIVO'] = 'DISPONIVEL'
    active: bool = True

    @field_validator('plate')
    @classmethod
    def plate_format(cls, value):
        value = value.upper().replace('-', '').replace(' ', '')
        if not re.fullmatch(r'[A-Z]{3}[0-9][A-Z0-9][0-9]{2}', value):
            raise ValueError('Placa inválida')
        return value

    @field_validator('chassis', 'renavam')
    @classmethod
    def blank_nullable(cls, value):
        return value.upper() if value else None

class TruckCreate(TruckInput):
    mileage: Km = 0

class MileageInput(Input):
    mileage: Km
    notes: str | None = Field(None, max_length=2000)

class WorkshopInput(Input):
    name: Text
    document: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=30)
    whatsapp: str | None = Field(None, max_length=30)
    address: str | None = Field(None, max_length=300)
    contact: str | None = Field(None, max_length=120)
    notes: str | None = Field(None, max_length=5000)
    active: bool = True

class ServiceInput(Input):
    description: str = Field(min_length=1, max_length=300)
    value: Money = Decimal('0')

class PartInput(Input):
    name: Text
    reference: str | None = Field(None, max_length=120)
    manufacturer: str | None = Field(None, max_length=120)
    quantity: Decimal = Field(gt=0, max_digits=9, decimal_places=3)
    unit_price: Money

class MaintenanceInput(Input):
    truck_id: int
    workshop_id: int | None = None
    workshop_name: str | None = Field(None, max_length=160)
    plan_id: int | None = None
    type: Literal['PREVENTIVA', 'CORRETIVA']
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    date: date
    mileage: Km
    status: Literal['ABERTA', 'AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] = 'ABERTA'
    notes: str | None = Field(None, max_length=5000)
    other_cost: Money = Decimal('0')
    services: list[ServiceInput] = Field(default_factory=list, max_length=100)
    parts: list[PartInput] = Field(default_factory=list, max_length=100)

class PlanInput(Input):
    truck_id: int
    name: Text
    interval_km: int | None = Field(None, gt=0, le=99999999)
    interval_months: int | None = Field(None, gt=0, le=120)
    baseline_km: Km
    baseline_date: date
    warning_km: int = Field(2000, ge=0, le=99999999)
    warning_days: int = Field(15, ge=0, le=3650)
    active: bool = True
    last_maintenance_id: int | None = None

    @model_validator(mode='after')
    def interval_required(self):
        if not self.interval_km and not self.interval_months:
            raise ValueError('Informe intervalo em KM ou meses')
        if self.baseline_date > date.today():
            raise ValueError('Última realização não pode estar no futuro')
        return self
