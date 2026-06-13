"""
Supabase client for ETL operations.
Uses the service role key for full access (ETL only — not for frontend).
"""

from functools import lru_cache
from supabase import create_client, Client

from etl.config.sources import SUPABASE_URL, SUPABASE_SERVICE_KEY


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Get or create the Supabase client singleton.

    Raises:
        ValueError: If SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not set.
    """
    if not SUPABASE_URL:
        raise ValueError("SUPABASE_URL environment variable is not set.")
    if not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is not set.")

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
