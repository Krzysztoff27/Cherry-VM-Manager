import datetime as dt
import logging
import os
import re
from .main import router
from uuid import UUID, uuid4
from fastapi import HTTPException, Request, status
from starlette.requests import ClientDisconnect
from streaming_form_data.validators import ValidationError as SFDValidationError
from config.regex_config import REGEX_CONFIG
from config.files_config import FILES_CONFIG
from config.permissions_config import PERMISSIONS
from modules.users.permissions import verify_permissions
from modules.file_upload.models import UploadAlreadyExists, UploadHeadersError, UploadNotExistent, UploadTooLargeException
from modules.machine_resources.iso_files.models import CreateIsoRecordArgs, CreateIsoRecordForm
from modules.machine_resources.iso_files.manager import IsoManager
from modules.authentication.validation import DependsOnAdministrativeAuthentication
from modules.file_upload.upload_handler import UploadHandler

logger = logging.getLogger(__name__)

MAX_REQUEST_BODY_SIZE = FILES_CONFIG.upload_iso_max_size + 1024

upload_handler = UploadHandler(
    max_size_bytes=MAX_REQUEST_BODY_SIZE,
    save_directory_path=FILES_CONFIG.upload_iso_directory,
    extension="iso"
)

@router.post("/upload/start", response_model=UUID)
async def __start_iso_file_upload__(current_user: DependsOnAdministrativeAuthentication):
    try: 
        uuid = uuid4()
        upload_handler.start_upload(uuid)
        return uuid
    except UploadAlreadyExists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Somehow you've hit the 1 : billion probability of a UUID collision. Please try again lul."
        )

@router.post("/upload/chunk", response_model=None)
async def __upload_iso_file_chunk__(current_user: DependsOnAdministrativeAuthentication, request: Request):
    verify_permissions(current_user, mask=PERMISSIONS.MANAGE_ISO_FILES)
    
    uuid = None
    
    try: 
        offset_header = request.headers.get("bits-offset")
        uuid_header = request.headers.get("upload-uuid")
        
        if not offset_header:
            raise UploadHeadersError("'bits-offset' header is required to identify the uploaded chunk start location.")
        
        if not uuid_header:
            raise UploadHeadersError("'upload-uuid' header is required to identify the upload.")
        
        offset = int(offset_header)
        uuid = UUID(uuid_header)
        
        await upload_handler.append_chunk(request, uuid, offset)
        
    except HTTPException as e:
        raise e
    except ClientDisconnect:
        logger.error(f"{dt.datetime.now()} : Client disconnected during ISO file upload.")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail=f"Client disconnected. Connection closed."
        )
    except UploadNotExistent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload with uuid={uuid} does not exist or has expired due to inactivity."
        )
    except UploadHeadersError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail=f"Invalid headers: {e}"
        )
    except UploadTooLargeException as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, 
            detail=f'Maximum request body size limit ({MAX_REQUEST_BODY_SIZE} bytes) exceeded ({e.body_len} bytes read)'
        )
    except SFDValidationError:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, 
            detail=f'Maximum request body size limit ({MAX_REQUEST_BODY_SIZE} bytes) exceeded.'
        )
    except Exception:
        logger.exception("There was an error during file upload through the /iso/upload/chunk endpoint.\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail='There was an error uploading the file'
        ) 
    

@router.post("/upload/complete", response_model=None)
async def __complete_iso_file_upload__(data: CreateIsoRecordForm, current_user: DependsOnAdministrativeAuthentication):
    verify_permissions(current_user, mask=PERMISSIONS.MANAGE_ISO_FILES)
    
    name_duplicate = IsoManager.get_record_by_field("name", data.name)

    if name_duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'ISO file record with name={data.name} already exists.'
        )
    
    try: 
        upload_handler.finish_upload(data.uuid)
        location = upload_handler.get_final_location(data.uuid)
        
        creation_args = CreateIsoRecordArgs(
            **data.model_dump(), 
            file_name="",
            file_size_bytes=os.path.getsize(location),
            imported_by=current_user.uuid,
            imported_at=dt.datetime.now(),
        )
        
        IsoManager.create_record(creation_args)
    except UploadNotExistent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload with uuid={data.uuid} does not exist or has expired due to inactivity."
        )
        
        
    
    