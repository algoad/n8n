import type { IDataObject } from 'n8n-workflow';

/**
 * Mock response for Alpaca Markets Place Order operation
 * Used when executing ORDER nodes in "execute-step" mode to prevent real trades
 * @param orderData - The order data that would be sent
 * @returns A realistic mock response as if the order was executed
 */
export function mockAlpacaPlaceOrderResponse(orderData: IDataObject): IDataObject {
	const symbol = (orderData.symbol as string) || 'AAPL';
	const side = (orderData.side as string) || 'buy';
	const qty = orderData.qty as number;
	const notional = orderData.notional as number;
	const type = (orderData.type as string) || 'market';
	const timeInForce = (orderData.time_in_force as string) || 'day';

	// Generate a realistic mock order ID
	const mockOrderId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;

	// Mock filled quantity (for market orders, assume immediate fill)
	const filledQty = qty || Math.floor((notional || 100) / 150); // Rough estimate
	const filledPrice = 150 + Math.random() * 10; // Mock price between 150-160

	return {
		id: mockOrderId,
		client_order_id: orderData.client_order_id || mockOrderId,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		submitted_at: new Date().toISOString(),
		filled_at: type === 'market' ? new Date().toISOString() : null,
		expired_at: null,
		canceled_at: null,
		failed_at: null,
		replaced_at: null,
		replaced_by: null,
		replaces: null,
		asset_id: `mock-asset-${symbol}`,
		symbol,
		asset_class: 'us_equity',
		notional: notional || null,
		qty: qty || null,
		filled_qty: type === 'market' ? filledQty : 0,
		filled_avg_price: type === 'market' ? filledPrice.toFixed(2) : null,
		order_class: 'simple',
		order_type: type,
		type,
		side,
		time_in_force: timeInForce,
		limit_price: orderData.limit_price || null,
		stop_price: orderData.stop_price || null,
		status: type === 'market' ? 'filled' : 'new',
		extended_hours: orderData.extended_hours || false,
		legs: null,
		trail_percent: null,
		trail_price: null,
		hwm: null,
		subtag: null,
		source: 'n8n-mock',
	};
}
