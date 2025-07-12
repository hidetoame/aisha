from dataclasses import dataclass
from typing import Any


@dataclass
class APIResult:
    status_code: int
    data: dict[str, Any] | None = None
    error: str | None = None

    @property
    def success(self) -> bool:
        return 200 <= self.status_code < 300
