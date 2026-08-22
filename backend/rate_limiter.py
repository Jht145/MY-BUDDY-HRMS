import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class RateLimiter:
    """
    Sliding-window in-memory rate limiter.
    Configured to enforce a maximum of 6 requests per time window (60 seconds) per client IP.
    """
    def __init__(self, max_requests: int = 6, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients = defaultdict(list)

    def is_allowed(self, client_id: str) -> tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit.
        Returns: (allowed: bool, remaining: int, retry_after: int)
        """
        now = time.time()
        # Filter out requests outside the sliding window
        self.clients[client_id] = [
            ts for ts in self.clients[client_id] if now - ts < self.window_seconds
        ]

        current_count = len(self.clients[client_id])

        if current_count >= self.max_requests:
            oldest = self.clients[client_id][0]
            retry_after = int(self.window_seconds - (now - oldest)) + 1
            return False, 0, max(1, retry_after)

        # Record this request
        self.clients[client_id].append(now)
        remaining = self.max_requests - (current_count + 1)
        return True, remaining, 0

    def reset(self):
        """Clears all rate limit records (useful for testing)."""
        self.clients.clear()

# Global rate limiter instance: 6 requests max
limiter = RateLimiter(max_requests=6, window_seconds=60)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI Middleware applying rate limiting (6 requests max per window) to API endpoints.
    Static files (css, js, html) are bypassed to ensure smooth UI asset delivery.
    """
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Bypass static files and health checks from exhausting rate limits
        if path.startswith("/css/") or path.startswith("/js/") or path == "/" or path.endswith(".ico"):
            return await call_next(request)

        # Identify client by IP or forwarded header
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "127.0.0.1")

        allowed, remaining, retry_after = limiter.is_allowed(client_ip)

        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "message": f"Rate limit exceeded. Maximum 6 requests allowed per minute. Please retry in {retry_after} seconds.",
                    "limit": limiter.max_requests,
                    "retry_after": retry_after
                },
                headers={
                    "X-RateLimit-Limit": str(limiter.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(retry_after)
                }
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limiter.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
