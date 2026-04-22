# Razorpay MVP Integration Notes

## Frontend Flow

1. Customer adds items to cart.
2. Customer opens `/checkout`.
3. Frontend collects guest customer and shipping data.
4. Frontend sends a `POST` request to `/api/payments/razorpay/checkout`.
5. Backend creates the internal order record and, in live mode, creates a Razorpay order.
6. Frontend opens Razorpay Checkout with the returned `orderId`.
7. Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
8. Frontend sends those values to `/api/payments/razorpay/verify`.
9. Backend verifies the signature and only then marks the order `paid`.
10. Backend reduces stock after verified payment.

## Current Endpoints

- `POST /api/payments/razorpay/checkout`
- `POST /api/payments/razorpay/verify`
- `POST /api/payments/razorpay/webhook`
- `POST /api/payments/razorpay/reconcile/:merchantOrderId`
- `GET /api/payments/razorpay/mock-success?merchantOrderId=...`
- `GET /api/orders/:merchantOrderId`
- `POST /api/admin/login`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `GET /api/admin/orders`

## Minimum Server Env

- `RAZORPAY_ENABLED`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_BASE_URL`
- `FRONTEND_URL`
- `SERVER_URL`

## Important Release Rule

Do not mark an order as paid from the frontend checkout success alone.
Always verify the Razorpay signature on the backend first, and enable the webhook for background confirmation.
