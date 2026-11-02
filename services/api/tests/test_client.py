"""
Tests for Resilient HTTP Client
===============================
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import Response

from services.api.client import (
    CoCAPIClient,
    RateLimitError,
    MaintenanceBreakError,
    CircuitBreakerOpenError,
    NotFoundError,
    CIRCUIT_BREAKER_KEY
)

@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    redis.exists.return_value = False
    return redis

@pytest.fixture
def client(mock_redis):
    return CoCAPIClient("test_token", mock_redis)

@pytest.mark.asyncio
async def test_successful_request(client, mock_redis):
    mock_response = MagicMock(spec=Response)
    mock_response.status_code = 200
    mock_response.is_success = True
    mock_response.json.return_value = {"status": "ok"}
    
    with patch.object(client.client, "request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        result = await client.request("GET", "/test")
        
        assert result == {"status": "ok"}
        mock_request.assert_called_once()
        mock_redis.exists.assert_called_once_with(CIRCUIT_BREAKER_KEY)

@pytest.mark.asyncio
async def test_circuit_breaker_open(client, mock_redis):
    mock_redis.exists.return_value = True
    
    with pytest.raises(CircuitBreakerOpenError):
        await client.request("GET", "/test")

@pytest.mark.asyncio
async def test_maintenance_break_opens_circuit(client, mock_redis):
    mock_response = MagicMock(spec=Response)
    mock_response.status_code = 503
    mock_response.is_success = False
    
    with patch.object(client.client, "request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        with pytest.raises(MaintenanceBreakError):
            await client.request("GET", "/test")
            
        mock_redis.set.assert_called_once()
        assert mock_redis.set.call_args[0][0] == CIRCUIT_BREAKER_KEY
        assert mock_redis.set.call_args[0][1] == "OPEN"

@pytest.mark.asyncio
async def test_rate_limit_retry(client, mock_redis):
    mock_response_429 = MagicMock(spec=Response)
    mock_response_429.status_code = 429
    mock_response_429.is_success = False
    
    # We patch tenacity's sleep/wait out or just patch the decorator, but
    # it's better to patch the internal retry to use no wait, or just let it run.
    # We will let it run with min=2 max=10 for simplicity, though it will take ~15s
    # so maybe we patch wait_exponential to be 0 for this test using mock.
    with patch("asyncio.sleep", new_callable=AsyncMock), \
         patch.object(client.client, "request", new_callable=AsyncMock) as mock_request:
        
        mock_request.return_value = mock_response_429
        
        with pytest.raises(RateLimitError):
            await client.request("GET", "/test")
            
        # It should retry 5 times based on stop_after_attempt(5)
        assert mock_request.call_count == 5


@pytest.mark.asyncio
async def test_not_found_raises_not_found_error(client):
    mock_response_404 = MagicMock(spec=Response)
    mock_response_404.status_code = 404
    mock_response_404.is_success = False

    with patch.object(client.client, "request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response_404
        with pytest.raises(NotFoundError):
            await client.get_player("#UNKNOWN")


@pytest.mark.asyncio
async def test_get_player_clan_and_search_helpers(client):
    mock_response = MagicMock(spec=Response)
    mock_response.status_code = 200
    mock_response.is_success = True
    mock_response.json.return_value = {"items": []}

    with patch.object(client.client, "request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response

        await client.get_player("abc123")
        assert mock_request.call_args_list[-1].args == ("GET", "/players/%23ABC123")

        await client.get_clan("#2pp")
        assert mock_request.call_args_list[-1].args == ("GET", "/clans/%232PP")

        await client.search_clans(name="Tribe", limit=10)
        assert mock_request.call_args_list[-1].args == ("GET", "/clans")
        assert mock_request.call_args_list[-1].kwargs["params"] == {"name": "Tribe", "limit": 10}

        await client.get_player_battlelog("#P89PCUPUQ")
        assert mock_request.call_args_list[-1].args == ("GET", "/players/%23P89PCUPUQ/battlelog")

        await client.get_player_leaguehistory("P89PCUPUQ")
        assert mock_request.call_args_list[-1].args == ("GET", "/players/%23P89PCUPUQ/leaguehistory")

        await client.get_clan_league_group("#P89PCUPUQ")
        assert mock_request.call_args_list[-1].args == ("GET", "/clans/%23P89PCUPUQ/currentwar/leaguegroup")

        await client.get_cwl_war("WAR999")
        assert mock_request.call_args_list[-1].args == ("GET", "/clanwarleagues/wars/%23WAR999")

        await client.get_global_player_rankings(location_id="global", limit=200, after="CURSOR1")
        assert mock_request.call_args_list[-1].args == ("GET", "/locations/global/rankings/players")
        assert mock_request.call_args_list[-1].kwargs["params"] == {"limit": 200, "after": "CURSOR1"}

