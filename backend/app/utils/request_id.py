import contextvars
import uuid

# Context variable that holds the request ID for the current thread/task
_request_id_ctx_var = contextvars.ContextVar("request_id", default="")

def get_request_id() -> str:
    """Get the current request ID."""
    return _request_id_ctx_var.get()

def set_request_id(request_id: str = None) -> str:
    """Set the current request ID. Generates a new one if not provided."""
    if not request_id:
        request_id = str(uuid.uuid4())
    _request_id_ctx_var.set(request_id)
    return request_id
