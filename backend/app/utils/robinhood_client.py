import os
import pickle
import tempfile
import robin_stocks.robinhood as r
import pyotp
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class TradeData:
    symbol: str
    asset_type: str  # stock, option, crypto
    side: str  # buy, sell
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

    def login(self, username: str, password: str, mfa_secret: str | None = None, pickle_data: str | None = None) -> bool:
        """Authenticate with Robinhood. Uses stored pickle session if available."""
        try:
            if pickle_data:
                with tempfile.NamedTemporaryFile(mode="w", suffix=".pickle", delete=False) as f:
                    f.write(pickle_data)
                    pickle_path = f.name
                try:
                    r.load_pickle(pickle_path)
                    self._authenticated = True
                    return True
                except Exception:
                    os.unlink(pickle_path)
                    # Fall through to fresh login

            mfa_code = None
            if mfa_secret:
                mfa_code = pyotp.TOTP(mfa_secret).now()

            r.login(
                username=username,
                password=password,
                expiresIn=86400,
                by_sms=False,
                mfa_code=mfa_code,
                store_session=False,
            )
            self._authenticated = True
            return True
        except Exception as e:
            self._authenticated = False
            raise ConnectionError(f"Robinhood login failed: {str(e)}")

    def get_session_pickle(self) -> str | None:
        """Export current session to pickle string for storage."""
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
                account_type=profile.get("margin_balances", {}) and "margin" or "cash",
                buying_power=float(account_info.get("account_buying_power", "0").replace("$", "").replace(",", "")),
                equity=float(account_info.get("total_equity", "0").replace("$", "").replace(",", "")),
                cash=float(account_info.get("cash", "0").replace("$", "").replace(",", "")),
            )
        except Exception as e:
            print(f"Error getting account info: {e}")
            return None

    def get_portfolio_equity(self) -> float:
        if not self._authenticated:
            return 0.0
        try:
            profile = r.profiles.load_portfolio_profile(info="equity")
            if isinstance(profile, dict):
                eq = profile.get("equity", profile)
                if isinstance(eq, str):
                    return float(eq.replace("$", "").replace(",", ""))
                return float(eq) if eq else 0.0
            return 0.0
        except Exception:
            return 0.0

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

    def get_stock_historicals(self, symbol: str, interval: str = "day", span: str = "1year") -> list[dict]:
        if not self._authenticated:
            return []
        try:
            return r.stocks.get_stock_historicals(symbol, interval=interval, span=span) or []
        except Exception:
            return []

    def get_latest_price(self, symbol: str) -> float | None:
        if not self._authenticated:
            return None
        try:
            prices = r.stocks.get_latest_price(symbol)
            if prices:
                return float(prices[0])
        except Exception:
            pass
        return None

    # ---- Order-to-Trade transformation ----

    @staticmethod
    def _parse_robinhood_order(order: dict, asset_type: str) -> TradeData | None:
        """Convert a Robinhood order dict into a TradeData object."""
        try:
            # Determine side and fill details
            side = order.get("side", "")
            symbol = (order.get("symbol") or order.get("chain_symbol", "")).upper()

            # Get fill prices and quantities
            avg_price = float(order.get("average_price") or order.get("price") or 0)
            quantity = float(order.get("quantity") or 0)
            fees = float(order.get("fees") or 0)

            # Entry details
            created_at = order.get("created_at", "")
            entry_time = datetime.fromisoformat(created_at.replace("Z", "+00:00")) if created_at else datetime.now()

            # Check state
            state = order.get("state", "")
            is_filled = state in ("filled", "cancelled")

            if not is_filled or quantity <= 0 or avg_price <= 0:
                return None

            # Determine exit for sell orders
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
        """Match buy and sell orders to compute P&L per trade.

        Uses FIFO matching within the same symbol.
        """
        buys_by_symbol: dict[str, list[TradeData]] = {}
        for buy in buy_orders:
            buys_by_symbol.setdefault(buy.symbol, []).append(buy)

        completed_trades: list[TradeData] = []

        for sell in sell_orders:
            symbol = sell.symbol
            if symbol not in buys_by_symbol or not buys_by_symbol[symbol]:
                # Sell with no matching buy — treat as standalone
                completed_trades.append(sell)
                continue

            remaining_sell_qty = sell.quantity
            sell_avg_price = sell.exit_price or 0

            while remaining_sell_qty > 0 and buys_by_symbol[symbol]:
                buy = buys_by_symbol[symbol][0]
                matched_qty = min(buy.quantity, remaining_sell_qty)

                # Calculate P&L for this matched portion
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

        # Remaining unmatched buys are open positions
        for symbol_buys in buys_by_symbol.values():
            for buy in symbol_buys:
                completed_trades.append(buy)

        return completed_trades

    def get_all_trades(self) -> list[TradeData]:
        """Pull all completed orders and pair into trades with P&L."""
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
