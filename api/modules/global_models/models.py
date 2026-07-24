from uuid import UUID, uuid4

from pydantic import BaseModel, model_validator


class UUIDModel(BaseModel):
    uuid: UUID = uuid4()

    @model_validator(mode="after")
    def set_uuid(self):
        self.uuid = uuid4()
        return self