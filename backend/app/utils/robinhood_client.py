import os
import pickle
import tempfile
import robin_stocks.robinhood as r
from dataclasses import dataclass
from datetime import datetime
from typing import Any


class MfaRequired(Exception):
    """Raised when Robinhood requires an MFA code."""


@dataclass
class TradeData:
    symbol: str
    asset_type: str
    side: str
    quantity: float
    entry_price: float
    exit_price: float | None
    entry_time: datetime
    exit_time: datetime | None
    fees: float
    pnl: float | None
    broker_order_id: str
    option_details: dict | None = None


@dataclass
class HoldingData:
    symbol: str
    asset_type: str
    quantity: float
    average_cost: float
    current_price: float
    equity: float
    percent_change: float


@dataclass
class AccountData:
    account_number: str
    account_type: str
    buying_power: float
    equity: float
    cash: float


class RobinhoodClient:
    """Wrapper around robin_stocks library for KongTrade."""

    def __init__(self):
        self._authenticated = False

    def login(self, username: str, password: str, mfa_code: str | None = None) -> bool:
        """Authenticate with Robinhood. Raises MfaRequired if a code is needed."""
        try:
            r.login(
                username=username,
                password=password,
                expiresIn=86400,
                mfa_code=mfa_code,
            )
            self._authenticated = True
            return True
        except Exception as e:
            self._authenticated = False
            msg = str(e).lower()
            if any(word in msg for word in ("mfa", "challenge", "verification", "two-factor", "2fa", "code", "device")):
                raise MfaRequired("Robinhood requires a verification code. Check your email or authenticator app.")
            raise ConnectionError(f"Robinhood login failed: {str(e)}")

    def get_session_pickle(self) -> str | None:
        if not self._authenticated:
            return None
        try:
            with tempfile.NamedTemporaryFile(mode="r", suffix=".pickle", delete=False) as f:
                pickle_path = f.name
            r.export_session(pickle_path)
            with open(pickle_path) as f:
                data = f.read()
            os.unlink(pickle_path)
            return data
        except Exception:
            return None

    def logout(self):
        try:
            r.logout()
        except Exception:
            pass
        self._authenticated = False

    def get_account_info(self) -> AccountData | None:
        if not self._authenticated:
            return None
        try:
            profile = r.profiles.load_account_profile()
            account_info = r.profiles.load_phoenix_account(info=None)
            return AccountData(
                account_number=profile.get("account_number", ""),
                account_type="margin" if profile.get("margin_balances") else "cash",
                buying_power=float(str(account_info.get("account_buying_power", "0")).replace("$", "").replace(",", "")),
                equity=float(str(account_info.get("total_equity", "0")).replace("$", "").replace(",", "")),
                cash=float(str(account_info.get("cash", "0")).replace("$", "").replace(",", "")),
            )
        except Exception as e:
            print(f"Error getting account info: {e}")
            return None

    def get_current_positions(self) -> list[HoldingData]:
        if not self._authenticated:
            return []
        holdings = []
        try:
            data = r.account.build_holdings()
            for symbol, info in data.items():
                holdings.append(HoldingData(
                    symbol=symbol,
                    asset_type="stock",
                    quantity=float(info.get("quantity", 0)),
                    average_cost=float(info.get("average_buy_price", 0)),
                    current_price=float(info.get("price", 0)),
                    equity=float(info.get("equity", 0)),
                    percent_change=float(info.get("percent_change", 0)),
                ))
        except Exception as e:
            print(f"Error getting positions: {e}")
        return holdings

    def get_stock_orders(self) -> list[dict[str, Any]]:
        if not self._authenticated:
            return []
        try:
            return r.orders.get_all_stock_orders() or []
        except Exception:
            return []

    def get_option_orders(self) -> list[dict[str, Any]]:
        if not self._authenticated:
            return []
        try:
            return r.orders.get_all_option_orders() or []
        except Exception:
            return []

    def get_crypto_orders(self) -> list[dict[str, Any]]:
        if not self._authenticated:
            return []
        try:
            return r.orders.get_all_crypto_orders() or []
        except Exception:
            return []

    # ---- Order-to-Trade transformation ----

    @staticmethod
    def _parse_robinhood_order(order: dict, asset_type: str) -> TradeData | None:
        try:
            side = order.get("side", "")
            symbol = (order.get("symbol") or order.get("chain_symbol", "")).upper()
            avg_price = float(order.get("average_price") or order.get("price") or 0)
            quantity = float(order.get("quantity") or 0)
            fees = float(order.get("fees") or 0)
            created_at = order.get("created_at", "")
            entry_time = datetime.fromisoformat(created_at.replace("Z", "+00:00")) if created_at else datetime.now()
            state = order.get("state", "")

            if state not in ("filled", "cancelled") or quantity <= 0 or avg_price <= 0:
                return None

            exit_price = None
            exit_time = None
            pnl = None
            if side == "sell":
                exit_price = avg_price
                exit_time = entry_time

            return TradeData(
                symbol=symbol,
                asset_type=asset_type,
                side=side,
                quantity=quantity,
                entry_price=avg_price if side == "buy" else avg_price,
                exit_price=exit_price,
                entry_time=entry_time,
                exit_time=exit_time,
                fees=fees,
                pnl=pnl,
                broker_order_id=order.get("id", ""),
                option_details=order.get("option_details"),
            )
        except Exception as e:
            print(f"Error parsing order: {e}")
            return None

    @staticmethod
    def pair_buy_sell_orders(buy_orders: list[TradeData], sell_orders: list[TradeData]) -> list[TradeData]:
        buys_by_symbol: dict[str, list[TradeData]] = {}
        for buy in buy_orders:
            buys_by_symbol.setdefault(buy.symbol, []).append(buy)

        completed_trades: list[TradeData] = []
        for sell in sell_orders:
            symbol = sell.symbol
            if symbol not in buys_by_symbol or not buys_by_symbol[symbol]:
                completed_trades.append(sell)
                continue

            remaining_sell_qty = sell.quantity
            sell_avg_price = sell.exit_price or 0

            while remaining_sell_qty > 0 and buys_by_symbol[symbol]:
                buy = buys_by_symbol[symbol][0]
                matched_qty = min(buy.quantity, remaining_sell_qty)
                pnl = (sell_avg_price - buy.entry_price) * matched_qty - sell.fees * (matched_qty / sell.quantity) - (buy.fees if buy.fees else 0) * (matched_qty / buy.quantity) if buy.quantity > 0 else 0

                completed_trades.append(TradeData(
                    symbol=symbol,
                    asset_type=sell.asset_type,
                    side="buy",
                    quantity=matched_qty,
                    entry_price=buy.entry_price,
                    exit_price=sell_avg_price,
                    entry_time=buy.entry_time,
                    exit_time=sell.exit_time or sell.entry_time,
                    fees=buy.fees + sell.fees,
                    pnl=pnl,
                    broker_order_id=f"{buy.broker_order_id}|{sell.broker_order_id}",
                ))
                remaining_sell_qty -= matched_qty

                if buy.quantity <= matched_qty:
                    buys_by_symbol[symbol].pop(0)
                else:
                    buy.quantity -= matched_qty

        for symbol_buys in buys_by_symbol.values():
            for buy in symbol_buys:
                completed_trades.append(buy)

        return completed_trades

    def get_all_trades(self) -> list[TradeData]:
        stock_orders = self.get_stock_orders()
        option_orders = self.get_option_orders()
        crypto_orders = self.get_crypto_orders()

        all_buys: list[TradeData] = []
        all_sells: list[TradeData] = []

        for order_type, orders in [("stock", stock_orders), ("option", option_orders), ("crypto", crypto_orders)]:
            for order in orders:
                trade = self._parse_robinhood_order(order, order_type)
                if not trade:
                    continue
                if trade.side == "buy":
                    all_buys.append(trade)
                else:
                    all_sells.append(trade)

        return self.pair_buy_sell_orders(all_buys, all_sells)
