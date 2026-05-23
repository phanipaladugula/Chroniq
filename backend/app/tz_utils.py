"""Timezone utilities for handling legacy aliases and ensuring strict UTC."""

import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)

# Mapping of deprecated/legacy/Windows timezone aliases to standard IANA names.
TZ_ALIASES = {
    "Asia/Calcutta": "Asia/Kolkata",
    "Asia/Saigon": "Asia/Ho_Chi_Minh",
    "Asia/Chungking": "Asia/Shanghai",
    "Asia/Ulaanbaatar": "Asia/Ulaanbaatar",
    "Asia/Macao": "Asia/Macau",
    "Asia/Tel_Aviv": "Asia/Jerusalem",
    "US/Eastern": "America/New_York",
    "US/Central": "America/Chicago",
    "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles",
    "US/Arizona": "America/Phoenix",
    "US/Hawaii": "Pacific/Honolulu",
    "US/Alaska": "America/Anchorage",
    "Canada/Eastern": "America/Toronto",
    "Canada/Central": "America/Winnipeg",
    "Canada/Mountain": "America/Edmonton",
    "Canada/Pacific": "America/Vancouver",
    "Europe/Kiev": "Europe/Kyiv",
    "UTC": "UTC",
    "GMT": "UTC",
    "Etc/UTC": "UTC",
    "Etc/GMT": "UTC",
}

def normalize_timezone(tz_string: str) -> str:
    """Normalize a timezone string to a valid IANA timezone name.
    
    Raises:
        ValueError: If the timezone cannot be resolved.
    """
    if not tz_string:
        raise ValueError("Timezone cannot be empty")
        
    tz_string = tz_string.strip()
    
    # Fast path: check alias map
    if tz_string in TZ_ALIASES:
        normalized = TZ_ALIASES[tz_string]
        logger.debug(f"Normalized timezone alias: {tz_string} -> {normalized}")
        return normalized
        
    # Check if valid
    try:
        ZoneInfo(tz_string)
        return tz_string
    except ZoneInfoNotFoundError:
        # Check case-insensitive match against aliases
        tz_lower = tz_string.lower()
        for k, v in TZ_ALIASES.items():
            if k.lower() == tz_lower:
                logger.debug(f"Normalized case-insensitive timezone alias: {tz_string} -> {v}")
                return v
                
        raise ValueError(f"Invalid or unrecognized timezone: '{tz_string}'")

def get_tz_info(tz_string: str) -> ZoneInfo:
    """Get a ZoneInfo object for a timezone string, handling aliases."""
    normalized = normalize_timezone(tz_string)
    return ZoneInfo(normalized)
