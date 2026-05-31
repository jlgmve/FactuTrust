# Invoice API Edge Function

This function provides a CRUD API for invoices, using atomic PostgreSQL RPCs to handle complex multi-table operations.

## Endpoints

### `GET /invoice-api`
List all invoices for the authenticated user.

### `GET /invoice-api?id={uuid}`
Fetch full invoice details including line items and tax summary.

### `POST /invoice-api`
Create a new invoice.
**Body:** Matches `create_invoice_full` RPC arguments.

### `PUT /invoice-api`
Update an existing invoice.
**Body:** Matches `update_invoice_full` RPC arguments.

### `DELETE /invoice-api?id={uuid}`
Delete an invoice.

## Database Dependencies
Requires the following RPCs to be installed:
- `create_invoice_full`
- `update_invoice_full`
- `get_invoice_full`

These are located in `migrations/005_invoice_rpcs.sql`.
