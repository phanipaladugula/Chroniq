from pydantic import BaseModel
from datetime import datetime

class M(BaseModel):
    d: datetime

print(repr(M(d='2026-05-23T01:30:00-03:00').d))
print(repr(M(d='2026-05-23T01:30:00').d))
