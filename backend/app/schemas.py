from typing import Literal

from pydantic import BaseModel


RuleType = Literal["ip", "app", "domain"]


class RuleCreate(BaseModel):
    rule_type: RuleType
    value: str
    enabled: bool = True
