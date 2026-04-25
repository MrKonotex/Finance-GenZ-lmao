import os
from typing import Optional
from fastapi import APIRouter, Query
from services.hyperliquid import get_vault_positions, get_user_state, _post

router = APIRouter()

HL_WALLET_ADDRESS = os.getenv("HL_WALLET_ADDRESS", "")


@router.get("")
async def list_vaults():
    """
    List vault positions for the configured HL wallet address.
    Returns position data from Hyperliquid vault API.
    """
    if not HL_WALLET_ADDRESS:
        return {
            "vaults": [],
            "note": "Set HL_WALLET_ADDRESS env var to fetch vault data",
        }

    positions = await get_vault_positions(HL_WALLET_ADDRESS)
    return {"vaults": positions, "wallet": HL_WALLET_ADDRESS}


@router.get("/summary")
async def vaults_summary():
    """
    Summary comparing total vault earnings vs active trading P&L.
    Pulls account state from Hyperliquid.
    """
    if not HL_WALLET_ADDRESS:
        return {
            "vault_equity": None,
            "trading_account_value": None,
            "total_unrealized_pnl": None,
            "note": "Set HL_WALLET_ADDRESS env var to fetch account data",
        }

    user_state = await get_user_state(HL_WALLET_ADDRESS)
    if not user_state:
        return {"error": "Could not fetch user state from Hyperliquid"}

    margin_summary = user_state.get("marginSummary", {})
    cross_margin = user_state.get("crossMarginSummary", {})

    account_value = float(margin_summary.get("accountValue", 0) or 0)
    total_unrealized_pnl = float(margin_summary.get("totalUnrealizedPnl", 0) or 0)
    total_ntl_pos = float(margin_summary.get("totalNtlPos", 0) or 0)

    # Vault positions
    vault_positions = await get_vault_positions(HL_WALLET_ADDRESS)

    return {
        "trading_account_value": account_value,
        "total_unrealized_pnl": total_unrealized_pnl,
        "total_notional_position": total_ntl_pos,
        "vault_count": len(vault_positions),
        "vault_positions": vault_positions,
        "wallet": HL_WALLET_ADDRESS,
    }


@router.get("/{vault_address}/performance")
async def vault_performance(vault_address: str):
    """
    Return performance history for a specific vault address.
    Queries Hyperliquid vaultDetails endpoint.
    """
    payload = {"type": "vaultDetails", "vaultAddress": vault_address}
    if HL_WALLET_ADDRESS:
        payload["user"] = HL_WALLET_ADDRESS

    data = await _post(payload)
    if not data:
        return {
            "vault_address": vault_address,
            "performance": [],
            "error": "Could not fetch vault details from Hyperliquid",
        }

    if isinstance(data, dict):
        return {
            "vault_address": vault_address,
            "name": data.get("name"),
            "description": data.get("description"),
            "tvl": data.get("tvl"),
            "apy": data.get("apy"),
            "portfolio": data.get("portfolio", []),
            "followers": data.get("followers"),
            "performance": data.get("pnlHistory", []),
        }

    return {"vault_address": vault_address, "data": data}
